/** @typedef {import('../../model/entities.js').AccountRelationship} AccountRelationship */
/** @typedef {import('../../model/entities.js').SaveAccountRelationshipInput} SaveAccountRelationshipInput */

/**
 * @typedef {Object} AccountRelationshipRepository
 * @property {(accountId: string) => Promise<AccountRelationship[]>} listForAccount
 * @property {(sourceAccountId: string, targetAccountId: string, type: string) => Promise<AccountRelationship | null>} findMatching
 * @property {(sourceAccountId: string, input: SaveAccountRelationshipInput) => Promise<AccountRelationship>} create
 * @property {(sourceAccountId: string, targetAccountId: string) => Promise<boolean>} wouldCreateHierarchyCycle
 * @property {(id: string) => Promise<void>} delete
 */

export {};
