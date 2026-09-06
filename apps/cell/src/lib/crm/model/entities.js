/** @typedef {'legal_entity' | 'dba'} CompanyType */
/** @typedef {'related' | 'prospect' | 'customer' | 'inactive' | 'archived'} CompanyLifecycle */
/** @typedef {'dba_of' | 'subsidiary_of' | 'affiliate_of'} AccountRelationshipType */

/**
 * @typedef {Object} Company
 * @property {string} id
 * @property {CompanyType} type
 * @property {string} legalName
 * @property {string} displayName
 * @property {CompanyLifecycle} lifecycle
 * @property {string} phone
 * @property {string | null} operationsAccountId
 * @property {string | null} primaryContactId
 * @property {boolean} unlinkedDba
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} CompanyContact
 * @property {string} id
 * @property {string | null} accountId
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} jobTitle
 * @property {string} email
 * @property {string} phone
 * @property {string} extension
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} CompanyAddress
 * @property {string} id
 * @property {string} accountId
 * @property {string} label
 * @property {string} type
 * @property {string} line1
 * @property {string} line2
 * @property {string} city
 * @property {string} region
 * @property {string} postalCode
 * @property {string} country
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} AccountRelationship
 * @property {string} id
 * @property {string} sourceAccountId
 * @property {string} targetAccountId
 * @property {AccountRelationshipType} type
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} SaveCompanyInput
 * @property {CompanyType} type
 * @property {string} legalName
 * @property {string} [displayName]
 * @property {CompanyLifecycle} [lifecycle]
 * @property {string} [phone]
 * @property {string | null} [operationsAccountId]
 */

/**
 * @typedef {Object} SaveCompanyContactInput
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} [jobTitle]
 * @property {string} [email]
 * @property {string} [phone]
 * @property {string} [extension]
 */

/**
 * @typedef {Object} SaveCompanyAddressInput
 * @property {string} label
 * @property {string} type
 * @property {string} line1
 * @property {string} [line2]
 * @property {string} city
 * @property {string} [region]
 * @property {string} postalCode
 * @property {string} country
 */

/**
 * @typedef {Object} SaveAccountRelationshipInput
 * @property {string} targetAccountId
 * @property {AccountRelationshipType} type
 */

/**
 * @typedef {Object} CompanyFilter
 * @property {string} [name]
 * @property {string} [phone]
 * @property {string} [postalCode]
 * @property {boolean} [includeArchived]
 * @property {number} [page]
 * @property {number} [pageSize]
 * @property {'name' | '-name' | 'updated' | '-updated'} [sort]
 */

/**
 * @typedef {Object} CompanyListResult
 * @property {Company[]} items
 * @property {number} page
 * @property {number} pageSize
 * @property {number} totalItems
 * @property {number} totalPages
 */

export {};
