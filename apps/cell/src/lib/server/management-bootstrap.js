import { env } from '$env/dynamic/private';
import { createPocketBaseClient, getAdminPocketBaseClient } from './pocketbase.js';
import { MANAGEMENT_MIGRATIONS } from './management-migrations.js';

const MANAGEMENT_COLLECTION_DEFINITIONS = [
  {
    name: 'management_users',
    type: 'auth',
    schema: [
      { name: 'name', type: 'text', required: true },
      { name: 'status', type: 'select', options: { values: ['active', 'disabled', 'pending'] }, required: true },
      { name: 'first_name', type: 'text' },
      { name: 'last_name', type: 'text' },
      { name: 'timezone', type: 'text' },
      { name: 'last_login_at', type: 'date' }
    ]
  },
  {
    name: 'management_groups',
    type: 'base',
    schema: [
      { name: 'name', type: 'text', required: true },
      { name: 'slug', type: 'text', required: true },
      { name: 'description', type: 'text' },
      { name: 'status', type: 'select', options: { values: ['active', 'archived'] }, required: true }
    ]
  },
  {
    name: 'management_roles',
    type: 'base',
    schema: [
      { name: 'name', type: 'text', required: true },
      { name: 'key', type: 'text', required: true },
      { name: 'description', type: 'text' },
      { name: 'permissions', type: 'json' }
    ]
  },
  {
    name: 'management_user_groups',
    type: 'base',
    schema: [
      { name: 'user', type: 'relation', options: { collectionId: 'management_users', cascadeDelete: true }, required: true },
      { name: 'group', type: 'relation', options: { collectionId: 'management_groups', cascadeDelete: true }, required: true }
    ]
  },
  {
    name: 'management_group_roles',
    type: 'base',
    schema: [
      { name: 'group', type: 'relation', options: { collectionId: 'management_groups', cascadeDelete: true }, required: true },
      { name: 'role', type: 'relation', options: { collectionId: 'management_roles', cascadeDelete: true }, required: true }
    ]
  },
  {
    name: 'management_migrations',
    type: 'base',
    schema: [
      { name: 'name', type: 'text', required: true },
      { name: 'version', type: 'text', required: true },
      { name: 'status', type: 'select', options: { values: ['pending', 'applied', 'failed'] }, required: true },
      { name: 'checksum', type: 'text' },
      { name: 'applied_at', type: 'date' },
      { name: 'notes', type: 'text' }
    ]
  }
];

function normalizeSchemaField(field) {
  return {
    name: field.name,
    type: field.type,
    required: Boolean(field.required),
    unique: Boolean(field.unique),
    options: field.options ?? undefined,
    presentable: Boolean(field.required),
    hidden: false
  };
}

export async function ensureManagementCollections(client = createPocketBaseClient()) {
  const existingCollections = await client.collections.getFullList({ batch: 200, sort: 'name' });
  const collectionMap = new Map(existingCollections.map((collection) => [collection.name, collection]));

  for (const definition of MANAGEMENT_COLLECTION_DEFINITIONS) {
    if (collectionMap.has(definition.name)) {
      console.log(`Management collection exists: ${definition.name}`);
      continue;
    }

    const created = await client.collections.create({
      name: definition.name,
      type: definition.type,
      schema: definition.schema.map(normalizeSchemaField)
    });

    console.log(`Created management collection: ${created.name}`);
  }
}

export async function seedManagementDefaultUser(client = createPocketBaseClient()) {
  const email = env.MANAGEMENT_DEFAULT_ADMIN_EMAIL || env.PB_ADMIN_EMAIL || 'admin@aionsoft.local';
  const password = env.MANAGEMENT_DEFAULT_ADMIN_PASSWORD || env.PB_ADMIN_PASSWORD || 'admin123456';
  const name = env.MANAGEMENT_DEFAULT_ADMIN_NAME || 'Aionsoft Management Admin';

  if (!email || !password) {
    console.log('Skipping management default user seed because credentials are not configured.');
    return { created: false, skipped: true };
  }

  try {
    const existing = await client.collection('management_users').getFirstListItem(`email="${email}"`);
    if (existing) {
      console.log(`Management default user already exists: ${email}`);
      return { created: false, skipped: true, userId: existing.id };
    }
  } catch {
    // user not found
  }

  const created = await client.collection('management_users').create({
    email,
    password,
    passwordConfirm: password,
    name,
    emailVisibility: true,
    verified: true,
    status: 'active',
    first_name: 'Aionsoft',
    last_name: 'Admin'
  });

  console.log(`Created management default user: ${email}`);
  return { created: true, userId: created.id };
}

export async function runPendingManagementMigrations(client = createPocketBaseClient()) {
  await ensureManagementCollections(client);

  let migrationRecords = [];
  try {
    migrationRecords = await client.collection('management_migrations').getFullList({ sort: 'version' });
  } catch {
    migrationRecords = [];
  }

  const appliedMap = new Map(migrationRecords.map((record) => [record.version, record]));

  for (const migration of MANAGEMENT_MIGRATIONS) {
    const alreadyApplied = appliedMap.has(migration.version);
    if (alreadyApplied) {
      console.log(`Management migration already applied: ${migration.version}`);
      continue;
    }

    try {
      await migration.run(client);
      const created = await client.collection('management_migrations').create({
        name: migration.name,
        version: migration.version,
        status: 'applied',
        checksum: migration.checksum,
        applied_at: new Date().toISOString(),
        notes: 'Applied by management bootstrap.'
      });

      console.log(`Applied management migration: ${created.version}`);
    } catch (error) {
      await client.collection('management_migrations').create({
        name: migration.name,
        version: migration.version,
        status: 'failed',
        checksum: migration.checksum,
        applied_at: new Date().toISOString(),
        notes: error?.message || 'Migration failed.'
      });

      throw error;
    }
  }

  return {
    ok: true,
    applied: MANAGEMENT_MIGRATIONS.filter((migration) => !appliedMap.has(migration.version)).length
  };
}

export async function bootstrapManagement() {
  const adminClient = await getAdminPocketBaseClient();
  await ensureManagementCollections(adminClient);
  await seedManagementDefaultUser(adminClient);
  await runPendingManagementMigrations(adminClient);

  return {
    ok: true,
    message: 'Management feature bootstrap completed successfully.'
  };
}
