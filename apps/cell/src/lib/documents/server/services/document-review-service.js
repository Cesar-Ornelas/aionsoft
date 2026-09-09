import { DocumentDataAccessError } from '../../model/data-access-error.js';

const clean = (value) => String(value ?? '').trim();

function normalizeAnchor(value) {
  const start = Number(value?.start);
  const end = Number(value?.end);
  const text = clean(value?.text);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || !text) {
    throw new DocumentDataAccessError('INVALID_INPUT', 'A review comment needs a valid text selection.');
  }
  return { start, end, text };
}

export function createDocumentReviewService(repository) {
  async function ensureVersion(templateVersionId) {
    const version = await repository.findTemplateVersionById(clean(templateVersionId));
    if (!version) throw new DocumentDataAccessError('NOT_FOUND', 'Document template version was not found.');
    return version;
  }

  return {
    async list(templateVersionId) {
      await ensureVersion(templateVersionId);
      return repository.listReviewComments(templateVersionId);
    },
    async get(commentId) {
      const id = clean(commentId);
      const comment = await repository.findReviewCommentById(id);
      if (!comment) throw new DocumentDataAccessError('NOT_FOUND', 'Document review comment was not found.');
      return comment;
    },
    async create(templateVersionId, input = {}) {
      const version = await ensureVersion(templateVersionId);
      const body = clean(input.body);
      if (!body) throw new DocumentDataAccessError('INVALID_INPUT', 'Comment text is required.');
      if (body.length > 4000) throw new DocumentDataAccessError('INVALID_INPUT', 'Comment text must be 4000 characters or fewer.');
      const anchor = normalizeAnchor(input.anchor);
      return repository.createReviewComment({ templateVersionId: version.id, body, excerpt: anchor.text, anchor, issueId: null, createdAt: new Date().toISOString() });
    },
    async linkIssue(commentId, issueId) {
      const id = clean(commentId);
      if (!id || !clean(issueId)) throw new DocumentDataAccessError('INVALID_INPUT', 'Comment and issue identifiers are required.');
      return repository.updateReviewComment(id, { issueId: clean(issueId) });
    },
    async delete(commentId) {
      const comment = await this.get(commentId);
      await repository.deleteReviewComment(comment.id);
      return comment;
    }
  };
}