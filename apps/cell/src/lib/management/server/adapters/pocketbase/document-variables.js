import { DataAccessError } from '../../../model/data-access-error.js';

const COLLECTION = 'management_document_variables';

function fromRecord(record) {
  return {
    id: record.id,
    key: record.variable_key,
    label: record.label,
    value: record.value || '',
    description: record.description || '',
    status: record.status || 'active',
    createdAt: record.created_at || record.created || '',
    updatedAt: record.updated_at || record.updated || ''
  };
}

function translate(error, message) {
  if (error instanceof DataAccessError) return error;
  const status = Number(error?.status ?? error?.response?.status);
  if (status === 404) return new DataAccessError('NOT_FOUND', message, { cause: error });
  if (status === 400) return new DataAccessError('INVALID_INPUT', message, { cause: error });
  if (status === 409) return new DataAccessError('CONFLICT', message, { cause: error });
  return new DataAccessError('UNAVAILABLE', message, { cause: error });
}

export function createPocketBaseDocumentVariableRepository(client) {
  const variables = client.collection(COLLECTION);
  const fields = (input) => ({
    ...(input.key !== undefined && { variable_key: input.key }),
    ...(input.label !== undefined && { label: input.label }),
    ...(input.value !== undefined && { value: input.value }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.status !== undefined && { status: input.status }),
    ...(input.createdAt !== undefined && { created_at: input.createdAt }),
    ...(input.updatedAt !== undefined && { updated_at: input.updatedAt })
  });
  return {
    async list() {
      try { return (await variables.getFullList({ sort: 'label' })).map(fromRecord); }
      catch (error) { throw translate(error, 'Unable to list document variables.'); }
    },
    async findById(id) {
      try { return fromRecord(await variables.getOne(id)); }
      catch (error) { if (Number(error?.status) === 404) return null; throw translate(error, 'Unable to load the document variable.'); }
    },
    async create(input) {
      try { return fromRecord(await variables.create(fields(input))); }
      catch (error) { throw translate(error, 'Unable to create the document variable.'); }
    },
    async update(id, input) {
      try { return fromRecord(await variables.update(id, fields(input))); }
      catch (error) { throw translate(error, 'Unable to update the document variable.'); }
    }
  };
}
