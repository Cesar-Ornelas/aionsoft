export const DATA_ACCESS_ERROR_CODES = Object.freeze({
  CONFLICT: 'conflict',
  INVALID_INPUT: 'invalid_input',
  NOT_FOUND: 'not_found',
  UNSUPPORTED_CAPABILITY: 'unsupported_capability',
  UNAVAILABLE: 'unavailable',
  UNKNOWN: 'unknown'
});

export class DataAccessError extends Error {
  /**
   * @param {keyof typeof DATA_ACCESS_ERROR_CODES | (typeof DATA_ACCESS_ERROR_CODES)[keyof typeof DATA_ACCESS_ERROR_CODES]} code
   * @param {string} message
   * @param {{ cause?: unknown, details?: Record<string, unknown> }} [options]
   */
  constructor(code, message, options = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'DataAccessError';
    this.code = DATA_ACCESS_ERROR_CODES[code] ?? code;
    this.details = options.details ?? {};
  }
}
