import { DocumentDataAccessError } from './data-access-error.js';

export const DOCUMENT_RESOURCE_TYPES = new Set(['image']);
export const DOCUMENT_IMAGE_TYPES = new Set(['image/png', 'image/jpeg']);
export const DOCUMENT_RESOURCE_MAX_BYTES = 5 * 1024 * 1024;

const allowedResourceKey = /^[a-zA-Z0-9][a-zA-Z0-9_-]{5,63}$/;

export function documentResourceScope(templateId) {
  const value = String(templateId ?? '').trim();
  if (!value) throw new DocumentDataAccessError('INVALID_INPUT', 'Document template id is required.');
  return `document-template:${value}`;
}

export function normalizeDocumentResource(value) {
  if (!value || typeof value !== 'object') return null;
  const resourceKey = String(value.resourceKey ?? '').trim();
  const resourceType = String(value.resourceType ?? 'image').trim();
  const mediaType = String(value.mediaType ?? '').trim().toLowerCase();
  const sizeBytes = Number(value.sizeBytes ?? 0);
  if (!allowedResourceKey.test(resourceKey) || !DOCUMENT_RESOURCE_TYPES.has(resourceType) || !DOCUMENT_IMAGE_TYPES.has(mediaType)) return null;
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > DOCUMENT_RESOURCE_MAX_BYTES) return null;
  return {
    resourceKey,
    resourceType,
    scopeKey: String(value.scopeKey ?? '').trim(),
    name: String(value.name ?? '').trim().slice(0, 180),
    mediaType,
    sizeBytes,
    checksum: String(value.checksum ?? '').trim(),
    width: Number.isSafeInteger(Number(value.width)) ? Number(value.width) : null,
    height: Number.isSafeInteger(Number(value.height)) ? Number(value.height) : null,
    createdAt: String(value.createdAt ?? '').trim()
  };
}

export function validateDocumentImageUpload(file) {
  const mediaType = String(file?.type ?? '').trim().toLowerCase();
  const size = Number(file?.size ?? 0);
  if (!DOCUMENT_IMAGE_TYPES.has(mediaType)) throw new DocumentDataAccessError('INVALID_INPUT', 'Only PNG and JPEG images are supported.');
  if (!Number.isSafeInteger(size) || size < 1 || size > DOCUMENT_RESOURCE_MAX_BYTES) throw new DocumentDataAccessError('INVALID_INPUT', 'Images must be smaller than 5 MB.');
  return { mediaType, size };
}