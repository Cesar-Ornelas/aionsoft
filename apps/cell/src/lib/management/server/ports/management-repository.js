/** @typedef {import('../../model/entities.js').ManagementUser} ManagementUser */
/** @typedef {import('../../model/entities.js').ManagementGroup} ManagementGroup */
/** @typedef {import('../../model/entities.js').ManagementRole} ManagementRole */
/** @typedef {import('../../model/entities.js').ManagementPermission} ManagementPermission */
/** @typedef {import('../../model/entities.js').SaveUserInput} SaveUserInput */
/** @typedef {import('../../model/entities.js').SaveGroupInput} SaveGroupInput */
/** @typedef {import('../../model/entities.js').SaveRoleInput} SaveRoleInput */
/** @typedef {import('../../model/entities.js').SavePermissionInput} SavePermissionInput */

/**
 * Provider-neutral persistence needed by the Management workspace.
 * Implementations must normalize records and report stable data-access errors.
 *
 * @typedef {Object} ManagementRepository
 * @property {() => Promise<ManagementUser[]>} listUsers
 * @property {(id: string) => Promise<ManagementUser | null>} findUserById
 * @property {(input: SaveUserInput) => Promise<ManagementUser>} createUser
 * @property {(id: string, input: Partial<SaveUserInput>) => Promise<ManagementUser>} updateUser
 * @property {() => Promise<ManagementGroup[]>} listGroups
 * @property {(id: string) => Promise<ManagementGroup | null>} findGroupById
 * @property {(input: SaveGroupInput) => Promise<ManagementGroup>} createGroup
 * @property {(id: string, input: Partial<SaveGroupInput>) => Promise<ManagementGroup>} updateGroup
 * @property {() => Promise<ManagementRole[]>} listRoles
 * @property {(id: string) => Promise<ManagementRole | null>} findRoleById
 * @property {(input: SaveRoleInput) => Promise<ManagementRole>} createRole
 * @property {(id: string, input: Partial<SaveRoleInput>) => Promise<ManagementRole>} updateRole
 * @property {() => Promise<ManagementPermission[]>} listPermissions
 * @property {(id: string) => Promise<ManagementPermission | null>} findPermissionById
 * @property {(input: SavePermissionInput) => Promise<ManagementPermission>} createPermission
 * @property {(id: string, input: Partial<SavePermissionInput>) => Promise<ManagementPermission>} updatePermission
 * @property {(userId: string, groupId: string) => Promise<void>} addUserToGroup
 * @property {(userId: string, groupId: string) => Promise<void>} removeUserFromGroup
 * @property {(groupId: string, roleId: string) => Promise<void>} addRoleToGroup
 * @property {(groupId: string, roleId: string) => Promise<void>} removeRoleFromGroup
 * @property {(roleId: string, permissionId: string) => Promise<void>} addPermissionToRole
 * @property {(roleId: string, permissionId: string) => Promise<void>} removePermissionFromRole
 */

export {};
