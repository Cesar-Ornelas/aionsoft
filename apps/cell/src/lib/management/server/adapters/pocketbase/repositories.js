import { DataAccessError } from '../../../model/data-access-error.js';

const FORMS = 'management_forms';
const VERSIONS = 'management_form_versions';

function parseSchema(value) {
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { throw new DataAccessError('UNKNOWN', 'Stored form schema is invalid.'); }
  }
  return value ?? { fields: [] };
}

function formFromRecord(record) {
  return {
    id: record.id,
    name: record.name,
    description: record.description || '',
    category: record.category || '',
    status: record.status,
    createdAt: record.created || '',
    updatedAt: record.updated || ''
  };
}

function versionFromRecord(record) {
  return {
    id: record.id,
    formId: record.form,
    versionNumber: Number(record.version_number || 0),
    schema: parseSchema(record.schema),
    isPublished: Boolean(record.is_published),
    status: record.status || (record.is_published ? 'published' : 'draft'),
    createdAt: record.created_at || record.created || ''
  };
}

function translateError(error, message) {
  if (error instanceof DataAccessError) return error;
  const status = Number(error?.status ?? error?.response?.status);
  if (status === 404) return new DataAccessError('NOT_FOUND', message, { cause: error });
  if (status === 400) return new DataAccessError('INVALID_INPUT', message, { cause: error });
  if (status === 409) return new DataAccessError('CONFLICT', message, { cause: error });
  return new DataAccessError('UNAVAILABLE', message, { cause: error });
}

export function createPocketBaseFormRepository(client) {
  const forms = client.collection(FORMS);
  const versions = client.collection(VERSIONS);
  return {
    async listForms() {
      try { return (await forms.getFullList({ sort: 'name' })).map(formFromRecord); }
      catch (error) { throw translateError(error, 'Unable to list forms.'); }
    },
    async findFormById(id) {
      try { return formFromRecord(await forms.getOne(id)); }
      catch (error) { if (Number(error?.status) === 404) return null; throw translateError(error, 'Unable to load the form.'); }
    },
    async createForm(input) {
      try { return formFromRecord(await forms.create({ name: input.name, description: input.description || '', category: input.category || '', status: input.status })); }
      catch (error) { throw translateError(error, 'Unable to create the form.'); }
    },
    async updateForm(id, input) {
      try {
        return formFromRecord(await forms.update(id, {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.category !== undefined && { category: input.category }),
          ...(input.status !== undefined && { status: input.status })
        }));
      } catch (error) { throw translateError(error, 'Unable to update the form.'); }
    },
    async listVersions(formId) {
      try { return (await versions.getFullList({ filter: client.filter('form = {:form}', { form: formId }), sort: '-version_number' })).map(versionFromRecord); }
      catch (error) { throw translateError(error, 'Unable to list form versions.'); }
    },
    async findVersionById(id) {
      try { return versionFromRecord(await versions.getOne(id)); }
      catch (error) { if (Number(error?.status) === 404) return null; throw translateError(error, 'Unable to load the form version.'); }
    },
    async createVersion(input) {
      try {
        return versionFromRecord(await versions.create({
          form: input.formId,
          version_number: input.versionNumber,
          schema: input.schema,
          is_published: Boolean(input.isPublished),
          status: input.status || (input.isPublished ? 'published' : 'draft'),
          created_at: input.createdAt
        }));
      } catch (error) { throw translateError(error, 'Unable to create the form version.'); }
    },
    async updateVersion(id, input) {
      try {
        return versionFromRecord(await versions.update(id, {
          ...(input.isPublished !== undefined && { is_published: Boolean(input.isPublished) }),
          ...(input.status !== undefined && { status: input.status })
        }));
      } catch (error) { throw translateError(error, 'Unable to update the form version.'); }
    }
  };
}
