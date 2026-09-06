/** @typedef {import('../../model/entities.js').ManagementGroup} ManagementGroup */
/** @typedef {import('../../model/entities.js').ManagementPermission} ManagementPermission */
/** @typedef {import('../../model/entities.js').ManagementRole} ManagementRole */
/** @typedef {import('../../model/entities.js').SaveGroupInput} SaveGroupInput */
/** @typedef {import('../../model/entities.js').SavePermissionInput} SavePermissionInput */
/** @typedef {import('../../model/entities.js').SaveRoleInput} SaveRoleInput */

/**
 * Provider-neutral persistence required by Management authorization workflows.
 * Implementations must return normalized domain records and stable data-access errors.
 *
 * @typedef {Object} AuthorizationRepository
 * @property {() => Promise<ManagementGroup[]>} listGroups
 * @property {(id: string) => Promise<ManagementGroup | null>} findGroupById
 * @property {(slug: string) => Promise<ManagementGroup | null>} findGroupBySlug
 * @property {(input: SaveGroupInput) => Promise<ManagementGroup>} createGroup
 * @property {(id: string, input: SaveGroupInput) => Promise<ManagementGroup>} updateGroup
 * @property {(id: string) => Promise<void>} deleteGroup
 * @property {() => Promise<ManagementPermission[]>} listPermissions
 * @property {(id: string) => Promise<ManagementPermission | null>} findPermissionById
 * @property {(key: string) => Promise<ManagementPermission | null>} findPermissionByKey
 * @property {(input: SavePermissionInput) => Promise<ManagementPermission>} createPermission
 * @property {(id: string, input: SavePermissionInput) => Promise<ManagementPermission>} updatePermission
 * @property {(id: string) => Promise<void>} deletePermission
 * @property {() => Promise<ManagementRole[]>} listRoles
 * @property {(id: string) => Promise<ManagementRole | null>} findRoleById
 * @property {(key: string) => Promise<ManagementRole | null>} findRoleByKey
 * @property {(input: SaveRoleInput) => Promise<ManagementRole>} createRole
 * @property {(id: string, input: SaveRoleInput) => Promise<ManagementRole>} updateRole
 * @property {(id: string) => Promise<void>} deleteRole
 */

export {};
