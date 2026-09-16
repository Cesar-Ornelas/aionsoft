import { createHash, randomUUID } from 'node:crypto';
import { DocumentDataAccessError } from '../../model/data-access-error.js';
import { documentResourceScope, validateDocumentImageUpload } from '../../model/resources.js';

const now = () => new Date().toISOString();

function checksum(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export function createDocumentResourceService(repository) {
  return {
    list: async (templateId) => repository.list(documentResourceScope(templateId), 'image'),
    upload: async (templateId, file) => {
      const { mediaType, size } = validateDocumentImageUpload(file);
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (bytes.byteLength !== size) throw new DocumentDataAccessError('INVALID_INPUT', 'The uploaded image could not be read.');
      const resourceKey = `img_${randomUUID().replaceAll('-', '')}`;
      return repository.create({
        resourceKey,
        scopeKey: documentResourceScope(templateId),
        resourceType: 'image',
        name: String(file.name || 'image').trim().slice(0, 180) || 'image',
        mediaType,
        sizeBytes: size,
        checksum: checksum(bytes),
        width: null,
        height: null,
        createdAt: now(),
        file
      });
    },
    delete: async (templateId, resourceKey) => repository.delete(documentResourceScope(templateId), resourceKey)
  };
}