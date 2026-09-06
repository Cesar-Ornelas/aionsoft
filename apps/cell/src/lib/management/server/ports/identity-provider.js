/** @typedef {import('../../model/entities.js').CreateIdentityInput} CreateIdentityInput */
/** @typedef {import('../../model/entities.js').ManagementIdentity} ManagementIdentity */
/** @typedef {import('../../model/entities.js').UpdateIdentityInput} UpdateIdentityInput */

/**
 * @typedef {'credential-management' | 'file-avatar' | 'identity-administration' | 'session-resolution'} IdentityCapability
 */

/**
 * Common identity operations used by the application. Provider administration,
 * callback protocols, and SDK sessions remain adapter or infrastructure concerns.
 *
 * @typedef {Object} IdentityProvider
 * @property {() => Promise<ManagementIdentity[]>} listIdentities
 * @property {(id: string) => Promise<ManagementIdentity | null>} findIdentityById
 * @property {(email: string) => Promise<ManagementIdentity | null>} findIdentityByEmail
 * @property {(input: CreateIdentityInput) => Promise<ManagementIdentity>} createIdentity
 * @property {(id: string, input: UpdateIdentityInput) => Promise<ManagementIdentity>} updateIdentity
 * @property {(id: string) => Promise<void>} deleteIdentity
 * @property {(capability: IdentityCapability) => boolean} supports
 */

export {};
