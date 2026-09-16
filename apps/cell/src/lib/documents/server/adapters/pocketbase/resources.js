import { DocumentDataAccessError } from '../../../model/data-access-error.js';

const COLLECTION = 'resources';

function resourceFromRecord(record, fileUrl) {
  return {
    resourceKey: record.resource_key,
    scopeKey: record.scope_key,
    resourceType: record.resource_type,
    name: record.name || record.file || 'image',
    mediaType: record.media_type,
    sizeBytes: Number(record.size_bytes || 0),
    checksum: record.checksum || '',
    width: Number.isSafeInteger(Number(record.width)) ? Number(record.width) : null,
    height: Number.isSafeInteger(Number(record.height)) ? Number(record.height) : null,
    createdAt: record.created_at || record.created || '',
    url: fileUrl || null
  };
}

function translate(error, message) {
  if (error instanceof DocumentDataAccessError) return error;
  const status = Number(error?.status ?? error?.response?.status);
  return new DocumentDataAccessError(status === 404 ? 'NOT_FOUND' : status === 400 ? 'INVALID_INPUT' : 'UNAVAILABLE', message, { cause: error });
}

export function createPocketBaseDocumentResourceRepository(client) {
  const resources = client.collection(COLLECTION);
  const urlFor = (record) => record.file ? client.files.getURL(record, record.file) : null;
  return {
    async list(scopeKey, resourceType = 'image') {
      try {
        return (await resources.getFullList({ filter: client.filter('scope_key = {:scope} && resource_type = {:type}', { scope: scopeKey, type: resourceType }), sort: '-created_at' })).map((record) => resourceFromRecord(record, urlFor(record)));
      } catch (error) { throw translate(error, 'Unable to list document resources.'); }
    },
    async create(input) {
      try {
        const record = await resources.create({ resource_key: input.resourceKey, scope_key: input.scopeKey, resource_type: input.resourceType, file: input.file, name: input.name, media_type: input.mediaType, size_bytes: input.sizeBytes, checksum: input.checksum, width: input.width || 0, height: input.height || 0, created_at: input.createdAt });
        return resourceFromRecord(record, urlFor(record));
      } catch (error) { throw translate(error, 'Unable to upload document resource.'); }
    },
    async delete(scopeKey, resourceKey) {
      try {
        const record = await resources.getFirstListItem(client.filter('scope_key = {:scope} && resource_key = {:resourceKey}', { scope: scopeKey, resourceKey }));
        await resources.delete(record.id);
      } catch (error) { throw translate(error, 'Unable to delete document resource.'); }
    }
  };
}