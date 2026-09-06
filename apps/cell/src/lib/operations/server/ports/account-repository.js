/** @typedef {import('../../model/entities.js').OperationsAccount} OperationsAccount */
/** @typedef {import('../../model/entities.js').OperationsAccountFilter} OperationsAccountFilter */
/** @typedef {import('../../model/entities.js').SaveOperationsAccountInput} SaveOperationsAccountInput */

/**
 * @typedef {Object} OperationsAccountRepository
 * @property {(filter: OperationsAccountFilter) => Promise<{items: OperationsAccount[], page: number, pageSize: number, totalItems: number, totalPages: number}>} list
 * @property {(id: string) => Promise<OperationsAccount | null>} findById
 * @property {(input: SaveOperationsAccountInput) => Promise<OperationsAccount>} create
 * @property {(id: string, input: Partial<SaveOperationsAccountInput>) => Promise<OperationsAccount>} update
 */

export {};
