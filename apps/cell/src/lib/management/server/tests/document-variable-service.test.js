import { describe, expect, test } from 'bun:test';
import { createDocumentVariableService } from '../services/document-variable-service.js';
import { normalizeDocumentVariable } from '../../model/document-variables.js';

function createRepository() {
  let nextId = 1;
  const records = [];
  return {
    records,
    async list() { return records.map((record) => structuredClone(record)); },
    async findById(id) { return records.find((record) => record.id === id) ?? null; },
    async create(input) { const record = { id: `variable-${nextId++}`, ...input }; records.push(record); return record; },
    async update(id, input) { const record = records.find((item) => item.id === id); Object.assign(record, input); return record; }
  };
}

describe('document variables', () => {
  test('normalizes keys and rejects invalid keys', () => {
    expect(normalizeDocumentVariable({ key: 'company_name', label: 'Company Name', value: 'Aionsoft LLC' }).key).toBe('company_name');
    expect(() => normalizeDocumentVariable({ key: 'Company Name', label: 'Company Name', value: 'Aionsoft LLC' })).toThrow();
  });

  test('creates, updates, lists, and archives variables', async () => {
    const repository = createRepository();
    const service = createDocumentVariableService(repository);
    const created = await service.create({ key: 'company_name', label: 'Company Name', value: 'Aionsoft LLC' });
    expect((await service.list())).toHaveLength(1);
    const updated = await service.update(created.id, { label: 'Legal Name', value: 'Aionsoft Inc.' });
    expect(updated.label).toBe('Legal Name');
    expect(updated.key).toBe('company_name');
    await service.archive(created.id);
    expect(await service.list()).toHaveLength(0);
    await expect(service.update(created.id, { value: 'Other' })).rejects.toThrow();
  });
});
