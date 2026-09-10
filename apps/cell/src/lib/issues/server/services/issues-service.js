import { IssuesDataAccessError } from '../../model/data-access-error.js';

const TYPES = new Set(['customer', 'provider', 'internal']);
const PRIORITIES = new Set(['low', 'medium', 'high', 'urgent']);
const STATUSES = new Set(['open', 'in_progress', 'resolved', 'closed', 'cancelled']);
const MAX_COMMENT_LENGTH = 10000;
const MAX_COMMENT_DEPTH = 3;
const MAX_TAGS = 12;
const MAX_TAG_LENGTH = 40;

function clean(value) {
  return String(value ?? '').trim();
}

function normalizeTags(value) {
  const values = Array.isArray(value) ? value : clean(value).split(',');
  const tags = [...new Set(values.map((tag) => clean(typeof tag === 'object' ? tag.name : tag).toLowerCase()).filter(Boolean))];
  if (tags.length > MAX_TAGS) throw new IssuesDataAccessError('INVALID_INPUT', `Issues can have ${MAX_TAGS} tags or fewer.`);
  if (tags.some((tag) => tag.length > MAX_TAG_LENGTH)) throw new IssuesDataAccessError('INVALID_INPUT', `Issue tags must be ${MAX_TAG_LENGTH} characters or fewer.`);
  return tags;
}

function actorId(actor) {
  const id = clean(actor?.id);
  if (!id) throw new IssuesDataAccessError('UNAUTHORIZED', 'An authenticated user is required to manage issue comments.');
  return id;
}

function commentBody(input) {
  const bodyMarkdown = clean(input?.bodyMarkdown);
  if (!bodyMarkdown) throw new IssuesDataAccessError('INVALID_INPUT', 'Comment text is required.');
  if (bodyMarkdown.length > MAX_COMMENT_LENGTH) throw new IssuesDataAccessError('INVALID_INPUT', `Comment text must be ${MAX_COMMENT_LENGTH} characters or fewer.`);
  return bodyMarkdown;
}

function voteSummary(votes, actor) {
  const voterId = clean(actor?.id);
  return { count: votes.length, votedByMe: Boolean(voterId && votes.some((vote) => vote.voterId === voterId)), voterNames: votes.map((vote) => vote.voterName).filter(Boolean) };
}

async function withVotes(repository, comment, actor) {
  return { ...comment, votes: voteSummary(await repository.listCommentVotes(comment.id), actor) };
}

function normalize(input) {
  return {
    title: clean(input.title),
    descriptionMarkdown: clean(input.descriptionMarkdown),
    type: input.type || 'internal',
    priority: input.priority || 'medium',
    status: input.status || 'open',
    companyId: clean(input.companyId),
    operationsAccountId: clean(input.operationsAccountId),
    dueDate: clean(input.dueDate),
    createdBy: clean(input.createdBy),
    tags: normalizeTags(input.tags)
  };
}

function validate(input) {
  if (!input.title) throw new IssuesDataAccessError('INVALID_INPUT', 'Issue title is required.');
  if (input.title.length > 200) throw new IssuesDataAccessError('INVALID_INPUT', 'Issue title must be 200 characters or fewer.');
  if (!TYPES.has(input.type)) throw new IssuesDataAccessError('INVALID_INPUT', 'Issue type is invalid.');
  if (!PRIORITIES.has(input.priority)) throw new IssuesDataAccessError('INVALID_INPUT', 'Issue priority is invalid.');
  if (!STATUSES.has(input.status)) throw new IssuesDataAccessError('INVALID_INPUT', 'Issue status is invalid.');
  if (input.dueDate && Number.isNaN(new Date(input.dueDate).getTime())) throw new IssuesDataAccessError('INVALID_INPUT', 'Issue due date is invalid.');
}

