import { DocumentDataAccessError } from '../../model/data-access-error.js';
import { normalizeDocumentContent, validateFieldReferences } from '../../model/content.js';

const now = () => new Date().toISOString();
const required = (value, label) => {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw new DocumentDataAccessError('INVALID_INPUT', `${label} is required.`);
  return normalized;
};
const sampleData = (value) => value && typeof value === 'object' && !Array.isArray(value) ? structuredClone(value) : {};

export function createDocumentTemplateService(repository, dependencies = {}) {
  const getFormVersion = dependencies.getFormVersion ?? (async () => null);
  const createOwnedForm = dependencies.createOwnedForm ?? (async () => null);
  const saveOwnedFormDraft = dependencies.saveOwnedFormDraft ?? (async () => null);
  const getOwnedFormVersions = dependencies.getOwnedFormVersions ?? (async () => []);
  const publishOwnedForm = dependencies.publishOwnedForm ?? (async () => null);
  const cloneOwnedFormRevision = dependencies.cloneOwnedFormRevision ?? (async () => null);
  const deleteIssue = dependencies.deleteIssue ?? (async () => null);
  const archiveOwnedForm = dependencies.archiveOwnedForm ?? (async () => null);
  const findTemplate = async (id) => {
    const template = await repository.findTemplateById(id);
    if (!template) throw new DocumentDataAccessError('NOT_FOUND', `Document template ${id} was not found.`);
    return template;
  };
  const getVersions = async (templateId) => repository.listTemplateVersions(templateId);
  const latestVersion = async (templateId) => (await getVersions(templateId)).sort((left, right) => right.versionNumber - left.versionNumber)[0] ?? null;
  const validateContent = async (content, formVersionId, { allowDraft = false } = {}) => {
    const normalized = normalizeDocumentContent(content);
    if (formVersionId) {
      const formVersion = await getFormVersion(formVersionId);
      if (!formVersion || (!allowDraft && !formVersion.isPublished)) throw new DocumentDataAccessError('CONFLICT', 'Document templates can only use published form versions.');
      validateFieldReferences(normalized, formVersion.schema);
    }
    return normalized;
  };
  const publishVersion = async (templateId, version) => {
    const template = await findTemplate(templateId);
    if (template.formId) {
      const formVersions = await getOwnedFormVersions(template.formId);
      const formVersion = formVersions.find((candidate) => candidate.id === version.formVersionId);
      if (!formVersion || formVersion.isPublished) throw new DocumentDataAccessError('CONFLICT', 'A matching draft form version is required for publication.');
      await validateContent(version.content, version.formVersionId, { allowDraft: true });
      await publishOwnedForm(template.formId, formVersion.id);
    } else {
      await validateContent(version.content, version.formVersionId);
    }
    await repository.updateTemplateVersion(version.id, { isPublished: true, status: 'published' });
    await repository.updateTemplate(template.id, { status: 'published', updatedAt: now() });
    return repository.findTemplateVersionById(version.id);
  };

  return {
    list: () => repository.listTemplates(),
    get: findTemplate,
    versions: getVersions,
    delete: async (templateId) => {
      const template = await findTemplate(templateId);
      const versions = (await getVersions(template.id)).sort((left, right) => right.versionNumber - left.versionNumber);
      const comments = (await Promise.all(versions.map((version) => repository.listReviewComments(version.id)))).flat();
      for (const issueId of [...new Set(comments.map((comment) => comment.issueId).filter(Boolean))]) {
        try {
          await deleteIssue(issueId);
        } catch (error) {
          if (error?.code !== 'NOT_FOUND') throw error;
        }
      }
      await repository.deleteTemplate(template.id);
      if (template.formId) await archiveOwnedForm(template.formId);
      return template;
    },
    create: async (input) => {
      const name = required(input.name, 'Template name');
      const ownedForm = await createOwnedForm({ name, description: String(input.description ?? '').trim() });
      return repository.createTemplate({ name, description: String(input.description ?? '').trim(), formId: ownedForm?.id || null, status: 'draft', createdAt: now(), updatedAt: now() });
    },
    saveDraft: async (templateId, input) => {
      const template = await findTemplate(templateId);
      if (template.status === 'archived') throw new DocumentDataAccessError('CONFLICT', 'Archived templates cannot be edited.');
      const previous = await latestVersion(template.id);
      if (previous?.isPublished) throw new DocumentDataAccessError('CONFLICT', 'Published template versions are immutable.');
      let formVersionId = input.formVersionId || null;
      let isOwnedDraft = false;
      if (template.formId && input.formSchema !== undefined) {
        const ownedVersion = await saveOwnedFormDraft(template.formId, input.formSchema);
        formVersionId = ownedVersion.id;
        isOwnedDraft = true;
      }
      const content = await validateContent(contentInput(input), formVersionId, { allowDraft: isOwnedDraft });
      return repository.createTemplateVersion({ templateId: template.id, versionNumber: (previous?.versionNumber ?? 0) + 1, content, sampleData: sampleData(input.sampleData), formVersionId, isPublished: false, status: 'draft', createdAt: now() });
    },
    publish: async (templateId) => {
      const template = await findTemplate(templateId);
      const version = await latestVersion(template.id);
      if (!version || version.isPublished) throw new DocumentDataAccessError('CONFLICT', 'A draft template version is required for publication.');
      return publishVersion(template.id, version);
    },
    cloneRevision: async (templateId, versionId) => {
      const template = await findTemplate(templateId);
      const source = await repository.findTemplateVersionById(versionId);
      if (!source || source.templateId !== template.id) throw new DocumentDataAccessError('NOT_FOUND', 'Template version was not found.');
      const latest = await latestVersion(template.id);
      return repository.createTemplateVersion({ templateId: template.id, versionNumber: (latest?.versionNumber ?? 0) + 1, content: structuredClone(source.content), sampleData: structuredClone(source.sampleData ?? {}), formVersionId: source.formVersionId, isPublished: false, status: 'draft', createdAt: now() });
    },
    rollback: async (templateId, versionId) => {
      const template = await findTemplate(templateId);
      const source = await repository.findTemplateVersionById(versionId);
      if (!source || source.templateId !== template.id || !source.isPublished) throw new DocumentDataAccessError('INVALID_INPUT', 'Only a published version from this document can be restored.');
      const versions = (await getVersions(template.id)).sort((left, right) => right.versionNumber - left.versionNumber);
      const latest = versions[0];
      if (!latest?.isPublished || source.id === latest.id) throw new DocumentDataAccessError('CONFLICT', 'Select an older published version to roll back.');
      let formVersionId = source.formVersionId;
      if (template.formId && source.formVersionId) formVersionId = (await cloneOwnedFormRevision(template.formId, source.formVersionId)).id;
      const draft = await repository.createTemplateVersion({ templateId: template.id, versionNumber: (latest.versionNumber ?? 0) + 1, content: structuredClone(source.content), sampleData: structuredClone(source.sampleData ?? {}), formVersionId, isPublished: false, status: 'draft', createdAt: now() });
      return publishVersion(template.id, draft);
    }
  };
}

function contentInput(input) {
  return input.content ?? { type: 'doc', content: [] };
}
