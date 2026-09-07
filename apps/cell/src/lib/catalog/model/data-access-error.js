export const CATALOG_DATA_ACCESS_ERROR_CODES = Object.freeze({
  CONFLICT: 'conflict',
  INVALID_INPUT: 'invalid_input',
  NOT_FOUND: 'not_found',
  UNAVAILABLE: 'unavailable',
  UNKNOWN: 'unknown'
});

export class CatalogDataAccessError extends Error {
  constructor(code, message, options = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'CatalogDataAccessError';
    this.code = CATALOG_DATA_ACCESS_ERROR_CODES[code] ?? code;
    this.details = options.details ?? {};
  }
}
