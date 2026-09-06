import { json } from '@sveltejs/kit';
import { ensureManagementCollections } from '$lib/server/management-bootstrap.js';
import { getAdminPocketBaseClient } from '$lib/server/pocketbase.js';

function escapeFilter(value) {
  return String(value ?? '').replace(/"/g, '\\"');
}

export async function GET() {
  const client = await getAdminPocketBaseClient();

  async function loadPermissions() {
    return client.collection('management_permissions').getFullList({ sort: 'name' });
  }

  try {
    await ensureManagementCollections(client);
    const permissions = await loadPermissions();

    return json(
      permissions.map((permission) => ({
        id: permission.id,
        name: permission.name,
        key: permission.key,
        description: permission.description || '',
        category: permission.category || '',
        created: permission.created,
        updated: permission.updated
      }))
    );
  } catch {
    try {
      const permissions = await loadPermissions();
      return json(
        permissions.map((permission) => ({
          id: permission.id,
          name: permission.name,
          key: permission.key,
          description: permission.description || '',
          category: permission.category || '',
          created: permission.created,
          updated: permission.updated
        }))
      );
    } catch {
      return json([]);
    }
  }
}

export async function POST({ request }) {
  const client = await getAdminPocketBaseClient();
  await ensureManagementCollections(client);

  const payload = await request.json();
  const name = String(payload?.name || '').trim();
  const key = String(payload?.key || '').trim();
  const description = String(payload?.description || '').trim();
  const category = String(payload?.category || '').trim();
  const status = String(payload?.status || 'active').trim();

  if (!name || !key) {
    return json({ ok: false, error: 'Permission name and key are required.' }, { status: 400 });
  }

  const existing = await client.collection('management_permissions').getFirstListItem(`key="${escapeFilter(key)}"`).catch(() => null);
  if (existing) {
    return json({ ok: false, error: 'A permission with that key already exists.' }, { status: 409 });
  }

  const created = await client.collection('management_permissions').create({
    name,
    key,
    description,
    category,
    status
  });

  return json({ ok: true, permission: created });
}

export async function PATCH({ request, url }) {
  const client = await getAdminPocketBaseClient();
  await ensureManagementCollections(client);

  const payload = await request.json();
  const id = url.searchParams.get('id') || payload?.id;
  const name = String(payload?.name || '').trim();
  const key = String(payload?.key || '').trim();
  const description = String(payload?.description || '').trim();
  const category = String(payload?.category || '').trim();

  if (!id) {
    return json({ ok: false, error: 'Permission id is required.' }, { status: 400 });
  }

  if (!name || !key) {
    return json({ ok: false, error: 'Permission name and key are required.' }, { status: 400 });
  }

  const existing = await client.collection('management_permissions').getOne(id).catch(() => null);
  if (!existing) {
    return json({ ok: false, error: 'Permission not found.' }, { status: 404 });
  }

  const keyTaken = await client.collection('management_permissions').getFirstListItem(`key="${escapeFilter(key)}"`).catch(() => null);
  if (keyTaken && keyTaken.id !== id) {
    return json({ ok: false, error: 'A permission with that key already exists.' }, { status: 409 });
  }

  const updated = await client.collection('management_permissions').update(id, {
    name,
    key,
    description,
    category,
    status: String(payload?.status || existing.status || 'active').trim()
  });

  return json({ ok: true, permission: updated });
}

export async function DELETE({ url }) {
  const client = await getAdminPocketBaseClient();
  await ensureManagementCollections(client);

  const id = url.searchParams.get('id');
  if (!id) {
    return json({ ok: false, error: 'Permission id is required.' }, { status: 400 });
  }

  await client.collection('management_permissions').update(id, { status: 'archived' });

  return json({ ok: true, deletedId: id });
}
