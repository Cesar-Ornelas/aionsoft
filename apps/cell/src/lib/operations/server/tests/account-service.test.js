import { describe, expect, test } from 'bun:test';
import { CRM_DATA_ACCESS_ERROR_CODES } from '$lib/crm/model/data-access-error.js';
import { createOperationsAccountService } from '../services/account-service.js';

function setup() {
  const accounts = new Map();
  const companies = new Map([
    ['company-1', { id: 'company-1', legalName: 'Acme Legal', lifecycle: 'customer', operationsAccountId: null }],
    ['company-2', { id: 'company-2', legalName: 'Acme DBA', lifecycle: 'customer', operationsAccountId: null }],
    ['company-3', { id: 'company-3', legalName: 'Prospect Co', lifecycle: 'prospect', operationsAccountId: null }]
  ]);
  let nextId = 1;
  const accountRepository = {
    async list() { return { items: [...accounts.values()], page: 1, pageSize: 25, totalItems: accounts.size, totalPages: 1 }; },
    async findById(id) { return accounts.get(id) ?? null; },
    async create(input) { const account = { id: `account-${nextId++}`, ...input }; accounts.set(account.id, account); return account; },
    async update(id, input) { const account = { ...accounts.get(id), ...input }; accounts.set(id, account); return account; }
  };
  const companyRepository = {
    async findById(id) { return companies.get(id) ?? null; },
    async setOperationsAccount(id, operationsAccountId) { const company = { ...companies.get(id), operationsAccountId }; companies.set(id, company); return company; },
    async listForOperationsAccount(operationsAccountId) { const items = [...companies.values()].filter((company) => company.operationsAccountId === operationsAccountId); return { items }; }
  };
  return { service: createOperationsAccountService(accountRepository, companyRepository), accounts, companies };
}

describe('operations account service', () => {
  test('creates an account with only a name', async () => {
    const context = setup();
    const account = await context.service.create({ name: 'Northwest Service Group' });
    expect(account.name).toBe('Northwest Service Group');
    expect(account.status).toBe('active');
  });

  test('links multiple customer companies to one account', async () => {
    const context = setup();
    const account = await context.service.create({ name: 'Shared Operations' });
    await context.service.linkCompany(account.id, 'company-1');
    await context.service.linkCompany(account.id, 'company-2');
    expect((await context.service.listCompanies(account.id)).map((company) => company.id)).toEqual(['company-1', 'company-2']);
  });

  test('rejects non-customer companies', async () => {
    const context = setup();
    const account = await context.service.create({ name: 'Operations' });
    expect(context.service.linkCompany(account.id, 'company-3')).rejects.toMatchObject({ code: CRM_DATA_ACCESS_ERROR_CODES.CONFLICT });
  });

  test('rejects a company already assigned to another account', async () => {
    const context = setup();
    const first = await context.service.create({ name: 'First' });
    const second = await context.service.create({ name: 'Second' });
    await context.service.linkCompany(first.id, 'company-1');
    expect(context.service.linkCompany(second.id, 'company-1')).rejects.toMatchObject({ code: CRM_DATA_ACCESS_ERROR_CODES.CONFLICT });
  });

  test('archiving preserves company links', async () => {
    const context = setup();
    const account = await context.service.create({ name: 'Historical Account' });
    await context.service.linkCompany(account.id, 'company-1');
    await context.service.archive(account.id);
    expect((await context.service.listCompanies(account.id)).map((company) => company.id)).toEqual(['company-1']);
  });
});
