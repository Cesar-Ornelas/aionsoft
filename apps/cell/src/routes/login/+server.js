import { json } from '@sveltejs/kit';
import { createPocketBaseClient } from '$lib/server/pocketbase.js';
import { publicUser, SESSION_COOKIE } from '$lib/server/session.js';

export async function POST({ request, cookies, url }) {
  try {
    const { email, password } = await request.json();
    const client = createPocketBaseClient();
    const auth = await client.collection('users').authWithPassword(String(email || '').trim(), String(password || ''));
    cookies.set(SESSION_COOKIE, client.authStore.token, { path: '/', httpOnly: true, sameSite: 'lax', secure: url.protocol === 'https:', maxAge: 60 * 60 * 24 * 7 });
    return json({ user: publicUser(auth.record) });
  } catch {
    return json({ error: 'Unable to sign in with those credentials.' }, { status: 401 });
  }
}

export async function DELETE({ cookies }) {
  cookies.delete(SESSION_COOKIE, { path: '/' });
  return json({ signedOut: true });
}
