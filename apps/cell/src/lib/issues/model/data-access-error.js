export class IssuesDataAccessError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = 'IssuesDataAccessError';
    this.code = code;
  }
}