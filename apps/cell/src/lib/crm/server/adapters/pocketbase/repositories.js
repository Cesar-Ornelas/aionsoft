import { CrmDataAccessError } from '../../../model/data-access-error.js';
import { CRM_COLLECTIONS } from './schema.js';

/** @param {string | undefined} value */
function clean(value) {
  return String(value ?? '').trim();
}

/** @param {string | undefined} value */
function normalizePhone(value) {
  return clean(value).replace(/\D/g, '');
}

/** @param {unknown} error @param {string} message */
function translateError(error, message) {
  if (error instanceof CrmDataAccessError) return error;
  const status = Number(error?.status ?? error?.response?.status);
  if (status === 404) return new CrmDataAccessError('NOT_FOUND', message, { cause: error });
  if (status === 400) return new CrmDataAccessError('INVALID_INPUT', message, { cause: error });
  return new CrmDataAccessError('UNAVAILABLE', message, { cause: error });
}

/** @param {Record<string, any>} record */
function accountFromRecord(record) {
  return {
    id: record.id,
    type: record.type,
    legalName: record.legal_name,
    displayName: record.display_name || '',
    lifecycle: record.lifecycle,
    phone: record.phone || '',
    primaryContactId: record.primary_contact || null,
    operationsAccountId: record.operations_account || null,
    unlinkedDba: false,
    createdAt: record.created || '',
    updatedAt: record.updated || record.created || ''
  };
}

/** @param {Record<string, any>} record */
function contactFromRecord(record) {
  return {
    id: record.id,
    accountId: record.account || null,
    firstName: record.first_name,
    lastName: record.last_name,
    jobTitle: record.job_title || '',
    email: record.email || '',
    phone: record.phone || '',
    extension: record.extension || '',
    createdAt: record.created || '',
    updatedAt: record.updated || record.created || ''
  };
}

/** @param {Record<string, any>} record */
function addressFromRecord(record) {
  return {
    id: record.id,
    accountId: record.account,
    label: record.label,
    type: record.type,
    line1: record.line_1,
    line2: record.line_2 || '',
    city: record.city,
    region: record.region || '',
    postalCode: record.postal_code,
    country: record.country,
    createdAt: record.created || '',
    updatedAt: record.updated || record.created || ''
  };
}

/** @param {Record<string, any>} record */
function relationshipFromRecord(record) {
  return {
    id: record.id,
    sourceAccountId: record.source_account,
    targetAccountId: record.target_account,
    type: record.type,
    createdAt: record.created || '',
    updatedAt: record.updated || record.created || ''
  };
}

