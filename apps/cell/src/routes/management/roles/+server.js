import { json } from '@sveltejs/kit';
import { ensureManagementCollections } from '$lib/server/management-bootstrap.js';
import { getAdminPocketBaseClient } from '$lib/server/pocketbase.js';

function escapeFilter(value) {
  return String(value ?? '').replace(/"/g, '\\"');
}

function normalizePermissions(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export async function GET() {
  const client = await getAdminPocketBaseClient();

  async function loadRoles() {
    return client.collection('management_roles').getFullList({ sort: 'name' });
  }

  try {
    await ensureManagementCollections(client);
    const roles = await loadRoles();

    return json(
      roles.map((role) => ({
        id: role.id,
        name: role.name,
        key: role.key,
        description: role.description || '',
        permissions: Array.isArray(role.permissions)
          ? role.permissions
          : typeof role.permissions === 'string'
            ? (() => {
                try {
                  return JSON.parse(role.permissions);
                } catch {
                  return [];
                }
              })()
            : [],
        created: role.created,
        updated: role.updated
      }))
    );
  } catch {
    try {
      const roles = await loadRoles();
      return json(
        roles.map((role) => ({
          id: role.id,
          name: role.name,
          key: role.key,
          description: role.description || '',
          permissions: Array.isArray(role.permissions)
            ? role.permissions
            : typeof role.permissions === 'string'
              ? (() => {
                  try {
                    return JSON.parse(role.permissions);
                  } catch {
                    return [];
                  }
                })()
              : [],
          created: role.created,
          updated: role.updated
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
  const permissions = normalizePermissions(payload?.permissions);
  const status = String(payload?.status || 'active').trim();

  if (!name || !key) {
    return json({ ok: false, error: 'Role name and key are required.' }, { status: 400 });
  }

  const existing = await client.collection('management_roles').getFirstListItem(`key="${escapeFilter(key)}"`).catch(() => null);
  if (existing) {
    return json({ ok: false, error: 'A role with that key already exists.' }, { status: 409 });
  }

  const created = await client.collection('management_roles').create({
    name,
    key,
    description,
    permissions,
    status
  });

  return json({ ok: true, role: created });
}

export async function PATCH({ request, url }) {
  const client = await getAdminPocketBaseClient();
  await ensureManagementCollections(client);

  const payload = await request.json();
  const id = url.searchParams.get('id') || payload?.id;
  const name = String(payload?.name || '').trim();
  const key = String(payload?.key || '').trim();
  const description = String(payload?.description || '').trim();
  const permissions = normalizePermissions(payload?.permissions);

  if (!id) {
    return json({ ok: false, error: 'Role id is required.' }, { status: 400 });
  }

  if (!name || !key) {
    return json({ ok: false, error: 'Role name and key are required.' }, { status: 400 });
  }

  const existing = await client.collection('management_roles').getOne(id).catch(() => null);
  if (!existing) {
    return json({ ok: false, error: 'Role not found.' }, { status: 404 });
  }

  const keyTaken = await client.collection('management_roles').getFirstListItem(`key="${escapeFilter(key)}"`).catch(() => null);
  if (keyTaken && keyTaken.id !== id) {
    return json({ ok: false, error: 'A role with that key already exists.' }, { status: 409 });
  }

  const updated = await client.collection('management_roles').update(id, {
    name,
    key,
    description,
    permissions,
    status: String(payload?.status || existing.status || 'active').trim()
  });

  return json({ ok: true, role: updated });
}

export async function DELETE({ url }) {
  const client = await getAdminPocketBaseClient();
  await ensureManagementCollections(client);

  const id = url.searchParams.get('id');
  if (!id) {
    return json({ ok: false, error: 'Role id is required.' }, { status: 400 });
  }

  await client.collection('management_roles').update(id, { status: 'archived' });

  return json({ ok: true, deletedId: id });
}
