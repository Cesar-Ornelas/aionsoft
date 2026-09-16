import { DocumentDataAccessError } from '../../model/data-access-error.js';
import { DOCUMENT_PACKAGE_KIND, DOCUMENT_PACKAGE_VERSION, packageKey, validateDocumentPackage } from '../../model/portability.js';

const clean = (value) => String(value ?? '').trim();
const clone = (value) => structuredClone(value);

function sourceKey(prefix, id) {
  return packageKey(prefix, id);
}

export function createDocumentPortabilityService({ documents, forms, issues, findAccount, findUser }) {
  async function exportTemplate(templateId, options = {}) {
    const template = await documents.findTemplateById(templateId);
    if (!template) throw new DocumentDataAccessError('NOT_FOUND', 'Document template was not found.');
    const templateVersions = await documents.listTemplateVersions(template.id);
    const form = template.formId ? await forms.findFormById(template.formId) : null;
    const formVersions = form ? await forms.listVersions(form.id) : [];
    const generatedDocuments = (await documents.listDocuments()).filter((document) => templateVersions.some((version) => version.id === document.templateVersionId));
    const reviewComments = (await Promise.all(templateVersions.map((version) => documents.listReviewComments(version.id)))).flat();
    const includeIssues = Boolean(options.includeIssues);
    const includeVotes = Boolean(options.includeVotes);
    const reviewVotes = includeVotes ? (await Promise.all(reviewComments.map((comment) => documents.listReviewCommentVotes(comment.id)))).flat() : [];
    const issueIds = includeIssues ? [...new Set(reviewComments.map((comment) => comment.issueId).filter(Boolean))] : [];
    const issueRecords = [];
    const issueComments = [];
    const issueVotes = [];
    for (const issueId of issueIds) {
      const issue = await issues.findById(issueId);
      if (!issue) continue;
      issueRecords.push(issue);
      const comments = await issues.listComments(issue.id);
      issueComments.push(...comments);
      if (includeVotes) {
        for (const comment of comments) issueVotes.push(...await issues.listCommentVotes(comment.id));
      }
    }
    return {
      kind: DOCUMENT_PACKAGE_KIND,
      schemaVersion: DOCUMENT_PACKAGE_VERSION,
      exportedAt: new Date().toISOString(),
      source: { templateId: template.id, templateName: template.name },
      options: { includeIssues, includeVotes },
      form: form ? { ...form, key: sourceKey('form', form.id) } : null,
      formVersions: formVersions.map((version) => ({ ...version, key: sourceKey('form-version', version.id), formKey: sourceKey('form', version.formId) })),
      template: { ...template, key: sourceKey('template', template.id), formKey: template.formId ? sourceKey('form', template.formId) : null },
      templateVersions: templateVersions.map((version) => ({ ...version, key: sourceKey('template-version', version.id), templateKey: sourceKey('template', version.templateId), formVersionKey: version.formVersionId ? sourceKey('form-version', version.formVersionId) : null })),
      documents: generatedDocuments.map((document) => ({ ...document, key: sourceKey('document', document.id), templateVersionKey: sourceKey('template-version', document.templateVersionId), formVersionKey: document.formVersionId ? sourceKey('form-version', document.formVersionId) : null })),
      reviewComments: reviewComments.map((comment) => ({ ...comment, key: sourceKey('review-comment', comment.id), templateVersionKey: sourceKey('template-version', comment.templateVersionId), issueKey: includeIssues && comment.issueId ? sourceKey('issue', comment.issueId) : null, votes: undefined })),
      reviewVotes: reviewVotes.map((vote) => ({ ...vote, key: sourceKey('review-vote', vote.id), commentKey: sourceKey('review-comment', vote.commentId) })),
      issues: issueRecords.map((issue) => ({ ...issue, key: sourceKey('issue', issue.id) })),
      issueComments: issueComments.map((comment) => ({ ...comment, key: sourceKey('issue-comment', comment.id), issueKey: sourceKey('issue', comment.issueId), parentKey: comment.parentId ? sourceKey('issue-comment', comment.parentId) : null })),
      issueVotes: issueVotes.map((vote) => ({ ...vote, key: sourceKey('issue-vote', vote.id), commentKey: sourceKey('issue-comment', vote.commentId) }))
    };
  }

  async function importTemplate(input) {
    const bundle = validateDocumentPackage(input);
    const maps = new Map();
    const imported = { skippedIssueComments: 0, skippedVotes: 0 };
    const map = (key, value) => maps.set(key, value);
    const resolve = (key) => key ? maps.get(key) ?? null : null;
    const sourceForm = bundle.form;
    let form = null;
    if (sourceForm) {
      form = await forms.createForm({ name: `${sourceForm.name} (Imported)`, description: sourceForm.description, category: sourceForm.category, status: sourceForm.status });
      map(sourceForm.key, form.id);
      for (const version of [...(bundle.formVersions ?? [])].sort((left, right) => left.versionNumber - right.versionNumber)) {
        const created = await forms.createVersion({ formId: form.id, versionNumber: version.versionNumber, schema: clone(version.schema), isPublished: Boolean(version.isPublished), status: version.status, createdAt: version.createdAt });
        map(version.key, created.id);
      }
    }
    const sourceTemplate = bundle.template;
    const template = await documents.createTemplate({ name: `${sourceTemplate.name} (Imported)`, description: sourceTemplate.description, formId: form?.id || null, status: sourceTemplate.status, createdAt: sourceTemplate.createdAt, updatedAt: sourceTemplate.updatedAt });
    map(sourceTemplate.key, template.id);
    for (const version of [...bundle.templateVersions].sort((left, right) => left.versionNumber - right.versionNumber)) {
      const created = await documents.createTemplateVersion({ templateId: template.id, versionNumber: version.versionNumber, content: clone(version.content), sampleData: clone(version.sampleData ?? {}), pageConfig: clone(version.pageConfig ?? {}), formVersionId: resolve(version.formVersionKey), isPublished: Boolean(version.isPublished), status: version.status, createdAt: version.createdAt });
      map(version.key, created.id);
    }
    for (const document of bundle.documents ?? []) {
      const account = document.operationsAccountId && findAccount ? await findAccount(document.operationsAccountId).catch(() => null) : null;
      const created = await documents.createDocument({ operationsAccountId: account?.id || null, templateVersionId: resolve(document.templateVersionKey), formVersionId: resolve(document.formVersionKey), status: document.status, dataSnapshot: clone(document.dataSnapshot ?? {}), renderedHtml: document.renderedHtml || '', createdAt: document.createdAt });
      map(document.key, created.id);
    }
    if (bundle.options?.includeIssues) {
      for (const issue of bundle.issues ?? []) {
        const account = issue.operationsAccountId && findAccount ? await findAccount(issue.operationsAccountId).catch(() => null) : null;
        const created = await issues.create({ title: issue.title, descriptionMarkdown: issue.descriptionMarkdown, type: issue.type, priority: issue.priority, status: issue.status, companyId: '', operationsAccountId: account?.id || '', dueDate: issue.dueDate, createdBy: '', tags: issue.tags?.map((tag) => tag.name ?? tag) ?? [] });
        map(issue.key, created.id);
      }
    }
    for (const comment of bundle.reviewComments ?? []) {
      const created = await documents.createReviewComment({ templateVersionId: resolve(comment.templateVersionKey), body: comment.body, excerpt: comment.excerpt, anchor: clone(comment.anchor), issueId: resolve(comment.issueKey), authorId: '', authorName: comment.authorName, createdAt: comment.createdAt });
      map(comment.key, created.id);
    }
    if (bundle.options?.includeIssues) {
      for (const comment of [...(bundle.issueComments ?? [])].sort((left, right) => Number(Boolean(left.parentKey)) - Number(Boolean(right.parentKey)))) {
        const user = comment.authorId && findUser ? await findUser(comment.authorId).catch(() => null) : null;
        if (!user) { imported.skippedIssueComments += 1; continue; }
        const created = await issues.createComment(resolve(comment.issueKey), { parentId: resolve(comment.parentKey), bodyMarkdown: comment.bodyMarkdown }, { id: user.id, name: user.name, email: user.email });
        map(comment.key, created.id);
      }
    }
    if (bundle.options?.includeVotes) {
      for (const vote of bundle.reviewVotes ?? []) {
        const user = vote.voterId && findUser ? await findUser(vote.voterId).catch(() => null) : null;
        if (!user) { imported.skippedVotes += 1; continue; }
        await documents.createReviewCommentVote({ commentId: resolve(vote.commentKey), voterId: user.id, voterName: vote.voterName, createdAt: vote.createdAt });
      }
      if (bundle.options?.includeIssues) {
        for (const vote of bundle.issueVotes ?? []) {
          const user = vote.voterId && findUser ? await findUser(vote.voterId).catch(() => null) : null;
          if (!user || !resolve(vote.commentKey)) { imported.skippedVotes += 1; continue; }
          await issues.createCommentVote({ commentId: resolve(vote.commentKey), voterId: user.id, voterName: vote.voterName, createdAt: vote.createdAt });
        }
      }
    }
    return { template, report: imported };
  }

  return { exportTemplate, importTemplate };
}