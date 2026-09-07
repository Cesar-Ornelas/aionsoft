import { describe, expect, test } from 'bun:test';
import { createIssuesService } from '../services/issues-service.js';

function createRepository() {
  const records = [];
  return {
    async list(filter) { return records.filter((issue) => (!filter.search || issue.title.toLowerCase().includes(filter.search.toLowerCase())) && (!filter.status || issue.status === filter.status)); },
    async findById(id) { return records.find((issue) => issue.id === id) ?? null; },
    async create(input) { const issue = { id: `issue-${records.length + 1}`, ...input }; records.push(issue); return issue; },
    async update(id, input) { const index = records.findIndex((issue) => issue.id === id); records[index] = { ...records[index], ...input }; return records[index]; }
  };
}

describe('issues service', () => {
  test('creates and filters an issue', async () => {
    const service = createIssuesService(createRepository());
    const issue = await service.create({ title: 'Provider delay', type: 'provider', priority: 'high' });
    expect(issue).toMatchObject({ title: 'Provider delay', type: 'provider', priority: 'high', status: 'open' });
    expect(await service.list({ status: 'open' })).toHaveLength(1);
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
});