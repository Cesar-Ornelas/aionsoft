import { expect, test, describe } from 'bun:test';
import { DataAccessError } from '$lib/management/model/data-access-error.js';
import { createManagementService } from '$lib/management/server/services/management-service.js';

function createRepository() {
  const records = {
    users: [],
    groups: [],
    roles: [],
    permissions: [],
    userGroups: new Set(),
    groupRoles: new Set(),
    rolePermissions: new Set()
  };
  let nextId = 1;
  const create = (collection, input) => {
    const record = { id: String(nextId++), ...input };
    records[collection].push(record);
    return record;
  };
  const find = (collection, id) => records[collection].find((record) => record.id === id) ?? null;
  const update = (collection, id, input) => {
    const record = find(collection, id);
    Object.assign(record, input);
    return record;
  };
  const add = (set, left, right) => {
    const key = `${left}:${right}`;
    if (set.has(key)) throw new DataAccessError('CONFLICT', 'Assignment already exists.');
    set.add(key);
  };
  const remove = (set, left, right) => set.delete(`${left}:${right}`);

  return {
    records,
    listUsers: async () => records.users,
    findUserById: async (id) => find('users', id),
    createUser: async (input) => create('users', input),
    updateUser: async (id, input) => update('users', id, input),
    listGroups: async () => records.groups,
    findGroupById: async (id) => find('groups', id),
    createGroup: async (input) => create('groups', input),
    updateGroup: async (id, input) => update('groups', id, input),
    listRoles: async () => records.roles,
    findRoleById: async (id) => find('roles', id),
    createRole: async (input) => create('roles', input),
    updateRole: async (id, input) => update('roles', id, input),
    listPermissions: async () => records.permissions,
    findPermissionById: async (id) => find('permissions', id),
    createPermission: async (input) => create('permissions', input),
    updatePermission: async (id, input) => update('permissions', id, input),
    addUserToGroup: async (userId, groupId) => add(records.userGroups, userId, groupId),
    removeUserFromGroup: async (userId, groupId) => remove(records.userGroups, userId, groupId),
    addRoleToGroup: async (groupId, roleId) => add(records.groupRoles, groupId, roleId),
    removeRoleFromGroup: async (groupId, roleId) => remove(records.groupRoles, groupId, roleId),
    addPermissionToRole: async (roleId, permissionId) => add(records.rolePermissions, roleId, permissionId),
    removePermissionFromRole: async (roleId, permissionId) => remove(records.rolePermissions, roleId, permissionId)
  };
}

describe('management service', () => {
  test('creates provider-neutral users with active state', async () => {
    const repository = createRepository();
    const service = createManagementService(repository);

    const user = await service.createUser({ name: 'Ada Lovelace', email: 'ada@example.com', jobTitle: 'Operator' });

    expect(user).toMatchObject({ name: 'Ada Lovelace', email: 'ada@example.com', jobTitle: 'Operator', status: 'active' });
  });

  test('supports many-to-many user, group, role, and permission assignments', async () => {
    const repository = createRepository();
    const service = createManagementService(repository);
    const user = await service.createUser({ name: 'Ada', email: 'ada@example.com' });
    const group = await service.createGroup({ name: 'Operations' });
    const secondGroup = await service.createGroup({ name: 'Support' });
    const role = await service.createRole({ name: 'Account manager' });
    const permission = await service.createPermission({ name: 'Read accounts', key: 'read:accounts' });

    await service.assignUserToGroup(user.id, group.id);
    await service.assignUserToGroup(user.id, secondGroup.id);
    await service.assignRoleToGroup(group.id, role.id);
    await service.assignPermissionToRole(role.id, permission.id);

    expect(repository.records.userGroups).toEqual(new Set([`${user.id}:${group.id}`, `${user.id}:${secondGroup.id}`]));
    expect(repository.records.groupRoles).toEqual(new Set([`${group.id}:${role.id}`]));
    expect(repository.records.rolePermissions).toEqual(new Set([`${role.id}:${permission.id}`]));
  });

  test('rejects assignments to inactive records', async () => {
    const repository = createRepository();
    const service = createManagementService(repository);
    const user = await service.createUser({ name: 'Ada', email: 'ada@example.com' });
    const group = await service.createGroup({ name: 'Disabled', status: 'inactive' });

    await expect(service.assignUserToGroup(user.id, group.id)).rejects.toMatchObject({ code: 'conflict' });
  });

  test('preserves relationships when records are archived', async () => {
    const repository = createRepository();
    const service = createManagementService(repository);
    const role = await service.createRole({ name: 'Account manager' });
    const permission = await service.createPermission({ name: 'Read accounts', key: 'read:accounts' });

    await service.assignPermissionToRole(role.id, permission.id);
    await service.updateRole(role.id, { status: 'archived' });

    expect(repository.records.rolePermissions).toContain(`${role.id}:${permission.id}`);
    expect((await service.getRole(role.id)).status).toBe('archived');
  });

  test('rejects duplicate assignments through the repository contract', async () => {
    const repository = createRepository();
    const service = createManagementService(repository);
    const role = await service.createRole({ name: 'Account manager' });
    const permission = await service.createPermission({ name: 'Read accounts', key: 'read:accounts' });

    await service.assignPermissionToRole(role.id, permission.id);
    await expect(service.assignPermissionToRole(role.id, permission.id)).rejects.toMatchObject({ code: 'conflict' });
  });
});
