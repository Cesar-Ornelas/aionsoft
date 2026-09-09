import { createPocketBaseClient } from './pocketbase.js';

export const SESSION_COOKIE = 'cell_session';

export function publicUser(record) {
  if (!record) return null;
  return {
    id: record.id,
    name: record.name || record.username || record.email || record.id,
    email: record.email || '',
    username: record.username || '',
    first_name: record.first_name || '',
    last_name: record.last_name || '',
    timezone: record.timezone || '',
    avatar: record.avatar || '',
    verified: Boolean(record.verified),
    status: record.status || 'active'
  };
}

export async function resolveSession(token) {
  if (!token) return null;
  const client = createPocketBaseClient();
  client.authStore.save(token);
  try {
    const record = await client.collection('users').authRefresh();
    return publicUser(record.record);
  } catch {
    return null;
  }
}
