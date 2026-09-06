import { CrmDataAccessError } from '$lib/crm/model/data-access-error.js';

const COLLECTION = 'operations_accounts';

function clean(value) {
  return String(value ?? '').trim();
}

function fromRecord(record) {
  return {
    id: record.id,
    name: record.name,
    description: record.description || '',
    status: record.status,
    createdAt: record.created || '',
    updatedAt: record.updated || record.created || ''
  };
}

function translateError(error, message) {
  if (error instanceof CrmDataAccessError) return error;
  const status = Number(error?.status ?? error?.response?.status);
  if (status === 404) return new CrmDataAccessError('NOT_FOUND', message, { cause: error });
  if (status === 400) return new CrmDataAccessError('INVALID_INPUT', message, { cause: error });
  return new CrmDataAccessError('UNAVAILABLE', message, { cause: error });
}

/** @param {import('pocketbase').default} client */
export function createPocketBaseOperationsAccountRepository(client) {
  const records = client.collection(COLLECTION);

  return {
    async list(filter = {}) {
      try {
        const clauses = [];
        if (filter.name) clauses.push(client.filter('name ~ {:name}', { name: clean(filter.name) }));
        if (filter.status) clauses.push(client.filter('status = {:status}', { status: filter.status }));
        const result = await records.getList(filter.page, filter.pageSize, {
          filter: clauses.join(' && '),
          sort: 'name'
        });
        return {
          items: result.items.map(fromRecord),
          page: result.page,
          pageSize: result.perPage,
          totalItems: result.totalItems,
          totalPages: result.totalPages
        };
      } catch (error) {
        throw translateError(error, 'Unable to list Operations Accounts.');
      }
    },

    async findById(id) {
      try {
        return fromRecord(await records.getOne(id));
      } catch (error) {
        if (Number(error?.status) === 404) return null;
        throw translateError(error, 'Unable to load the Operations Account.');
      }
    },

    async create(input) {
      try {
        return fromRecord(await records.create({
          name: input.name,
          description: input.description || '',
          status: input.status || 'active'
        }));
      } catch (error) {
        throw translateError(error, 'Unable to create the Operations Account.');
      }
    },

    async update(id, input) {
      try {
        return fromRecord(await records.update(id, {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.status !== undefined && { status: input.status })
        }));
      } catch (error) {
        throw translateError(error, 'Unable to update the Operations Account.');
      }
    }
  };
}
