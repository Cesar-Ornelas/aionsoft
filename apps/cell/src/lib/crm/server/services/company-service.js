import { CrmDataAccessError } from '../../model/data-access-error.js';

/** @typedef {import('../ports/company-repository.js').CompanyRepository} CompanyRepository */
/** @typedef {import('../../model/entities.js').Company} Company */
/** @typedef {import('../../model/entities.js').CompanyFilter} CompanyFilter */
/** @typedef {import('../../model/entities.js').SaveCompanyInput} SaveCompanyInput */

const ACCOUNT_TYPES = new Set(['legal_entity', 'dba']);
const LIFECYCLES = new Set(['related', 'prospect', 'customer', 'inactive', 'archived']);
const SORTS = new Set(['name', '-name', 'updated', '-updated']);

/** @param {string | undefined} value */
function clean(value) {
  return String(value ?? '').trim();
}

/** @param {SaveCompanyInput | Partial<SaveCompanyInput>} input */
function normalizeAccountInput(input) {
  return {
    ...(input.type !== undefined && { type: input.type }),
    ...(input.legalName !== undefined && { legalName: clean(input.legalName) }),
    ...(input.displayName !== undefined && { displayName: clean(input.displayName) }),
    ...(input.lifecycle !== undefined && { lifecycle: input.lifecycle }),
    ...(input.phone !== undefined && { phone: clean(input.phone) })
  };
}

/** @param {Partial<SaveCompanyInput>} input */
function validateAccountInput(input) {
  if (input.type !== undefined && !ACCOUNT_TYPES.has(input.type)) {
    throw new CrmDataAccessError('INVALID_INPUT', 'Account type must be legal_entity or dba.');
  }

  if (input.legalName !== undefined && !clean(input.legalName)) {
    throw new CrmDataAccessError('INVALID_INPUT', 'Legal name is required.');
  }

  if (input.lifecycle !== undefined && !LIFECYCLES.has(input.lifecycle)) {
    throw new CrmDataAccessError('INVALID_INPUT', 'Company lifecycle is invalid.');
  }
}

/**
 * @param {CompanyRepository} repository
 */
export function createCompanyService(repository) {
  return {
    /** @param {CompanyFilter} [filter] */
    async list(filter = {}) {
      const page = Math.max(1, Number(filter.page) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(filter.pageSize) || 25));
      const sort = SORTS.has(filter.sort ?? '') ? filter.sort : 'name';

      return repository.list({
        name: clean(filter.name),
        phone: clean(filter.phone),
        postalCode: clean(filter.postalCode),
        includeArchived: Boolean(filter.includeArchived),
        page,
        pageSize,
        sort
      });
    },

    /** @param {string} id */
    async get(id) {
      const account = await repository.findById(clean(id));

      if (!account) {
        throw new CrmDataAccessError('NOT_FOUND', 'Company was not found.');
      }

      return withRelationshipWarnings(account, repository);
    },

    /** @param {SaveCompanyInput} input */
    async create(input) {
      validateAccountInput(input);

      if (!clean(input.legalName)) {
        throw new CrmDataAccessError('INVALID_INPUT', 'Legal name is required.');
      }

      const account = await repository.create({
        ...normalizeAccountInput(input),
        type: input.type,
        legalName: clean(input.legalName),
        lifecycle: input.lifecycle ?? 'customer'
      });

      return withRelationshipWarnings(account, repository);
    },

    /** @param {string} id @param {Partial<SaveCompanyInput>} input */
    async update(id, input) {
      const accountId = clean(id);
      const existing = await repository.findById(accountId);

      if (!existing) {
        throw new CrmDataAccessError('NOT_FOUND', 'Company was not found.');
      }

      validateAccountInput(input);
      const account = await repository.update(accountId, normalizeAccountInput(input));
      return withRelationshipWarnings(account, repository);
    },

    /** @param {string} id */
    async archive(id) {
      const accountId = clean(id);
      const existing = await repository.findById(accountId);

      if (!existing) {
        throw new CrmDataAccessError('NOT_FOUND', 'Company was not found.');
      }

      return repository.archive(accountId);
    }
  };
}

/**
 * @param {Company} account
 * @param {CompanyRepository} repository
 */
async function withRelationshipWarnings(account, repository) {
  if (account.type !== 'dba') {
    return { ...account, unlinkedDba: false };
  }

  return {
    ...account,
    unlinkedDba: !(await repository.hasDbaParent(account.id))
  };
}
