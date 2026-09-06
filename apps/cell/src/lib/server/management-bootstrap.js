import { env } from '$env/dynamic/private';
import { createPocketBaseClient, getAdminPocketBaseClient } from './pocketbase.js';
import { MANAGEMENT_MIGRATIONS } from './management-migrations.js';
import {
  MANAGEMENT_COLLECTION_DEFINITIONS,
  createNormalizedSchema,
  getCollectionFields,
  mergeCollectionSchema
} from '$lib/management/definitions.js';

export async function ensureManagementCollections(client = createPocketBaseClient()) {
  const existingCollections = await client.collections.getFullList({ batch: 200, sort: 'name' });
  const collectionMap = new Map(existingCollections.map((collection) => [collection.name, collection]));
  const collectionIdMap = new Map(existingCollections.map((collection) => [collection.name, collection.id]));

  for (const definition of MANAGEMENT_COLLECTION_DEFINITIONS) {
    const existingCollection = collectionMap.get(definition.name);

    if (existingCollection) {
      const mergedSchema = mergeCollectionSchema(existingCollection, definition, collectionIdMap);
      const existingFields = getCollectionFields(existingCollection, definition);
      const schemaDiffers = JSON.stringify(existingFields) !== JSON.stringify(mergedSchema);

      if (schemaDiffers) {
        const updated = await client.collections.update(existingCollection.id, {
          name: definition.name,
          type: definition.type,
          fields: mergedSchema.filter((field) => !field?.system)
        });

        console.log(`Updated management collection schema: ${updated.name}`);
      } else {
        console.log(`Management collection already matches schema: ${definition.name}`);
      }

      continue;
    }

    const created = await client.collections.create({
      name: definition.name,
      type: definition.type,
      fields: createNormalizedSchema(definition, collectionIdMap)
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
    const existing = await client.collection('users').getFirstListItem(`email="${email}"`);
    if (existing) {
      console.log(`Management default user already exists: ${email}`);
      return { created: false, skipped: true, userId: existing.id };
    }
  } catch {
    // user not found
  }

  const created = await client.collection('users').create({
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
