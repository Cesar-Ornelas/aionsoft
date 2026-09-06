/** @typedef {import('../../model/entities.js').OperationsEvent} OperationsEvent */
/** @typedef {import('../../model/entities.js').OperationsEventFilter} OperationsEventFilter */
/** @typedef {import('../../model/entities.js').SaveOperationsEventInput} SaveOperationsEventInput */

/**
 * @typedef {Object} OperationsEventRepository
 * @property {(accountId: string, filter?: OperationsEventFilter) => Promise<OperationsEvent[]>} listForAccount
 * @property {(accountId: string, eventId: string) => Promise<OperationsEvent | null>} findForAccount
 * @property {(accountId: string, input: SaveOperationsEventInput) => Promise<OperationsEvent>} create
 * @property {(accountId: string, eventId: string, input: Partial<SaveOperationsEventInput>) => Promise<OperationsEvent>} update
 */

export {};
