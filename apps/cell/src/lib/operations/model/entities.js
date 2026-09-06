/** @typedef {'active' | 'inactive' | 'archived'} OperationsAccountStatus */

/**
 * @typedef {Object} OperationsAccount
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {OperationsAccountStatus} status
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} OperationsAccountFilter
 * @property {string} [name]
 * @property {OperationsAccountStatus} [status]
 * @property {number} [page]
 * @property {number} [pageSize]
 */

/**
 * @typedef {Object} SaveOperationsAccountInput
 * @property {string} name
 * @property {string} [description]
 * @property {OperationsAccountStatus} [status]
 */

export {};
