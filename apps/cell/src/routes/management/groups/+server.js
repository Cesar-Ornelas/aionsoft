import { json } from '@sveltejs/kit';
import { ensureManagementCollections } from '$lib/server/management-bootstrap.js';
import { getAdminPocketBaseClient } from '$lib/server/pocketbase.js';

function escapeFilter(value) {
  return String(value ?? '').replace(/"/g, '\\"');
}

export async function GET() {
  const client = await getAdminPocketBaseClient();

  async function loadGroups() {
    return client.collection('management_groups').getFullList({ sort: 'name' });
  }

  try {
    await ensureManagementCollections(client);
    const groups = await loadGroups();

    return json(
      groups.map((group) => ({
        id: group.id,
        name: group.name,
        slug: group.slug,
        description: group.description || '',
        status: group.status || 'active',
        created: group.created,
        updated: group.updated
      }))
    );
  } catch {
    try {
      const groups = await loadGroups();
      return json(
        groups.map((group) => ({
          id: group.id,
          name: group.name,
          slug: group.slug,
          description: group.description || '',
          status: group.status || 'active',
          created: group.created,
          updated: group.updated
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
  const slug = String(payload?.slug || '').trim();
  const description = String(payload?.description || '').trim();
  const status = String(payload?.status || 'active').trim() || 'active';

  if (!name || !slug) {
    return json({ ok: false, error: 'Group name and slug are required.' }, { status: 400 });
  }

  const existing = await client.collection('management_groups').getFirstListItem(`slug="${escapeFilter(slug)}"`).catch(() => null);
  if (existing) {
    return json({ ok: false, error: 'A group with that slug already exists.' }, { status: 409 });
  }

  const created = await client.collection('management_groups').create({
    name,
    slug,
    description,
    status
  });

  return json({ ok: true, group: created });
}

export async function PATCH({ request, url }) {
  const client = await getAdminPocketBaseClient();
  await ensureManagementCollections(client);

  const payload = await request.json();
  const id = url.searchParams.get('id') || payload?.id;
  const name = String(payload?.name || '').trim();
  const slug = String(payload?.slug || '').trim();
  const description = String(payload?.description || '').trim();
  const status = String(payload?.status || 'active').trim() || 'active';

  if (!id) {
    return json({ ok: false, error: 'Group id is required.' }, { status: 400 });
  }

  if (!name || !slug) {
    return json({ ok: false, error: 'Group name and slug are required.' }, { status: 400 });
  }

  const existing = await client.collection('management_groups').getOne(id).catch(() => null);
  if (!existing) {
    return json({ ok: false, error: 'Group not found.' }, { status: 404 });
  }

  const slugTaken = await client.collection('management_groups').getFirstListItem(`slug="${escapeFilter(slug)}"`).catch(() => null);
  if (slugTaken && slugTaken.id !== id) {
    return json({ ok: false, error: 'A group with that slug already exists.' }, { status: 409 });
  }

  const updated = await client.collection('management_groups').update(id, {
    name,
    slug,
    description,
    status
  });

  return json({ ok: true, group: updated });
}

export async function DELETE({ url }) {
  const client = await getAdminPocketBaseClient();
  await ensureManagementCollections(client);

  const id = url.searchParams.get('id');
  if (!id) {
    return json({ ok: false, error: 'Group id is required.' }, { status: 400 });
  }

  await client.collection('management_groups').update(id, { status: 'archived' });

  return json({ ok: true, deletedId: id });
}
