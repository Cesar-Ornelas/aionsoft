import { DocumentDataAccessError } from '../../model/data-access-error.js';

const clean = (value) => String(value ?? '').trim();

function voteSummary(votes, actor) {
  const voterId = clean(actor?.id);
  return { count: votes.length, votedByMe: Boolean(voterId && votes.some((vote) => vote.voterId === voterId)), voterNames: votes.map((vote) => vote.voterName).filter(Boolean) };
}

async function withVotes(repository, comment, actor) {
  return { ...comment, votes: voteSummary(await repository.listReviewCommentVotes(comment.id), actor) };
}

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
    async list(templateVersionId, actor) {
      await ensureVersion(templateVersionId);
      return Promise.all((await repository.listReviewComments(templateVersionId)).map((comment) => withVotes(repository, comment, actor)));
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
      const author = { id: clean(input.authorId), name: clean(input.authorName) };
      return withVotes(repository, await repository.createReviewComment({ templateVersionId: version.id, body, excerpt: anchor.text, anchor, issueId: clean(input.issueId) || null, authorId: author.id || null, authorName: author.name || null, createdAt: new Date().toISOString() }), author);
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
    },
    async toggleCommentVote(commentId, actor) {
      const voterId = clean(actor?.id);
      if (!voterId) throw new DocumentDataAccessError('UNAUTHORIZED', 'An authenticated user is required to vote on review comments.');
      const comment = await this.get(commentId);
      if (comment.authorId === voterId) throw new DocumentDataAccessError('FORBIDDEN', 'You cannot vote on your own comment.');
      const existing = await repository.findReviewCommentVote(comment.id, voterId);
      if (existing) await repository.deleteReviewCommentVote(existing.id);
      else await repository.createReviewCommentVote({ commentId: comment.id, voterId, voterName: clean(actor.name) || clean(actor.email) || voterId, createdAt: new Date().toISOString() });
      return voteSummary(await repository.listReviewCommentVotes(comment.id), actor);
    }
  };
}