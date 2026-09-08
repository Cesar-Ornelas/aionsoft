const ERROR_CODES = Object.freeze({
  CONFLICT: 'conflict',
  INVALID_INPUT: 'invalid_input',
  NOT_FOUND: 'not_found',
  UNAVAILABLE: 'unavailable'
});

export class DocumentDataAccessError extends Error {
  constructor(code, message, options = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'DocumentDataAccessError';
    this.code = ERROR_CODES[code] ?? code;
    this.details = options.details ?? {};
  }
}
