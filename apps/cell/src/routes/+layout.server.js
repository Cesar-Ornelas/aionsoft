import { redirect } from '@sveltejs/kit';

const publicPaths = ['/login', '/setup'];

function isPublicPath(pathname) {
  return publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function load({ locals, url }) {
  if (!locals.user && !isPublicPath(url.pathname)) {
    const redirectTarget = `${url.pathname}${url.search}`;
    redirect(303, `/login?redirect=${encodeURIComponent(redirectTarget)}`);
  }

  return { user: locals.user };
}