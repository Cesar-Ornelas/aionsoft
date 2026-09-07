/** @typedef {import('../../model/entities.js').OperationsCall} OperationsCall */
/** @typedef {import('../../model/entities.js').OperationsCallContact} OperationsCallContact */
/** @typedef {import('../../model/entities.js').OperationsCallFilter} OperationsCallFilter */
/** @typedef {import('../../model/entities.js').SaveOperationsCallInput} SaveOperationsCallInput */

/**
 * @typedef {Object} OperationsCallRepository
 * @property {(accountId: string, filter?: OperationsCallFilter) => Promise<OperationsCall[]>} listForAccount
 * @property {(accountId: string, callId: string) => Promise<OperationsCall | null>} findForAccount
 * @property {(accountId: string, input: SaveOperationsCallInput) => Promise<OperationsCall>} create
 * @property {(accountId: string, callId: string, input: Partial<SaveOperationsCallInput>) => Promise<OperationsCall>} update
 * @property {(accountId: string, callId: string) => Promise<void>} delete
 * @property {(accountId: string) => Promise<OperationsCallContact[]>} listContactsForAccount
 */

export {};