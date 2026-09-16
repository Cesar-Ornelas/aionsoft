/** @typedef {import('../../model/document-variables.js').DocumentVariable} DocumentVariable */

/** @typedef {Object} DocumentVariableRepository
 * @property {() => Promise<DocumentVariable[]>} list
 * @property {(id: string) => Promise<DocumentVariable | null>} findById
 * @property {(input: Object) => Promise<DocumentVariable>} create
 * @property {(id: string, input: Object) => Promise<DocumentVariable>} update
 */

export {};
