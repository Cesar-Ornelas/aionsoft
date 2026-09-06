export const CRM_DATA_ACCESS_ERROR_CODES = Object.freeze({
  CONFLICT: 'conflict',
  INVALID_INPUT: 'invalid_input',
  NOT_FOUND: 'not_found',
  UNSUPPORTED_CAPABILITY: 'unsupported_capability',
  UNAVAILABLE: 'unavailable',
  UNKNOWN: 'unknown'
});

export class CrmDataAccessError extends Error {
  /**
   * @param {keyof typeof CRM_DATA_ACCESS_ERROR_CODES | (typeof CRM_DATA_ACCESS_ERROR_CODES)[keyof typeof CRM_DATA_ACCESS_ERROR_CODES]} code
   * @param {string} message
   * @param {{ cause?: unknown, details?: Record<string, unknown> }} [options]
   */
  constructor(code, message, options = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'CrmDataAccessError';
    this.code = CRM_DATA_ACCESS_ERROR_CODES[code] ?? code;
    this.details = options.details ?? {};
  }
}
