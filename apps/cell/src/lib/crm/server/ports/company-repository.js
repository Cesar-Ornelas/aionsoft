/** @typedef {import('../../model/entities.js').Company} Company */
/** @typedef {import('../../model/entities.js').CompanyFilter} CompanyFilter */
/** @typedef {import('../../model/entities.js').CompanyListResult} CompanyListResult */
/** @typedef {import('../../model/entities.js').SaveCompanyInput} SaveCompanyInput */

/**
 * Provider-neutral persistence required by CRM company workflows.
 * Implementations return normalized records and stable CRM data-access errors.
 *
 * @typedef {Object} CompanyRepository
 * @property {(filter: CompanyFilter) => Promise<CompanyListResult>} list
 * @property {(id: string) => Promise<Company | null>} findById
 * @property {(input: SaveCompanyInput) => Promise<Company>} create
 * @property {(id: string, input: Partial<SaveCompanyInput>) => Promise<Company>} update
 * @property {(id: string, operationsAccountId: string | null) => Promise<Company>} setOperationsAccount
 * @property {(operationsAccountId: string) => Promise<{items: Company[]}>} listForOperationsAccount
 * @property {(id: string) => Promise<Company>} archive
 * @property {(accountId: string) => Promise<boolean>} hasDbaParent
 * @property {(accountId: string, contactId: string) => Promise<Company>} setPrimaryContact
 */

export {};
