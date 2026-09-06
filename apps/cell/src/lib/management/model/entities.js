/**
 * @typedef {string} ManagementId
 */

/**
 * @typedef {Object} ManagementGroup
 * @property {ManagementId} id
 * @property {string} name
 * @property {string} slug
 * @property {string} description
 * @property {string} status
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} ManagementUser
 * @property {ManagementId} id
 * @property {string} name
 * @property {string} email
 * @property {string} jobTitle
 * @property {string} status
 * @property {string | null} providerSubject
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} ManagementPermission
 * @property {ManagementId} id
 * @property {string} name
 * @property {string} key
 * @property {string} description
 * @property {string} category
 * @property {string} status
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} ManagementRole
 * @property {ManagementId} id
 * @property {string} name
 * @property {string} key
 * @property {string} description
 * @property {string[]} permissionKeys
 * @property {string} status
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} ManagementIdentity
 * @property {ManagementId} id
 * @property {string} subject
 * @property {string} name
 * @property {string} email
 * @property {string} username
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} timezone
 * @property {string | null} avatarUrl
 * @property {boolean} emailVisible
 * @property {boolean} verified
 * @property {string} status
 * @property {string | null} lastLoginAt
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} SaveGroupInput
 * @property {string} name
 * @property {string} slug
 * @property {string} [description]
 * @property {string} [status]
 */

/**
 * @typedef {Object} SaveUserInput
 * @property {string} name
 * @property {string} email
 * @property {string} [jobTitle]
 * @property {string} [status]
 * @property {string} [providerSubject]
 */

/**
 * @typedef {Object} SavePermissionInput
 * @property {string} name
 * @property {string} key
 * @property {string} [description]
 * @property {string} [category]
 * @property {string} [status]
 */

/**
 * @typedef {Object} SaveRoleInput
 * @property {string} name
 * @property {string} key
 * @property {string} [description]
 * @property {string[]} [permissionKeys]
 * @property {string} [status]
 */

/**
 * @typedef {Object} CreateIdentityInput
 * @property {string} name
 * @property {string} email
 * @property {string} [username]
 * @property {string} [firstName]
 * @property {string} [lastName]
 * @property {string} [timezone]
 * @property {string} [status]
 * @property {boolean} [emailVisible]
 * @property {boolean} [verified]
 * @property {string} [password]
 */

/**
 * @typedef {Partial<Omit<CreateIdentityInput, 'password'>>} UpdateIdentityInput
 */

export {};