/** @param {import('pocketbase').default} client */
export function createPocketBaseCompanyRepository(client) {
  const records = client.collection(CRM_COLLECTIONS.accounts);

  return {
    async list(filter) {
      try {
        const clauses = [];
        if (!filter.includeArchived) clauses.push('lifecycle != "archived"');
        if (filter.name) clauses.push(client.filter('(legal_name ~ {:name} || display_name ~ {:name})', { name: filter.name }));

        if (filter.phone) {
          const normalized = normalizePhone(filter.phone);
          const contacts = await client.collection(CRM_COLLECTIONS.contacts).getFullList({
            filter: client.filter('phone_normalized ~ {:phone}', { phone: normalized }),
            fields: 'account'
          });
          const contactIds = [...new Set(contacts.map((contact) => contact.account).filter(Boolean))];
          const accountMatches = contactIds.map((id) => client.filter('id = {:id}', { id })).join(' || ');
          clauses.push(client.filter(`(phone_normalized ~ {:phone}${accountMatches ? ` || ${accountMatches}` : ''})`, { phone: normalized }));
        }

        if (filter.postalCode) {
          const addresses = await client.collection(CRM_COLLECTIONS.addresses).getFullList({
            filter: client.filter('postal_code ~ {:postalCode}', { postalCode: filter.postalCode }),
            fields: 'account'
          });
          const accountIds = [...new Set(addresses.map((address) => address.account).filter(Boolean))];
          clauses.push(accountIds.length
            ? `(${accountIds.map((id) => client.filter('id = {:id}', { id })).join(' || ')})`
            : 'id = ""');
        }

        const sortMap = { name: 'legal_name', '-name': '-legal_name', updated: 'updated', '-updated': '-updated' };
        const result = await records.getList(filter.page, filter.pageSize, {
          filter: clauses.join(' && '),
          sort: sortMap[filter.sort] ?? 'legal_name'
        });

        return {
          items: result.items.map(accountFromRecord),
          page: result.page,
          pageSize: result.perPage,
          totalItems: result.totalItems,
          totalPages: result.totalPages
        };
      } catch (error) {
        throw translateError(error, 'Unable to list companies.');
      }
    },

    async findById(id) {
      try {
        return accountFromRecord(await records.getOne(id));
      } catch (error) {
        if (Number(error?.status) === 404) return null;
        throw translateError(error, 'Unable to load the company.');
      }
    },

    async create(input) {
      try {
        return accountFromRecord(await records.create({
          type: input.type,
          legal_name: input.legalName,
          display_name: input.displayName || '',
          lifecycle: input.lifecycle || 'customer',
          phone: input.phone || '',
          phone_normalized: normalizePhone(input.phone)
        }));
      } catch (error) {
        throw translateError(error, 'Unable to create the company.');
      }
    },

    async update(id, input) {
      try {
        return accountFromRecord(await records.update(id, {
          ...(input.type !== undefined && { type: input.type }),
          ...(input.legalName !== undefined && { legal_name: input.legalName }),
          ...(input.displayName !== undefined && { display_name: input.displayName }),
          ...(input.lifecycle !== undefined && { lifecycle: input.lifecycle }),
          ...(input.phone !== undefined && { phone: input.phone, phone_normalized: normalizePhone(input.phone) }),
          ...(input.operationsAccountId !== undefined && { operations_account: input.operationsAccountId || '' })
        }));
      } catch (error) {
        throw translateError(error, 'Unable to update the company.');
      }
    },

    async archive(id) {
      return this.update(id, { lifecycle: 'archived' });
    },

    async setOperationsAccount(id, operationsAccountId) {
      try {
        return accountFromRecord(await records.update(id, { operations_account: operationsAccountId || '' }));
      } catch (error) {
        throw translateError(error, 'Unable to update the company Operations Account.');
      }
    },

    async listForOperationsAccount(operationsAccountId) {
      try {
        const items = await records.getFullList({
          filter: client.filter('operations_account = {:operationsAccountId}', { operationsAccountId }),
          sort: 'legal_name'
        });
        return { items: items.map(accountFromRecord) };
      } catch (error) {
        throw translateError(error, 'Unable to list Operations Account companies.');
      }
    },

    async hasDbaParent(accountId) {
      try {
        await client.collection(CRM_COLLECTIONS.relationships).getFirstListItem(
          client.filter('source_account = {:accountId} && type = "dba_of"', { accountId })
        );
        return true;
      } catch (error) {
        if (Number(error?.status) === 404) return false;
        throw translateError(error, 'Unable to inspect the DBA parent relationship.');
      }
    },

    async setPrimaryContact(accountId, contactId) {
      try {
        return accountFromRecord(await records.update(accountId, { primary_contact: contactId }));
      } catch (error) {
        throw translateError(error, 'Unable to set the primary contact.');
      }
    }
  };
}

/** @param {import('pocketbase').default} client */
export function createPocketBaseCompanyContactRepository(client) {
  const records = client.collection(CRM_COLLECTIONS.contacts);
  return {
    async listForAccount(accountId) {
      try {
        return (await records.getFullList({ filter: client.filter('account = {:accountId}', { accountId }), sort: 'last_name,first_name' }))
          .map(contactFromRecord);
      } catch (error) {
        throw translateError(error, 'Unable to list company contacts.');
      }
    },
    async list(filter = {}) {
      try {
        const conditions = [];
        if (filter.name) {
          const name = clean(filter.name);
          conditions.push(client.filter('(first_name ~ {:name} || last_name ~ {:name})', { name }));
        }
        if (filter.email) conditions.push(client.filter('email ~ {:email}', { email: clean(filter.email).toLowerCase() }));
        if (filter.phone) conditions.push(client.filter('phone_normalized ~ {:phone}', { phone: normalizePhone(filter.phone) }));
        if (filter.jobTitle) conditions.push(client.filter('job_title ~ {:jobTitle}', { jobTitle: clean(filter.jobTitle) }));
        if (filter.companyId) conditions.push(client.filter('account = {:companyId}', { companyId: clean(filter.companyId) }));
        if (filter.companyState === 'linked') conditions.push('account != ""');
        if (filter.companyState === 'unlinked') conditions.push('account = ""');
        const query = conditions.filter(Boolean).join(' && ');
        return (await records.getFullList({ filter: query, sort: 'last_name,first_name' })).map(contactFromRecord);
      } catch (error) {
        throw translateError(error, 'Unable to list contacts.');
      }
    },
    async findById(id) {
      try { return contactFromRecord(await records.getOne(id)); }
      catch (error) { if (Number(error?.status) === 404) return null; throw translateError(error, 'Unable to load the contact.'); }
    },
    async create(accountId, input) {
      try {
        return contactFromRecord(await records.create({
          ...(accountId ? { account: accountId } : {}),
          first_name: input.firstName,
          last_name: input.lastName,
          job_title: input.jobTitle || '',
          email: input.email || '',
          phone: input.phone || '',
          phone_normalized: normalizePhone(input.phone),
          extension: input.extension || ''
        }));
      } catch (error) { throw translateError(error, 'Unable to create the contact.'); }
    },
    async setAccount(id, accountId) {
      try {
        return contactFromRecord(await records.update(id, { account: accountId || '' }));
      } catch (error) { throw translateError(error, 'Unable to update the contact company.'); }
    },
    async update(id, input) {
      try {
        return contactFromRecord(await records.update(id, {
          ...(input.firstName !== undefined && { first_name: input.firstName }),
          ...(input.lastName !== undefined && { last_name: input.lastName }),
          ...(input.jobTitle !== undefined && { job_title: input.jobTitle }),
          ...(input.email !== undefined && { email: input.email }),
          ...(input.phone !== undefined && { phone: input.phone, phone_normalized: normalizePhone(input.phone) }),
          ...(input.extension !== undefined && { extension: input.extension })
        }));
      } catch (error) { throw translateError(error, 'Unable to update the contact.'); }
    },
    async delete(id) {
      try { await records.delete(id); }
      catch (error) { throw translateError(error, 'Unable to delete the contact.'); }
    }
  };
}

