import { json } from '@sveltejs/kit';
import {
  MANAGEMENT_COLLECTION_DEFINITIONS,
  createNormalizedSchema,
  mergeCollectionSchema
} from '$lib/management/definitions.js';
import { ensureManagementCollections } from '$lib/server/management-bootstrap.js';
import { getAdminPocketBaseClient } from '$lib/server/pocketbase.js';
import { MANAGEMENT_MIGRATIONS } from '$lib/server/management-migrations.js';

function getCandidateField(record) {
  if (!record || typeof record !== 'object') return null;

  if ('key' in record && record.key) return 'key';
  if ('slug' in record && record.slug) return 'slug';
  if ('name' in record && record.name) return 'name';
  return null;
}

function normalizeValue(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') return value.trim();
  return value;
}

function buildMigrationPayload() {
  return {
    collection: 'management_migrations',
    operation: 'ensure_management_collections',
    items: MANAGEMENT_COLLECTION_DEFINITIONS.map((definition) => ({
      name: definition.name,
      type: definition.type,
      fields: createNormalizedSchema({ name: definition.name, schema: definition.schema }),
      operation: 'ensure_collection'
    }))
  };
}

export async function GET() {
  const client = await getAdminPocketBaseClient();
  await ensureManagementCollections(client);

  let appliedRecords = [];
  try {
    appliedRecords = await client.collection('management_migrations').getFullList({ sort: 'version' });
  } catch {
    appliedRecords = [];
  }

  const appliedMap = new Map(appliedRecords.map((record) => [record.version, record]));

  const migrations = MANAGEMENT_MIGRATIONS.map((migration) => {
    const record = appliedMap.get(migration.version);
    return {
      id: record?.id ?? null,
      name: migration.name,
      version: migration.version,
      status: record ? (record.status || 'applied') : 'pending',
      applied_at: record?.applied_at ?? null,
      checksum: migration.checksum,
      payload: buildMigrationPayload()
    };
  });

  return json({ ok: true, migrations });
}

export async function POST({ request }) {
  const { payload } = await request.json();

  if (!payload || !payload.collection || !Array.isArray(payload.items)) {
    return json({ ok: false, error: 'Invalid migration payload.' }, { status: 400 });
  }

  const client = await getAdminPocketBaseClient();
  await ensureManagementCollections(client);

  const existingCollections = await client.collections.getFullList({ batch: 200, sort: 'name' });
  const collectionMap = new Map(existingCollections.map((collection) => [collection.name, collection]));
  const collectionIdMap = new Map(existingCollections.map((collection) => [collection.name, collection.id]));

  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    items: []
  };

  for (const item of payload.items) {
    const collectionName = item?.name;
    if (!collectionName || typeof collectionName !== 'string') {
      results.skipped += 1;
      results.items.push({ status: 'skipped', reason: 'Missing collection name', item });
      continue;
    }

    const existingCollection = collectionMap.get(collectionName);
    const normalizedFields = Array.isArray(item.fields)
      ? item.fields.map((field) => ({
          ...field,
          type: field.type === 'relation' ? 'text' : field.type,
          hidden: false,
          presentable: !!field.required
        }))
      : [];

    if (!existingCollection) {
      const created = await client.collections.create({
        name: collectionName,
        type: item.type || 'base',
        fields: normalizedFields
      });
      results.created += 1;
      results.items.push({ status: 'created', collection: collectionName, id: created.id, item });
      continue;
    }

    const mergedSchema = mergeCollectionSchema(existingCollection, { name: collectionName, type: item.type || 'base', schema: normalizedFields }, collectionIdMap);
    const currentFields = (existingCollection.fields ?? []).filter((field) => !field?.system);
    const schemaDiffers = JSON.stringify(currentFields) !== JSON.stringify(mergedSchema);

    if (!schemaDiffers) {
      results.skipped += 1;
      results.items.push({ status: 'unchanged', collection: collectionName, id: existingCollection.id, item });
      continue;
    }

    const updated = await client.collections.update(existingCollection.id, {
      name: collectionName,
      type: item.type || 'base',
      fields: mergedSchema.filter((field) => !field?.system)
    });

    results.updated += 1;
    results.items.push({ status: 'updated', collection: collectionName, id: updated.id, item });
  }

  try {
    await client.collection('management_migrations').create({
      name: 'management-core-seed',
      version: '001_management_core',
      status: 'applied',
      checksum: 'management-core-seed',
      applied_at: new Date().toISOString(),
      notes: 'Applied via migrations UI.'
    });
  } catch {
    // ignore duplicate or stale reads; the migration can remain pending if the write fails
  }

  return json({ ok: true, ...results });
}
