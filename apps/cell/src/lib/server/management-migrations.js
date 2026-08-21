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
          permissions: JSON.stringify(['*'])
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
  }
];
