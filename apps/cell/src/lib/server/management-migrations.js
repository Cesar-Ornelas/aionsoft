export const MANAGEMENT_MIGRATIONS = [
  {
    name: 'management-core-seed',
    version: '001_management_core',
    checksum: 'management-core-seed',
    async run(client) {
      const existingRole = await client.collection('management_roles').getFirstListItem('key="full_access"').catch(() => null);
      if (!existingRole) {
        await client.collection('management_roles').create({
          name: 'Full access',
          key: 'full_access',
          description: 'Default full access role for the management workspace.',
          permissions: JSON.stringify(['*']),
          status: 'active'
        });
      }

      const existingGroup = await client.collection('management_groups').getFirstListItem('slug="administrators"').catch(() => null);
      if (!existingGroup) {
        await client.collection('management_groups').create({
          name: 'Administrators',
          slug: 'administrators',
          description: 'Default administrators group.',
          status: 'active'
        });
      }
    }
  },
  {
    name: 'management-normalize-role-permissions',
    version: '002_management_role_permissions',
    checksum: 'management-normalize-role-permissions',
    async run(client) {
      const roles = await client.collection('management_roles').getFullList({ batch: 200 });
      const permissions = await client.collection('management_permissions').getFullList({ batch: 200 });
      const permissionByKey = new Map(permissions.map((permission) => [permission.key, permission]));

      for (const permission of permissions) {
        if (!permission.status) await client.collection('management_permissions').update(permission.id, { status: 'active' });
      }

      for (const role of roles) {
        if (!role.status) await client.collection('management_roles').update(role.id, { status: 'active' });
        let legacyKeys = [];
        try {
          legacyKeys = Array.isArray(role.permissions)
            ? role.permissions
            : JSON.parse(role.permissions || '[]');
        } catch {
          legacyKeys = [];
        }

        for (const key of legacyKeys.filter((value) => typeof value === 'string' && value)) {
          let permission = permissionByKey.get(key);
          if (!permission) {
            permission = await client.collection('management_permissions').create({
              name: key === '*' ? 'All permissions' : key,
              key,
              description: key === '*' ? 'Legacy wildcard permission.' : 'Migrated from a legacy role assignment.',
              status: 'active'
            });
            permissionByKey.set(key, permission);
          }

          const existing = await client.collection('management_role_permissions')
            .getFirstListItem(`role="${role.id}" && permission="${permission.id}"`)
            .catch(() => null);
          if (!existing) {
            await client.collection('management_role_permissions').create({ role: role.id, permission: permission.id });
          }
        }
      }
    }
  }
];
