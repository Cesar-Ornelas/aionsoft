import { CrmDataAccessError } from '../../model/data-access-error.js';

/** @typedef {import('../ports/company-repository.js').CompanyRepository} CompanyRepository */
/** @typedef {import('../ports/company-contact-repository.js').CompanyContactRepository} CompanyContactRepository */
/** @typedef {import('../../model/entities.js').SaveCompanyContactInput} SaveCompanyContactInput */

/** @param {string | undefined} value */
function clean(value) {
  return String(value ?? '').trim();
}

/** @param {Partial<SaveCompanyContactInput>} input @param {boolean} requireIdentity */
function normalizeAndValidate(input, requireIdentity) {
  const normalized = {
    ...(input.firstName !== undefined && { firstName: clean(input.firstName) }),
    ...(input.lastName !== undefined && { lastName: clean(input.lastName) }),
    ...(input.jobTitle !== undefined && { jobTitle: clean(input.jobTitle) }),
    ...(input.email !== undefined && { email: clean(input.email).toLowerCase() }),
    ...(input.phone !== undefined && { phone: clean(input.phone) }),
    ...(input.extension !== undefined && { extension: clean(input.extension) })
  };

  if (requireIdentity && (!normalized.firstName || !normalized.lastName)) {
    throw new CrmDataAccessError('INVALID_INPUT', 'Contact first and last name are required.');
  }

  if (requireIdentity && !normalized.email && !normalized.phone) {
    throw new CrmDataAccessError('INVALID_INPUT', 'Contact email or phone is required.');
  }

  return normalized;
}

/**
 * @param {CompanyContactRepository} contacts
 * @param {CompanyRepository} accounts
 */
export function createCompanyContactService(contacts, accounts) {
  async function requireAccount(accountId) {
    const account = await accounts.findById(clean(accountId));
    if (!account) throw new CrmDataAccessError('NOT_FOUND', 'Company was not found.');
    return account;
  }

  return {
    async list(accountId) {
      await requireAccount(accountId);
      return contacts.listForAccount(clean(accountId));
    },

    async listAll(filter = {}) {
      return contacts.list(filter);
    },

    async get(contactId) {
      const contact = await contacts.findById(clean(contactId));
      if (!contact) throw new CrmDataAccessError('NOT_FOUND', 'Contact was not found.');
      return contact;
    },

    /** @param {SaveCompanyContactInput} input */
    async createStandalone(input) {
      return contacts.create(null, normalizeAndValidate(input, true));
    },

    /** @param {string} contactId @param {Partial<SaveCompanyContactInput>} input */
    async updateStandalone(contactId, input) {
      const contact = await this.get(contactId);
      const merged = normalizeAndValidate({ ...contact, ...input }, true);
      return contacts.update(contact.id, merged);
    },

    async link(contactId, accountId) {
      const account = await requireAccount(accountId);
      const contact = await this.get(contactId);
      const linked = await contacts.setAccount(contact.id, account.id);

      if (!account.primaryContactId) {
        await accounts.setPrimaryContact(account.id, linked.id);
      }

      return linked;
    },

    async unlink(contactId) {
      const contact = await this.get(contactId);
      if (!contact.accountId) return contact;

      const account = await requireAccount(contact.accountId);
      if (account.primaryContactId === contact.id) {
        throw new CrmDataAccessError('CONFLICT', 'Select another primary contact before unlinking this contact.');
      }

      return contacts.setAccount(contact.id, null);
    },

    async removeStandalone(contactId) {
      const contact = await this.get(contactId);
      if (contact.accountId) {
        throw new CrmDataAccessError('CONFLICT', 'Unlink the contact from its company before deleting it.');
      }
      await contacts.delete(contact.id);
    },

    /** @param {string} accountId @param {SaveCompanyContactInput} input */
    async create(accountId, input) {
      const account = await requireAccount(accountId);
      const contact = await contacts.create(account.id, normalizeAndValidate(input, true));

      if (!account.primaryContactId) {
        await accounts.setPrimaryContact(account.id, contact.id);
      }

      return contact;
    },

    /** @param {string} accountId @param {string} contactId */
    async setPrimary(accountId, contactId) {
      const account = await requireAccount(accountId);
      const contact = await contacts.findById(clean(contactId));

      if (!contact || contact.accountId !== account.id) {
        throw new CrmDataAccessError('NOT_FOUND', 'Contact was not found for this company.');
      }

      return accounts.setPrimaryContact(account.id, contact.id);
    },

    /** @param {string} accountId @param {string} contactId @param {Partial<SaveCompanyContactInput>} input */
    async update(accountId, contactId, input) {
      const account = await requireAccount(accountId);
      const contact = await contacts.findById(clean(contactId));
      if (!contact || contact.accountId !== account.id) {
        throw new CrmDataAccessError('NOT_FOUND', 'Contact was not found for this company.');
      }

      const merged = normalizeAndValidate({ ...contact, ...input }, true);
      return contacts.update(contact.id, merged);
    },

    /** @param {string} accountId @param {string} contactId */
    async remove(accountId, contactId) {
      const account = await requireAccount(accountId);
      const contact = await contacts.findById(clean(contactId));

      if (!contact || contact.accountId !== account.id) {
        throw new CrmDataAccessError('NOT_FOUND', 'Contact was not found for this company.');
      }

      if (account.primaryContactId === contact.id) {
        throw new CrmDataAccessError('CONFLICT', 'Select another primary contact before deleting this contact.');
      }

      await contacts.delete(contact.id);
    }
  };
}
