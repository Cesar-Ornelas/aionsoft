import { DocumentDataAccessError } from './data-access-error.js';

export const DOCUMENT_PACKAGE_KIND = 'aionsoft.document-package';
export const DOCUMENT_PACKAGE_VERSION = 1;

export function validateDocumentPackage(bundle) {
  if (!bundle || typeof bundle !== 'object') throw new DocumentDataAccessError('INVALID_INPUT', 'Document package must be a JSON object.');
  if (bundle.kind !== DOCUMENT_PACKAGE_KIND) throw new DocumentDataAccessError('INVALID_INPUT', 'Document package kind is invalid.');
  if (bundle.schemaVersion !== DOCUMENT_PACKAGE_VERSION) throw new DocumentDataAccessError('INVALID_INPUT', 'Document package version is unsupported.');
  if (!bundle.template || !Array.isArray(bundle.templateVersions)) throw new DocumentDataAccessError('INVALID_INPUT', 'Document package is missing template data.');
  for (const version of bundle.templateVersions) {
    if (!version.key || !Number.isInteger(version.versionNumber)) throw new DocumentDataAccessError('INVALID_INPUT', 'Document package contains an invalid template version.');
  }
  for (const document of bundle.documents ?? []) {
    if (!document.templateVersionKey) throw new DocumentDataAccessError('INVALID_INPUT', 'Generated document is missing its template version reference.');
  }
  return bundle;
}

export function packageKey(prefix, id) {
  return `${prefix}:${id}`;
}