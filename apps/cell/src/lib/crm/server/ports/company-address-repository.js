/** @typedef {import('../../model/entities.js').CompanyAddress} CompanyAddress */
/** @typedef {import('../../model/entities.js').SaveCompanyAddressInput} SaveCompanyAddressInput */

/**
 * @typedef {Object} CompanyAddressRepository
 * @property {(accountId: string) => Promise<CompanyAddress[]>} listForAccount
 * @property {(id: string) => Promise<CompanyAddress | null>} findById
 * @property {(accountId: string, input: SaveCompanyAddressInput) => Promise<CompanyAddress>} create
 * @property {(id: string, input: Partial<SaveCompanyAddressInput>) => Promise<CompanyAddress>} update
 * @property {(id: string) => Promise<void>} delete
 */

export {};
