/** @typedef {import('../../model/entities.js').CompanyContact} CompanyContact */
/** @typedef {import('../../model/entities.js').SaveCompanyContactInput} SaveCompanyContactInput */

/**
 * @typedef {Object} CompanyContactFilter
 * @property {string} [name]
 * @property {string} [email]
 * @property {string} [phone]
 * @property {string} [jobTitle]
 * @property {'all' | 'linked' | 'unlinked'} [companyState]
 * @property {string} [companyId]
 */

/**
 * @typedef {Object} CompanyContactRepository
 * @property {(accountId: string) => Promise<CompanyContact[]>} listForAccount
 * @property {(filter?: CompanyContactFilter) => Promise<CompanyContact[]>} list
 * @property {(id: string) => Promise<CompanyContact | null>} findById
 * @property {(accountId: string | null, input: SaveCompanyContactInput) => Promise<CompanyContact>} create
 * @property {(id: string, input: Partial<SaveCompanyContactInput>) => Promise<CompanyContact>} update
 * @property {(id: string, accountId: string | null) => Promise<CompanyContact>} setAccount
 * @property {(id: string) => Promise<void>} delete
 */

export {};
