import { DataAccessError } from '$lib/management/model/data-access-error.js';

const STATUSES = new Set(['active', 'inactive', 'archived']);

function clean(value) {
  return String(value ?? '').trim();
}

function normalizeStatus(status) {
  return status === undefined ? undefined : clean(status);
}

function validateStatus(status, label) {
  if (status !== undefined && !STATUSES.has(status)) {
    throw new DataAccessError('INVALID_INPUT', `${label} status is invalid.`);
  }
}

function requireName(value, label) {
  const name = clean(value);
  if (!name) throw new DataAccessError('INVALID_INPUT', `${label} name is required.`);
  return name;
}

function requireKey(value, label) {
  const key = clean(value);
  if (!key) throw new DataAccessError('INVALID_INPUT', `${label} key is required.`);
  return key;
}

export function createManagementService(repository) {
  async function getOrFail(method, id, label) {
    const record = await repository[method](clean(id));
    if (!record) throw new DataAccessError('NOT_FOUND', `${label} was not found.`);
    return record;
  }

  async function ensureActive(method, id, label) {
    const record = await getOrFail(method, id, label);
    if (record.status !== 'active') {
      throw new DataAccessError('CONFLICT', `Only active ${label.toLowerCase()} records can be assigned.`);
    }
    return record;
  }

  return {
    async listUsers() { return repository.listUsers(); },
    async getUser(id) { return getOrFail('findUserById', id, 'User'); },
    async createUser(input = {}) {
      const name = requireName(input.name, 'User');
      const email = clean(input.email);
      if (!email) throw new DataAccessError('INVALID_INPUT', 'User email is required.');
      const status = normalizeStatus(input.status) ?? 'active';
      validateStatus(status, 'User');
      return repository.createUser({ name, email, jobTitle: clean(input.jobTitle), providerSubject: clean(input.providerSubject), status });
    },
    async updateUser(id, input = {}) {
      await this.getUser(id);
      const changes = { ...input };
      if (changes.name !== undefined) changes.name = requireName(changes.name, 'User');
      if (changes.email !== undefined) {
        changes.email = clean(changes.email);
        if (!changes.email) throw new DataAccessError('INVALID_INPUT', 'User email is required.');
      }
      if (changes.jobTitle !== undefined) changes.jobTitle = clean(changes.jobTitle);
      if (changes.providerSubject !== undefined) changes.providerSubject = clean(changes.providerSubject);
      if (changes.status !== undefined) {
        changes.status = normalizeStatus(changes.status);
        validateStatus(changes.status, 'User');
      }
      return repository.updateUser(clean(id), changes);
    },

    async listGroups() { return repository.listGroups(); },
    async getGroup(id) { return getOrFail('findGroupById', id, 'Group'); },
    async createGroup(input = {}) {
      const name = requireName(input.name, 'Group');
      const slug = requireKey(input.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), 'Group');
      const status = normalizeStatus(input.status) ?? 'active';
      validateStatus(status, 'Group');
      return repository.createGroup({ name, slug, description: clean(input.description), status });
    },
    async updateGroup(id, input = {}) {
      await this.getGroup(id);
      const changes = { ...input };
      if (changes.name !== undefined) changes.name = requireName(changes.name, 'Group');
      if (changes.slug !== undefined) changes.slug = requireKey(changes.slug, 'Group');
      if (changes.description !== undefined) changes.description = clean(changes.description);
      if (changes.status !== undefined) {
        changes.status = normalizeStatus(changes.status);
        validateStatus(changes.status, 'Group');
      }
      return repository.updateGroup(clean(id), changes);
    },

    async listRoles() { return repository.listRoles(); },
    async getRole(id) { return getOrFail('findRoleById', id, 'Role'); },
    async createRole(input = {}) {
      const name = requireName(input.name, 'Role');
      const key = requireKey(input.key || name.toLowerCase().replace(/[^a-z0-9]+/g, '_'), 'Role');
      const status = normalizeStatus(input.status) ?? 'active';
      validateStatus(status, 'Role');
      return repository.createRole({ name, key, description: clean(input.description), status, permissionKeys: [] });
    },
    async updateRole(id, input = {}) {
      await this.getRole(id);
      const changes = { ...input };
      if (changes.name !== undefined) changes.name = requireName(changes.name, 'Role');
      if (changes.key !== undefined) changes.key = requireKey(changes.key, 'Role');
      if (changes.description !== undefined) changes.description = clean(changes.description);
      if (changes.status !== undefined) {
        changes.status = normalizeStatus(changes.status);
        validateStatus(changes.status, 'Role');
      }
      delete changes.permissionKeys;
      return repository.updateRole(clean(id), changes);
    },

    async listPermissions() { return repository.listPermissions(); },
    async getPermission(id) { return getOrFail('findPermissionById', id, 'Permission'); },
    async createPermission(input = {}) {
      const name = requireName(input.name, 'Permission');
      const key = requireKey(input.key, 'Permission');
      const status = normalizeStatus(input.status) ?? 'active';
      validateStatus(status, 'Permission');
      return repository.createPermission({ name, key, description: clean(input.description), category: clean(input.category), status });
    },
    async updatePermission(id, input = {}) {
      await this.getPermission(id);
      const changes = { ...input };
      if (changes.name !== undefined) changes.name = requireName(changes.name, 'Permission');
      if (changes.key !== undefined) changes.key = requireKey(changes.key, 'Permission');
      if (changes.description !== undefined) changes.description = clean(changes.description);
      if (changes.category !== undefined) changes.category = clean(changes.category);
      if (changes.status !== undefined) {
        changes.status = normalizeStatus(changes.status);
        validateStatus(changes.status, 'Permission');
      }
      return repository.updatePermission(clean(id), changes);
    },

    async assignUserToGroup(userId, groupId) {
      await ensureActive('findUserById', userId, 'User');
      await ensureActive('findGroupById', groupId, 'Group');
      return repository.addUserToGroup(clean(userId), clean(groupId));
    },
    async removeUserFromGroup(userId, groupId) {
      await this.getUser(userId);
      await this.getGroup(groupId);
      return repository.removeUserFromGroup(clean(userId), clean(groupId));
    },
    async assignRoleToGroup(groupId, roleId) {
      await ensureActive('findGroupById', groupId, 'Group');
      await ensureActive('findRoleById', roleId, 'Role');
      return repository.addRoleToGroup(clean(groupId), clean(roleId));
    },
    async removeRoleFromGroup(groupId, roleId) {
      await this.getGroup(groupId);
      await this.getRole(roleId);
      return repository.removeRoleFromGroup(clean(groupId), clean(roleId));
    },
    async assignPermissionToRole(roleId, permissionId) {
      await ensureActive('findRoleById', roleId, 'Role');
      await ensureActive('findPermissionById', permissionId, 'Permission');
      return repository.addPermissionToRole(clean(roleId), clean(permissionId));
    },
    async removePermissionFromRole(roleId, permissionId) {
      await this.getRole(roleId);
      await this.getPermission(permissionId);
      return repository.removePermissionFromRole(clean(roleId), clean(permissionId));
    }
  };
}
