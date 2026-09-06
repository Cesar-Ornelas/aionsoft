import { json } from '@sveltejs/kit';
import { ensureManagementCollections } from '$lib/server/management-bootstrap.js';
import { getAdminPocketBaseClient } from '$lib/server/pocketbase.js';

function escapeFilter(value) {
  return String(value ?? '').replace(/"/g, '\\"');
}

function normalizeStatus(value) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return 'Active';

  const lookup = normalized.toLowerCase();
  if (lookup === 'active' || lookup === 'enabled') return 'Active';
  if (lookup === 'pending') return 'Pending';
  if (lookup === 'inactive' || lookup === 'disabled') return 'Inactive';

  return normalized;
}

function normalizeOptionalString(value) {
  const normalized = String(value ?? '').trim();
  return normalized || undefined;
}

function buildUserRecord(payload = {}, existingUser = null) {
  const name = normalizeOptionalString(payload?.name || existingUser?.name);
  const email = normalizeOptionalString(payload?.email || existingUser?.email);
  const username = normalizeOptionalString(payload?.username ?? existingUser?.username);
  const firstName = normalizeOptionalString(payload?.first_name ?? existingUser?.first_name);
  const lastName = normalizeOptionalString(payload?.last_name ?? existingUser?.last_name);
  const timezone = normalizeOptionalString(payload?.timezone ?? existingUser?.timezone);
  const avatar = payload?.avatar ?? existingUser?.avatar;
  const emailVisibility = payload?.emailVisibility ?? existingUser?.emailVisibility ?? true;
  const verified = payload?.verified ?? existingUser?.verified ?? true;
  const status = normalizeStatus(payload?.status || existingUser?.status || 'Active');

  const record = {
    name,
    email,
    status: status.toLowerCase(),
    emailVisibility,
    verified,
    ...(username ? { username } : {}),
    ...(firstName ? { first_name: firstName } : {}),
    ...(lastName ? { last_name: lastName } : {}),
    ...(timezone ? { timezone } : {}),
    ...(avatar !== undefined && avatar !== null && avatar !== '' ? { avatar } : {})
  };

  return record;
}

export async function GET() {
  const client = await getAdminPocketBaseClient();

  async function loadUsers() {
    return client.collection('users').getFullList();
  }

  try {
    await ensureManagementCollections(client);
    const users = await loadUsers();

    return json(
      users.map((user) => ({
        id: user.id,
        name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unnamed user',
        email: user.email || '',
        username: user.username || '',
        avatar: user.avatar || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        timezone: user.timezone || '',
        emailVisibility: Boolean(user.emailVisibility),
        verified: Boolean(user.verified),
        status: normalizeStatus(user.status),
        created: user.created,
        updated: user.updated
      }))
    );
  } catch {
    try {
      const users = await loadUsers();
      return json(
        users.map((user) => ({
          id: user.id,
          name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unnamed user',
          email: user.email || '',
          username: user.username || '',
          avatar: user.avatar || '',
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          timezone: user.timezone || '',
          emailVisibility: Boolean(user.emailVisibility),
          verified: Boolean(user.verified),
          status: normalizeStatus(user.status),
          created: user.created,
          updated: user.updated
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

  const contentType = request.headers.get('content-type') || '';
  const payload = contentType.includes('multipart/form-data') ? Object.fromEntries((await request.formData()).entries()) : await request.json();

  const name = String(payload?.name || '').trim();
  const email = String(payload?.email || '').trim();
  const status = normalizeStatus(payload?.status || 'Active');
  const password = String(payload?.password || 'Welcome123!').trim();
  const passwordConfirm = String(payload?.passwordConfirm || password).trim();
  const userRecord = buildUserRecord({
    ...payload,
    name,
    email,
    status,
    emailVisibility: payload?.emailVisibility ?? true,
    verified: payload?.verified ?? true
  });

  if (!name || !email) {
    return json({ ok: false, error: 'User name and email are required.' }, { status: 400 });
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return json({ ok: false, error: 'Enter a valid email address.' }, { status: 400 });
  }

  const existingUser = await client.collection('users').getFirstListItem(`email="${escapeFilter(email)}"`).catch(() => null);
  if (existingUser) {
    return json({ ok: false, error: 'A user with that email already exists.' }, { status: 409 });
  }

  if (!password || password.length < 8) {
    return json({ ok: false, error: 'Password must be at least 8 characters.' }, { status: 400 });
  }

  if (password !== passwordConfirm) {
    return json({ ok: false, error: 'Password confirmation does not match.' }, { status: 400 });
  }

  const created = await client.collection('users').create({
    ...userRecord,
    password,
    passwordConfirm,
    status: status.toLowerCase()
  });

  return json({ ok: true, user: { id: created.id, name: created.name, email: created.email, status: normalizeStatus(created.status) } });
}

export async function PATCH({ request, url }) {
  const client = await getAdminPocketBaseClient();
  await ensureManagementCollections(client);

  const contentType = request.headers.get('content-type') || '';
  const payload = contentType.includes('multipart/form-data') ? Object.fromEntries((await request.formData()).entries()) : await request.json();
  const id = url.searchParams.get('id') || payload?.id;
  const name = String(payload?.name || '').trim();
  const email = String(payload?.email || '').trim();
  const status = normalizeStatus(payload?.status || 'Active');
  const userRecord = buildUserRecord({
    ...payload,
    name,
    email,
    status,
    emailVisibility: payload?.emailVisibility ?? true,
    verified: payload?.verified ?? true
  });

  if (!id) {
    return json({ ok: false, error: 'User id is required.' }, { status: 400 });
  }

  if (!name || !email) {
    return json({ ok: false, error: 'User name and email are required.' }, { status: 400 });
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return json({ ok: false, error: 'Enter a valid email address.' }, { status: 400 });
  }

  const existing = await client.collection('users').getOne(id).catch(() => null);
  if (!existing) {
    return json({ ok: false, error: 'User not found.' }, { status: 404 });
  }

  const emailTaken = await client.collection('users').getFirstListItem(`email="${escapeFilter(email)}"`).catch(() => null);
  if (emailTaken && emailTaken.id !== id) {
    return json({ ok: false, error: 'A user with that email already exists.' }, { status: 409 });
  }

  const updated = await client.collection('users').update(id, {
    ...userRecord,
    status: status.toLowerCase()
  });

  return json({ ok: true, user: { id: updated.id, name: updated.name, email: updated.email, status: normalizeStatus(updated.status) } });
}

export async function DELETE({ url }) {
  const client = await getAdminPocketBaseClient();
  await ensureManagementCollections(client);

  const id = url.searchParams.get('id');
  if (!id) {
    return json({ ok: false, error: 'User id is required.' }, { status: 400 });
  }

  await client.collection('users').update(id, { status: 'archived' });

  return json({ ok: true, deletedId: id });
}
