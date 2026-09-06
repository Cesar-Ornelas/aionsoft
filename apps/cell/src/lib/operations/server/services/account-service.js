import { CrmDataAccessError } from '$lib/crm/model/data-access-error.js';

const STATUSES = new Set(['active', 'inactive', 'archived']);

function clean(value) {
  return String(value ?? '').trim();
}

function normalizeInput(input) {
  return {
    ...(input.name !== undefined && { name: clean(input.name) }),
    ...(input.description !== undefined && { description: clean(input.description) }),
    ...(input.status !== undefined && { status: input.status })
  };
}

function validateInput(input) {
  if (input.name !== undefined && !clean(input.name)) {
    throw new CrmDataAccessError('INVALID_INPUT', 'Account name is required.');
  }
  if (input.status !== undefined && !STATUSES.has(input.status)) {
    throw new CrmDataAccessError('INVALID_INPUT', 'Account status is invalid.');
  }
}

/**
 * @param {import('../ports/account-repository.js').OperationsAccountRepository} repository
 * @param {import('../../../crm/server/ports/company-repository.js').CompanyRepository} companies
 */
export function createOperationsAccountService(repository, companies) {
  return {
    async list(filter = {}) {
      const page = Math.max(1, Number(filter.page) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(filter.pageSize) || 25));
      const status = filter.status && STATUSES.has(filter.status) ? filter.status : undefined;
      return repository.list({ name: clean(filter.name), status, page, pageSize });
    },

    async get(id) {
      const account = await repository.findById(clean(id));
      if (!account) throw new CrmDataAccessError('NOT_FOUND', 'Operations account was not found.');
      return account;
    },

    async create(input) {
      const normalized = normalizeInput(input ?? {});
      validateInput(normalized);
      if (!normalized.name) throw new CrmDataAccessError('INVALID_INPUT', 'Account name is required.');
      return repository.create({ ...normalized, status: normalized.status ?? 'active' });
    },

    async update(id, input) {
      const accountId = clean(id);
      await this.get(accountId);
      const normalized = normalizeInput(input ?? {});
      validateInput(normalized);
      return repository.update(accountId, normalized);
    },

    async archive(id) {
      return this.update(id, { status: 'archived' });
    },

    async listCompanies(id) {
      const account = await this.get(id);
      const linked = await companies.listForOperationsAccount(account.id);
      return linked.items;
    },

    async linkCompany(accountId, companyId) {
      const account = await this.get(accountId);
      if (account.status !== 'active') {
        throw new CrmDataAccessError('CONFLICT', 'Only active Operations Accounts can receive companies.');
      }

      const company = await companies.findById(clean(companyId));
      if (!company) throw new CrmDataAccessError('NOT_FOUND', 'Company was not found.');
      if (company.lifecycle !== 'customer') {
        throw new CrmDataAccessError('CONFLICT', 'Only customer companies can be linked to an Operations Account.');
      }
      if (company.operationsAccountId && company.operationsAccountId !== account.id) {
        throw new CrmDataAccessError('CONFLICT', 'Company is already linked to another Operations Account.');
      }

      return companies.setOperationsAccount(company.id, account.id);
    },

    async unlinkCompany(accountId, companyId) {
      const account = await this.get(accountId);
      const company = await companies.findById(clean(companyId));
      if (!company || company.operationsAccountId !== account.id) {
        throw new CrmDataAccessError('NOT_FOUND', 'Company is not linked to this Operations Account.');
      }
      await companies.setOperationsAccount(company.id, null);
      return account;
    }
  };
}
