import { redirect } from '@sveltejs/kit';
import { resolveSession, SESSION_COOKIE } from '$lib/server/session.js';

const publicPaths = ['/login', '/setup'];

function isPublicPath(pathname) {
  return publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function handle({ event, resolve }) {
  event.locals.user = await resolveSession(event.cookies.get(SESSION_COOKIE));

  if (!event.locals.user && event.route.id && !isPublicPath(event.url.pathname)) {
    if (event.request.method === 'GET' && event.request.headers.get('accept')?.includes('text/html')) {
      const redirectTarget = `${event.url.pathname}${event.url.search}`;
      redirect(303, `/login?redirect=${encodeURIComponent(redirectTarget)}`);
    }

    return new Response(JSON.stringify({ error: 'Authentication required.' }), {
      status: 401,
      headers: { 'content-type': 'application/json' }
    });
  }

  return resolve(event);
}
