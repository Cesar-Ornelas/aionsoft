import { env } from '$env/dynamic/private';
import { createPocketBaseClient, getAdminPocketBaseClient } from './pocketbase.js';
import { MANAGEMENT_MIGRATIONS } from './management-migrations.js';
import {
  MANAGEMENT_COLLECTION_DEFINITIONS,
  createNormalizedSchema,
  getCollectionFields,
  mergeCollectionSchema
} from '$lib/management/definitions.js';

export async function ensureManagementCollections(client = createPocketBaseClient(), definitions = MANAGEMENT_COLLECTION_DEFINITIONS) {
  const existingCollections = await client.collections.getFullList({ batch: 200, sort: 'name' });
  const collectionMap = new Map(existingCollections.map((collection) => [collection.name, collection]));
  const collectionIdMap = new Map(existingCollections.map((collection) => [collection.name, collection.id]));

  for (const definition of definitions) {
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

    let created;
    try {
      created = await client.collections.create({
        name: definition.name,
        type: definition.type,
        fields: createNormalizedSchema(definition, collectionIdMap)
      });
    } catch (error) {
      const details = error?.response?.data || error?.data;
      const detailMessage = details && typeof details === 'object'
        ? Object.entries(details).map(([field, value]) => `${field}: ${value?.message || JSON.stringify(value)}`).join('; ')
        : error?.message;
      throw new Error(`Unable to create management collection ${definition.name}: ${detailMessage || 'unknown PocketBase error.'}`, { cause: error });
    }

    collectionMap.set(definition.name, created);
    collectionIdMap.set(definition.name, created.id);

    console.log(`Created management collection: ${created.name}`);
  }
}

export async function ensureManagementFormCollections(client = createPocketBaseClient()) {
  const formDefinitions = MANAGEMENT_COLLECTION_DEFINITIONS.filter((definition) => (
    definition.name === 'management_forms' || definition.name === 'management_form_versions'
  ));
  await ensureManagementCollections(client, formDefinitions.filter((definition) => definition.name === 'management_forms'));
  return ensureManagementCollections(client, formDefinitions.filter((definition) => definition.name === 'management_form_versions'));
}

export async function ensureDocumentCollections(client = createPocketBaseClient()) {
  const documentDefinitions = MANAGEMENT_COLLECTION_DEFINITIONS.filter((definition) => definition.name.startsWith('documents'));
  await ensureManagementCollections(client, MANAGEMENT_COLLECTION_DEFINITIONS.filter((definition) => definition.name === 'resources'));
  await ensureManagementCollections(client, documentDefinitions.filter((definition) => definition.name === 'documents_templates'));
  await ensureManagementCollections(client, documentDefinitions.filter((definition) => definition.name === 'documents_template_versions'));
  await ensureManagementCollections(client, documentDefinitions.filter((definition) => definition.name === 'documents'));
  await ensureManagementCollections(client, documentDefinitions.filter((definition) => definition.name === 'documents_review_comments'));
  await ensureManagementCollections(client, documentDefinitions.filter((definition) => definition.name === 'documents_review_comment_votes'));
  return backfillDocumentOwnedForms(client);
}

async function backfillDocumentOwnedForms(client) {
  const templates = client.collection('documents_templates');
  const forms = client.collection('management_forms');
  const formVersions = client.collection('management_form_versions');
  const versions = client.collection('documents_template_versions');
  const records = await templates.getFullList({ sort: 'name' });

  for (const template of records) {
    if (template.form_id) continue;
    const latestVersion = (await versions.getFullList({
      filter: client.filter('template = {:template}', { template: template.id }),
      sort: '-version_number',
      perPage: 1
    }))[0];
    let schema = { fields: [] };
    if (latestVersion?.form_version) {
      try {
        const source = await formVersions.getOne(latestVersion.form_version);
        schema = typeof source.schema === 'string' ? JSON.parse(source.schema) : source.schema || schema;
      } catch {
        schema = { fields: [] };
      }
    }

    const form = await forms.create({
      name: `${template.name} fields`,
      description: template.description || '',
      category: 'document',
      status: 'draft'
    });
    await formVersions.create({
      form: form.id,
      version_number: 1,
      schema,
      is_published: false,
      status: 'draft',
      created_at: new Date().toISOString()
    });
    await templates.update(template.id, { form_id: form.id });
    console.log(`Backfilled owned form for document template: ${template.name}`);
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
