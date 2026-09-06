import { CrmDataAccessError } from '../../model/data-access-error.js';

/** @typedef {import('../ports/company-repository.js').CompanyRepository} CompanyRepository */
/** @typedef {import('../ports/company-address-repository.js').CompanyAddressRepository} CompanyAddressRepository */
/** @typedef {import('../../model/entities.js').SaveCompanyAddressInput} SaveCompanyAddressInput */

/** @param {string | undefined} value */
function clean(value) {
  return String(value ?? '').trim();
}

/** @param {SaveCompanyAddressInput} input */
function normalizeAndValidate(input) {
  const normalized = {
    label: clean(input.label),
    type: clean(input.type),
    line1: clean(input.line1),
    line2: clean(input.line2),
    city: clean(input.city),
    region: clean(input.region),
    postalCode: clean(input.postalCode),
    country: clean(input.country).toUpperCase()
  };

  if (!normalized.label || !normalized.line1 || !normalized.city || !normalized.postalCode || !normalized.country) {
    throw new CrmDataAccessError('INVALID_INPUT', 'Address label, street, city, postal code, and country are required.');
  }

  return normalized;
}

/**
 * @param {CompanyAddressRepository} addresses
 * @param {CompanyRepository} accounts
 */
export function createCompanyAddressService(addresses, accounts) {
  async function requireAccount(accountId) {
    const account = await accounts.findById(clean(accountId));
    if (!account) throw new CrmDataAccessError('NOT_FOUND', 'Company was not found.');
    return account;
  }

  return {
    async list(accountId) {
      const account = await requireAccount(accountId);
      return addresses.listForAccount(account.id);
    },

    /** @param {string} accountId @param {SaveCompanyAddressInput} input */
    async create(accountId, input) {
      const account = await requireAccount(accountId);
      return addresses.create(account.id, normalizeAndValidate(input));
    },

    /** @param {string} accountId @param {string} addressId @param {Partial<SaveCompanyAddressInput>} input */
    async update(accountId, addressId, input) {
      const account = await requireAccount(accountId);
      const address = await addresses.findById(clean(addressId));
      if (!address || address.accountId !== account.id) {
        throw new CrmDataAccessError('NOT_FOUND', 'Address was not found for this company.');
      }
      return addresses.update(address.id, normalizeAndValidate({ ...address, ...input }));
    },

    /** @param {string} accountId @param {string} addressId */
    async remove(accountId, addressId) {
      const account = await requireAccount(accountId);
      const address = await addresses.findById(clean(addressId));
      if (!address || address.accountId !== account.id) {
        throw new CrmDataAccessError('NOT_FOUND', 'Address was not found for this company.');
      }
      await addresses.delete(address.id);
    }
  };
}