/** @param {import('pocketbase').default} client */
export function createPocketBaseCompanyAddressRepository(client) {
  const records = client.collection(CRM_COLLECTIONS.addresses);
  return {
    async listForAccount(accountId) {
      try {
        return (await records.getFullList({ filter: client.filter('account = {:accountId}', { accountId }), sort: 'label' }))
          .map(addressFromRecord);
      } catch (error) { throw translateError(error, 'Unable to list company addresses.'); }
    },
    async findById(id) {
      try { return addressFromRecord(await records.getOne(id)); }
      catch (error) { if (Number(error?.status) === 404) return null; throw translateError(error, 'Unable to load the address.'); }
    },
    async create(accountId, input) {
      try {
        return addressFromRecord(await records.create({
          account: accountId,
          label: input.label,
          type: input.type,
          line_1: input.line1,
          line_2: input.line2 || '',
          city: input.city,
          region: input.region || '',
          postal_code: input.postalCode,
          country: input.country
        }));
      } catch (error) { throw translateError(error, 'Unable to create the address.'); }
    },
    async update(id, input) {
      try {
        return addressFromRecord(await records.update(id, {
          ...(input.label !== undefined && { label: input.label }),
          ...(input.type !== undefined && { type: input.type }),
          ...(input.line1 !== undefined && { line_1: input.line1 }),
          ...(input.line2 !== undefined && { line_2: input.line2 }),
          ...(input.city !== undefined && { city: input.city }),
          ...(input.region !== undefined && { region: input.region }),
          ...(input.postalCode !== undefined && { postal_code: input.postalCode }),
          ...(input.country !== undefined && { country: input.country })
        }));
      } catch (error) { throw translateError(error, 'Unable to update the address.'); }
    },
    async delete(id) {
      try { await records.delete(id); }
      catch (error) { throw translateError(error, 'Unable to delete the address.'); }
    }
  };
}

/** @param {import('pocketbase').default} client */
export function createPocketBaseAccountRelationshipRepository(client) {
  const records = client.collection(CRM_COLLECTIONS.relationships);
  return {
    async listForAccount(accountId) {
      try {
        return (await records.getFullList({
          filter: client.filter('source_account = {:accountId} || target_account = {:accountId}', { accountId }),
          sort: 'type'
        })).map(relationshipFromRecord);
      } catch (error) { throw translateError(error, 'Unable to list account relationships.'); }
    },
    async findMatching(sourceAccountId, targetAccountId, type) {
      try {
        return relationshipFromRecord(await records.getFirstListItem(client.filter(
          'source_account = {:sourceAccountId} && target_account = {:targetAccountId} && type = {:type}',
          { sourceAccountId, targetAccountId, type }
        )));
      } catch (error) {
        if (Number(error?.status) === 404) return null;
        throw translateError(error, 'Unable to inspect account relationships.');
      }
    },
    async create(sourceAccountId, input) {
      try {
        return relationshipFromRecord(await records.create({
          source_account: sourceAccountId,
          target_account: input.targetAccountId,
          type: input.type
        }));
      } catch (error) { throw translateError(error, 'Unable to create the account relationship.'); }
    },
    async wouldCreateHierarchyCycle(sourceAccountId, targetAccountId) {
      try {
        const hierarchy = await records.getFullList({ filter: 'type = "dba_of" || type = "subsidiary_of"', fields: 'source_account,target_account' });
        const parents = new Map();
        for (const relation of hierarchy) {
          const values = parents.get(relation.source_account) ?? [];
          values.push(relation.target_account);
          parents.set(relation.source_account, values);
        }
        const pending = [targetAccountId];
        const visited = new Set();
        while (pending.length) {
          const current = pending.pop();
          if (current === sourceAccountId) return true;
          if (visited.has(current)) continue;
          visited.add(current);
          pending.push(...(parents.get(current) ?? []));
        }
        return false;
      } catch (error) { throw translateError(error, 'Unable to validate the account hierarchy.'); }
    },
    async delete(id) {
      try { await records.delete(id); }
      catch (error) { throw translateError(error, 'Unable to delete the account relationship.'); }
    }
  };
}
