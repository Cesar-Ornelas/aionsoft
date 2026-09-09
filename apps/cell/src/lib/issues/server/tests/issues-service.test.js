import { describe, expect, test } from 'bun:test';
import { createIssuesService } from '../services/issues-service.js';

function createRepository() {
  const records = [];
  const comments = [];
  return {
    async list(filter) { return records.filter((issue) => (!filter.search || issue.title.toLowerCase().includes(filter.search.toLowerCase())) && (!filter.status || issue.status === filter.status) && (!filter.tag || issue.tags.some((tag) => tag.name === filter.tag))); },
    async listTags() { return [...new Map(records.flatMap((issue) => issue.tags).map((tag) => [tag.name, tag])).values()]; },
    async findById(id) { return records.find((issue) => issue.id === id) ?? null; },
    async create(input) { const issue = { id: `issue-${records.length + 1}`, ...input, tags: input.tags.map((name, index) => ({ id: `tag-${index + 1}`, name, color: '' })) }; records.push(issue); return issue; },
    async update(id, input) { const index = records.findIndex((issue) => issue.id === id); records[index] = { ...records[index], ...input, tags: input.tags.map((name, tagIndex) => ({ id: `tag-${tagIndex + 1}`, name, color: '' })) }; return records[index]; },
    async delete(id) { const index = records.findIndex((issue) => issue.id === id); records.splice(index, 1); },
    async listComments(issueId) { return comments.filter((comment) => comment.issueId === issueId); },
    async findCommentById(id) { return comments.find((comment) => comment.id === id) ?? null; },
    async createComment(input) { const comment = { id: `comment-${comments.length + 1}`, ...input }; comments.push(comment); return comment; },
    async updateComment(id, input) { const index = comments.findIndex((comment) => comment.id === id); comments[index] = { ...comments[index], ...input }; return comments[index]; },
    async deleteComment(id) { const index = comments.findIndex((comment) => comment.id === id); comments.splice(index, 1); }
  };
}

describe('issues service', () => {
  test('creates and filters an issue', async () => {
    const service = createIssuesService(createRepository());
    const issue = await service.create({ title: 'Provider delay', type: 'provider', priority: 'high' });
    expect(issue).toMatchObject({ title: 'Provider delay', type: 'provider', priority: 'high', status: 'open' });
    expect(await service.list({ status: 'open' })).toHaveLength(1);
  });

  test('normalizes issue tags and filters by tag', async () => {
    const service = createIssuesService(createRepository());
    const tagged = await service.create({ title: 'Tagged issue', tags: ' Billing, blocked, billing ' });
    expect(tagged.tags.map((tag) => tag.name)).toEqual(['billing', 'blocked']);
    expect(await service.list({ tag: 'BILLING' })).toHaveLength(1);
    expect(await service.listTags()).toHaveLength(2);
    expect((await service.update(tagged.id, { title: 'Updated tagged issue' })).tags.map((tag) => tag.name)).toEqual(['billing', 'blocked']);
  });

  test('allows conversation-first closure and protects terminal issues', async () => {
    const service = createIssuesService(createRepository());
    const issue = await service.create({ title: 'Internal issue', type: 'internal' });
    const resolved = await service.update(issue.id, { status: 'resolved' });
    expect(resolved.status).toBe('resolved');
    const closed = await service.update(issue.id, { status: 'closed' });
    expect(closed.status).toBe('closed');
    expect(service.update(issue.id, { status: 'open' })).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  test('deletes an existing issue', async () => {
    const service = createIssuesService(createRepository());
    const issue = await service.create({ title: 'Linked review issue', type: 'internal' });
    await service.delete(issue.id);
    await expect(service.get(issue.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('creates threaded comments and enforces author ownership', async () => {
    const service = createIssuesService(createRepository());
    const issue = await service.create({ title: 'Commented issue', type: 'internal' });
    const author = { id: 'user-1', name: 'Alex' };
    const replyAuthor = { id: 'user-2', name: 'Sam' };
    const root = await service.createComment(issue.id, { bodyMarkdown: 'Please investigate this.' }, author);
    const reply = await service.createComment(issue.id, { bodyMarkdown: '**On it.**', parentId: root.id }, replyAuthor);
    expect(reply).toMatchObject({ issueId: issue.id, parentId: root.id, authorId: replyAuthor.id });
    expect(await service.listComments(issue.id)).toHaveLength(2);
    await expect(service.updateComment(root.id, { bodyMarkdown: 'Changed' }, replyAuthor)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await service.updateComment(root.id, { bodyMarkdown: 'Updated' }, author);
    await service.deleteComment(root.id, author);
  });

  test('rejects unauthenticated comments and cross-issue replies', async () => {
    const repository = createRepository();
    const service = createIssuesService(repository);
    const issue = await service.create({ title: 'First issue', type: 'internal' });
    const otherIssue = await service.create({ title: 'Second issue', type: 'internal' });
    const root = await service.createComment(issue.id, { bodyMarkdown: 'Root' }, { id: 'user-1' });
    await expect(service.createComment(issue.id, { bodyMarkdown: 'No author' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(service.createComment(otherIssue.id, { bodyMarkdown: 'Wrong thread', parentId: root.id }, { id: 'user-2' })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
});