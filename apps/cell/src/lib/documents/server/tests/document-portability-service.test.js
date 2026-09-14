import { describe, expect, test } from 'bun:test';
import { createDocumentPortabilityService } from '../services/document-portability-service.js';

function createStore() {
  let nextId = 1;
  const store = { templates: [], templateVersions: [], documents: [], reviewComments: [], reviewVotes: [], forms: [], formVersions: [], issues: [], issueComments: [], issueVotes: [] };
  const id = (prefix) => `${prefix}-${nextId++}`;
  return {
    store,
    documents: {
      async findTemplateById(value) { return store.templates.find((item) => item.id === value) ?? null; },
      async listTemplateVersions(templateId) { return store.templateVersions.filter((item) => item.templateId === templateId); },
      async listDocuments() { return store.documents; },
      async listReviewComments(versionId) { return store.reviewComments.filter((item) => item.templateVersionId === versionId); },
      async listReviewCommentVotes(commentId) { return store.reviewVotes.filter((item) => item.commentId === commentId); },
      async createTemplate(input) { const value = { id: id('template'), ...input }; store.templates.push(value); return value; },
      async createTemplateVersion(input) { const value = { id: id('template-version'), ...input }; store.templateVersions.push(value); return value; },
      async createDocument(input) { const value = { id: id('document'), ...input }; store.documents.push(value); return value; },
      async createReviewComment(input) { const value = { id: id('review-comment'), ...input }; store.reviewComments.push(value); return value; },
      async createReviewCommentVote(input) { const value = { id: id('review-vote'), ...input }; store.reviewVotes.push(value); return value; }
    },
    forms: {
      async findFormById(value) { return store.forms.find((item) => item.id === value) ?? null; },
      async listVersions(formId) { return store.formVersions.filter((item) => item.formId === formId); },
      async createForm(input) { const value = { id: id('form'), ...input }; store.forms.push(value); return value; },
      async createVersion(input) { const value = { id: id('form-version'), ...input }; store.formVersions.push(value); return value; }
    },
    issues: {
      async findById(value) { return store.issues.find((item) => item.id === value) ?? null; },
      async listComments(issueId) { return store.issueComments.filter((item) => item.issueId === issueId); },
      async listCommentVotes(commentId) { return store.issueVotes.filter((item) => item.commentId === commentId); },
      async create(input) { const value = { id: id('issue'), tags: [], ...input }; store.issues.push(value); return value; },
      async createComment(issueId, input, actor) { const value = { id: id('issue-comment'), issueId, ...input, authorId: actor.id, authorName: actor.name }; store.issueComments.push(value); return value; },
      async createCommentVote(input) { const value = { id: id('issue-vote'), ...input }; store.issueVotes.push(value); return value; }
    }
  };
}

function seed(store) {
  store.forms.push({ id: 'form-1', name: 'Fields', description: '', category: 'document', status: 'published' });
  store.formVersions.push({ id: 'form-version-1', formId: 'form-1', versionNumber: 1, schema: { fields: [] }, isPublished: true, status: 'published', createdAt: '2026-01-01' });
  store.templates.push({ id: 'template-1', name: 'Agreement', description: 'A package', formId: 'form-1', status: 'published' });
  store.templateVersions.push({ id: 'template-version-1', templateId: 'template-1', versionNumber: 1, content: { type: 'doc', content: [] }, sampleData: {}, formVersionId: 'form-version-1', isPublished: true, status: 'published', createdAt: '2026-01-01' });
  store.documents.push({ id: 'document-1', templateVersionId: 'template-version-1', formVersionId: 'form-version-1', operationsAccountId: 'missing-account', status: 'generated', dataSnapshot: { name: 'Acme' }, renderedHtml: '<p>Acme</p>' });
  store.reviewComments.push({ id: 'review-comment-1', templateVersionId: 'template-version-1', body: 'Fix this', excerpt: 'this', anchor: { start: 0, end: 4, text: 'this' }, issueId: 'issue-1', authorId: 'missing-user', authorName: 'Reviewer' });
  store.reviewVotes.push({ id: 'review-vote-1', commentId: 'review-comment-1', voterId: 'user-1', voterName: 'Voter' });
  store.issues.push({ id: 'issue-1', title: 'Fix this', descriptionMarkdown: 'Fix this', type: 'internal', priority: 'medium', status: 'open', operationsAccountId: 'missing-account', tags: [{ name: 'document-review' }] });
  store.issueComments.push({ id: 'issue-comment-1', issueId: 'issue-1', parentId: null, bodyMarkdown: 'On it', authorId: 'user-1', authorName: 'Voter' });
  store.issueVotes.push({ id: 'issue-vote-1', commentId: 'issue-comment-1', voterId: 'user-1', voterName: 'Voter' });
}

describe('document portability service', () => {
  test('exports a complete package and imports it as a fresh copy', async () => {
    const source = createStore();
    seed(source.store);
    const sourceService = createDocumentPortabilityService({ documents: source.documents, forms: source.forms, issues: source.issues });
    const bundle = await sourceService.exportTemplate('template-1', { includeIssues: true, includeVotes: true });

    expect(bundle.templateVersions).toHaveLength(1);
    expect(bundle.formVersions).toHaveLength(1);
    expect(bundle.documents).toHaveLength(1);
    expect(bundle.issues).toHaveLength(1);
    expect(bundle.issueVotes).toHaveLength(1);

    const target = createStore();
    const targetService = createDocumentPortabilityService({
      documents: target.documents,
      forms: target.forms,
      issues: target.issues,
      findAccount: async () => null,
      findUser: async (id) => id === 'user-1' ? { id, name: 'Voter', email: 'voter@example.test' } : null
    });
    const result = await targetService.importTemplate(bundle);

    expect(result.template.id).not.toBe('template-1');
    expect(target.store.templateVersions[0].templateId).toBe(result.template.id);
    expect(target.store.documents[0].templateVersionId).toBe(target.store.templateVersions[0].id);
    expect(target.store.reviewComments[0].issueId).toBe(target.store.issues[0].id);
    expect(target.store.reviewVotes[0].commentId).toBe(target.store.reviewComments[0].id);
    expect(target.store.issueVotes[0].commentId).toBe(target.store.issueComments[0].id);
  });

  test('skips collaboration records whose users are unavailable', async () => {
    const source = createStore();
    seed(source.store);
    const bundle = await createDocumentPortabilityService({ documents: source.documents, forms: source.forms, issues: source.issues }).exportTemplate('template-1', { includeIssues: true, includeVotes: true });
    const target = createStore();
    const result = await createDocumentPortabilityService({ documents: target.documents, forms: target.forms, issues: target.issues, findUser: async () => null }).importTemplate(bundle);
    expect(result.report.skippedIssueComments).toBe(1);
    expect(result.report.skippedVotes).toBe(2);
  });
});