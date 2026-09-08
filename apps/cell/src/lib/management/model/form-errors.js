import { DataAccessError } from './data-access-error.js';

export class FormSchemaError extends DataAccessError {
  constructor(code, message, options = {}) {
    super(code, message, options);
    this.name = 'FormSchemaError';
  }
}