export function createIssuesService(repository) {
  return {
    async list(filter = {}) {
      return repository.list({ search: clean(filter.search), status: clean(filter.status), priority: clean(filter.priority), type: clean(filter.type), tag: clean(filter.tag).toLowerCase() });
    },
    async listTags() {
      return repository.listTags();
    },
    async get(id) {
      const issue = await repository.findById(clean(id));
      if (!issue) throw new IssuesDataAccessError('NOT_FOUND', 'Issue was not found.');
      return issue;
    },
    async create(input = {}) {
      const normalized = normalize(input);
      validate(normalized);
      return repository.create(normalized);
    },
    async update(id, input = {}) {
      const existing = await this.get(id);
      const normalized = normalize({ ...existing, ...input });
      validate(normalized);
      if (['closed', 'cancelled'].includes(existing.status) && normalized.status !== existing.status) {
        throw new IssuesDataAccessError('CONFLICT', 'Closed or cancelled issues cannot be changed in this release.');
      }
      return repository.update(existing.id, normalized);
    },
    async delete(id) {
      const existing = await this.get(id);
      await repository.delete(existing.id);
    },
    async listComments(issueId, actor) {
      const issue = await this.get(issueId);
      return Promise.all((await repository.listComments(issue.id)).map((comment) => withVotes(repository, comment, actor)));
    },
    async getComment(commentId) {
      const comment = await repository.findCommentById(clean(commentId));
      if (!comment) throw new IssuesDataAccessError('NOT_FOUND', 'Issue comment was not found.');
      return comment;
    },
    async createComment(issueId, input = {}, actor) {
      const issue = await this.get(issueId);
      const authorId = actorId(actor);
      const parentId = clean(input.parentId) || null;
      let depth = 0;
      if (parentId) {
        const parent = await repository.findCommentById(parentId);
        if (!parent || parent.issueId !== issue.id) throw new IssuesDataAccessError('INVALID_INPUT', 'Reply must belong to the same issue.');
        depth = 1;
        let ancestorId = parent.parentId;
        while (ancestorId) {
          depth += 1;
          const ancestor = await repository.findCommentById(ancestorId);
          ancestorId = ancestor?.parentId || null;
        }
      }
      if (depth >= MAX_COMMENT_DEPTH) throw new IssuesDataAccessError('INVALID_INPUT', 'Comment threads cannot be nested more deeply.');
      const now = new Date().toISOString();
      return withVotes(repository, await repository.createComment({ issueId: issue.id, parentId, bodyMarkdown: commentBody(input), authorId, authorName: clean(actor.name) || clean(actor.email) || authorId, createdAt: now, updatedAt: now, edited: false }), actor);
    },
    async updateComment(commentId, input = {}, actor) {
      const authorId = actorId(actor);
      const comment = await this.getComment(commentId);
      if (comment.authorId !== authorId) throw new IssuesDataAccessError('FORBIDDEN', 'Only the comment author can edit this comment.');
      return withVotes(repository, await repository.updateComment(comment.id, { bodyMarkdown: commentBody(input), updatedAt: new Date().toISOString(), edited: true }), actor);
    },
    async deleteComment(commentId, actor) {
      const authorId = actorId(actor);
      const comment = await this.getComment(commentId);
      if (comment.authorId !== authorId) throw new IssuesDataAccessError('FORBIDDEN', 'Only the comment author can delete this comment.');
      await repository.deleteComment(comment.id);
    },
    async toggleCommentVote(commentId, actor) {
      const voterId = actorId(actor);
      const comment = await this.getComment(commentId);
      if (comment.authorId === voterId) throw new IssuesDataAccessError('FORBIDDEN', 'You cannot vote on your own comment.');
      const existing = await repository.findCommentVote(comment.id, voterId);
      if (existing) await repository.deleteCommentVote(existing.id);
      else await repository.createCommentVote({ commentId: comment.id, voterId, voterName: clean(actor.name) || clean(actor.email) || voterId, createdAt: new Date().toISOString() });
      return voteSummary(await repository.listCommentVotes(comment.id), actor);
    }
  };
}

export { TYPES, PRIORITIES, STATUSES, MAX_COMMENT_LENGTH, MAX_COMMENT_DEPTH, MAX_TAGS, MAX_TAG_LENGTH };