import { json } from '@sveltejs/kit';
import { ensureManagementCollections } from '$lib/server/management-bootstrap.js';
import { getAdminPocketBaseClient } from '$lib/server/pocketbase.js';

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

export async function POST({ request }) {
  const { payload } = await request.json();

  if (!payload || !payload.collection || !Array.isArray(payload.items)) {
    return json({ ok: false, error: 'Invalid migration payload.' }, { status: 400 });
  }

  const client = await getAdminPocketBaseClient();
  await ensureManagementCollections(client);

  const collectionName = payload.collection;
  const existingCollections = await client.collections.getFullList({ batch: 200, sort: 'name' });
  const collectionNames = new Set(existingCollections.map((collection) => collection.name));

  if (!collectionNames.has(collectionName)) {
    return json({ ok: false, error: `Collection not found: ${collectionName}` }, { status: 404 });
  }

  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    items: []
  };

  for (const item of payload.items) {
    const candidateField = getCandidateField(item);
    if (!candidateField) {
      results.skipped += 1;
      results.items.push({ status: 'skipped', reason: 'No stable match field', item });
      continue;
    }

    const candidateValue = normalizeValue(item[candidateField]);
    if (!candidateValue) {
      results.skipped += 1;
      results.items.push({ status: 'skipped', reason: 'Empty match value', item });
      continue;
    }

    const filter = `${candidateField}="${String(candidateValue).replace(/"/g, '\\"')}"`;

    let existing = null;
    try {
      existing = await client.collection(collectionName).getFirstListItem(filter);
    } catch {
      existing = null;
    }

    const nextRecord = { ...item };
    if (item.permissions !== undefined && !Array.isArray(item.permissions)) {
      nextRecord.permissions = item.permissions;
    }

    if (!existing) {
      const created = await client.collection(collectionName).create(nextRecord);
      results.created += 1;
      results.items.push({ status: 'created', id: created.id, item: nextRecord });
      continue;
    }

    const merged = {
      ...existing,
      ...nextRecord,
      id: existing.id
    };

    const changedKeys = Object.keys(nextRecord).filter((key) => {
      const currentValue = existing[key];
      const nextValue = nextRecord[key];
      const sameAsJson = JSON.stringify(currentValue) === JSON.stringify(nextValue);
      return !sameAsJson;
    });

    if (changedKeys.length === 0) {
      results.skipped += 1;
      results.items.push({ status: 'unchanged', id: existing.id, item: nextRecord });
      continue;
    }

    const updated = await client.collection(collectionName).update(existing.id, merged);
    results.updated += 1;
    results.items.push({ status: 'updated', id: updated.id, changed: changedKeys, item: nextRecord });
  }

  return json({ ok: true, ...results });
}
