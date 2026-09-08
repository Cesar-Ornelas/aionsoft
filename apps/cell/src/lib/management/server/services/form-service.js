import { DataAccessError } from '../../model/data-access-error.js';
import { normalizeFormSchema } from '../../model/form-schema.js';

const now = () => new Date().toISOString();
const required = (value, name) => {
  if (!String(value ?? '').trim()) throw new DataAccessError('INVALID_INPUT', `${name} is required.`);
  return String(value).trim();
};

export function createFormService(repository) {
  const findForm = async (id) => {
    const form = await repository.findFormById(id);
    if (!form) throw new DataAccessError('NOT_FOUND', `Form ${id} was not found.`);
    return form;
  };

  const findVersion = async (id) => {
    const version = await repository.findVersionById(id);
    if (!version) throw new DataAccessError('NOT_FOUND', `Form version ${id} was not found.`);
    return version;
  };

  const latestVersion = async (formId) => {
    const versions = await repository.listVersions(formId);
    return [...versions].sort((left, right) => right.versionNumber - left.versionNumber)[0] ?? null;
  };

  return {
    listForms: () => repository.listForms(),
    getForm: findForm,
    getVersion: findVersion,
    getVersions: async (formId) => {
      await findForm(formId);
      return repository.listVersions(formId);
    },
    getPublishedVersion: async (formId) => {
      const form = await findForm(formId);
      const versions = await repository.listVersions(form.id);
      return versions.find((version) => version.isPublished) ?? null;
    },
    createForm: async (input) => repository.createForm({
      name: required(input.name, 'Form name'),
      description: String(input.description ?? '').trim(),
      category: String(input.category ?? '').trim(),
      status: 'draft',
      createdAt: now(),
      updatedAt: now()
    }),
    updateForm: async (id, input) => {
      const form = await findForm(id);
      if (form.status === 'deleted') throw new DataAccessError('CONFLICT', 'Deleted forms cannot be updated.');
      return repository.updateForm(id, { ...input, name: required(input.name ?? form.name, 'Form name'), updatedAt: now() });
    },
    saveDraft: async (formId, schemaInput) => {
      const form = await findForm(formId);
      if (form.status === 'published') throw new DataAccessError('CONFLICT', 'Published forms require a new revision.');
      const schema = normalizeFormSchema(schemaInput);
      const previous = await latestVersion(form.id);
      if (previous?.isPublished) throw new DataAccessError('CONFLICT', 'Published versions are immutable.');
      const version = await repository.createVersion({ formId: form.id, versionNumber: (previous?.versionNumber ?? 0) + 1, schema, isPublished: false, createdAt: now() });
      await repository.updateForm(form.id, { status: 'draft', updatedAt: now() });
      return version;
    },
    submitForReview: async (formId) => {
      const form = await findForm(formId);
      const version = await latestVersion(form.id);
      if (!version || version.isPublished) throw new DataAccessError('CONFLICT', 'A draft version is required for review.');
      await repository.updateForm(form.id, { status: 'pending_review', updatedAt: now() });
      return repository.updateVersion(version.id, { status: 'pending_review' });
    },
    publish: async (formId, versionId) => {
      const form = await findForm(formId);
      const version = await findVersion(versionId);
      if (version.formId !== form.id) throw new DataAccessError('INVALID_INPUT', 'Version does not belong to this form.');
      if (version.isPublished) return version;
      const versions = await repository.listVersions(form.id);
      for (const existing of versions) if (existing.isPublished) await repository.updateVersion(existing.id, { isPublished: false });
      const published = await repository.updateVersion(version.id, { isPublished: true, status: 'published' });
      await repository.updateForm(form.id, { status: 'published', updatedAt: now() });
      return published;
    },
    cloneRevision: async (formId, versionId) => {
      const form = await findForm(formId);
      const source = await findVersion(versionId);
      if (source.formId !== form.id) throw new DataAccessError('INVALID_INPUT', 'Version does not belong to this form.');
      const latest = await latestVersion(form.id);
      return repository.createVersion({ formId: form.id, versionNumber: (latest?.versionNumber ?? 0) + 1, schema: structuredClone(source.schema), isPublished: false, createdAt: now() });
    },
    archive: async (formId) => {
      await findForm(formId);
      return repository.updateForm(formId, { status: 'deleted', updatedAt: now() });
    }
  };
}
