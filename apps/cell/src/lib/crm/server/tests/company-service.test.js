import { describe, expect, test } from 'bun:test';
import { CRM_DATA_ACCESS_ERROR_CODES } from '../../model/data-access-error.js';
import { createCompanyService } from '../services/company-service.js';

function createRepository(seed = []) {
  const records = new Map(seed.map((record) => [record.id, record]));
  const dbaParents = new Set();
  let lastFilter;

  return {
    records,
    dbaParents,
    get lastFilter() {
      return lastFilter;
    },
    async list(filter) {
      lastFilter = filter;
      const items = [...records.values()].filter(
        (account) => filter.includeArchived || account.lifecycle !== 'archived'
      );
      return { items, page: filter.page, pageSize: filter.pageSize, totalItems: items.length, totalPages: 1 };
    },
    async findById(id) {
      return records.get(id) ?? null;
    },
    async create(input) {
      const account = accountRecord(`account-${records.size + 1}`, input);
      records.set(account.id, account);
      return account;
    },
    async update(id, input) {
      const account = { ...records.get(id), ...input, updatedAt: '2026-09-04T01:00:00.000Z' };
      records.set(id, account);
      return account;
    },
    async archive(id) {
      return this.update(id, { lifecycle: 'archived' });
    },
    async hasDbaParent(id) {
      return dbaParents.has(id);
    }
  };
}

function accountRecord(id, input = {}) {
  return {
    id,
    type: input.type ?? 'legal_entity',
    legalName: input.legalName ?? 'Acme LLC',
    displayName: input.displayName ?? '',
    lifecycle: input.lifecycle ?? 'customer',
    phone: input.phone ?? '',
    primaryContactId: null,
    unlinkedDba: false,
    createdAt: '2026-09-04T00:00:00.000Z',
    updatedAt: '2026-09-04T00:00:00.000Z'
  };
}

describe('company service', () => {
  test('normalizes list filters and defaults', async () => {
    const repository = createRepository();
    const service = createCompanyService(repository);

    await service.list({ name: '  Acme  ', page: 0, pageSize: 500, sort: 'unsupported' });

    expect(repository.lastFilter).toEqual({
      name: 'Acme',
      phone: '',
      postalCode: '',
      includeArchived: false,
      page: 1,
      pageSize: 100,
      sort: 'name'
    });
  });

  test('rejects a company without a legal name', async () => {
    const service = createCompanyService(createRepository());

    expect(service.create({ type: 'legal_entity', legalName: '  ' })).rejects.toMatchObject({
      code: CRM_DATA_ACCESS_ERROR_CODES.INVALID_INPUT
    });
  });

  test('marks a DBA without a legal parent for follow-up', async () => {
    const repository = createRepository();
    const service = createCompanyService(repository);

    const account = await service.create({ type: 'dba', legalName: 'Acme Services' });

    expect(account.unlinkedDba).toBe(true);
    repository.dbaParents.add(account.id);
    expect((await service.get(account.id)).unlinkedDba).toBe(false);
  });

  test('archives rather than deleting an account', async () => {
    const repository = createRepository([accountRecord('account-1')]);
    const service = createCompanyService(repository);

    const archived = await service.archive('account-1');

    expect(archived.lifecycle).toBe('archived');
    expect(repository.records.has('account-1')).toBe(true);
  });
});
