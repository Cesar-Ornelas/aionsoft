import { describe, expect, test } from 'bun:test';
import { createDocumentReviewService } from '../services/document-review-service.js';

function createRepository() {
  const comments = [];
  const version = { id: 'version-1', templateId: 'template-1' };
  return {
    comments,
    async findTemplateVersionById(id) { return id === version.id ? version : null; },
    async listReviewComments(templateVersionId) { return comments.filter((comment) => comment.templateVersionId === templateVersionId); },
    async findReviewCommentById(id) { return comments.find((comment) => comment.id === id) ?? null; },
    async createReviewComment(input) { const comment = { id: `comment-${comments.length + 1}`, ...input }; comments.push(comment); return comment; },
    async updateReviewComment(id, input) { const comment = comments.find((entry) => entry.id === id); Object.assign(comment, input); return comment; },
    async deleteReviewComment(id) { const index = comments.findIndex((comment) => comment.id === id); comments.splice(index, 1); }
  };
}

describe('document review service', () => {
  test('creates version-scoped anonymous comments and links issues', async () => {
    const repository = createRepository();
    const service = createDocumentReviewService(repository);
    const comment = await service.create('version-1', { body: 'Clarify this clause.', anchor: { start: 4, end: 9, text: 'clause' } });
    expect(comment.templateVersionId).toBe('version-1');
    expect(comment.issueId).toBeNull();
    expect((await service.list('version-1'))).toHaveLength(1);
    expect((await service.linkIssue(comment.id, 'issue-1')).issueId).toBe('issue-1');
  });

  test('rejects empty comments and invalid anchors', async () => {
    const service = createDocumentReviewService(createRepository());
    await expect(service.create('version-1', { body: '', anchor: { start: 0, end: 1, text: 'x' } })).rejects.toThrow('Comment text is required.');
    await expect(service.create('version-1', { body: 'Comment', anchor: { start: 2, end: 2, text: 'x' } })).rejects.toThrow('valid text selection');
  });

  test('deletes an existing comment', async () => {
    const repository = createRepository();
    const service = createDocumentReviewService(repository);
    const comment = await service.create('version-1', { body: 'Remove this note.', anchor: { start: 0, end: 4, text: 'Remove' } });
    await service.delete(comment.id);
    expect(await service.list('version-1')).toHaveLength(0);
  });
});