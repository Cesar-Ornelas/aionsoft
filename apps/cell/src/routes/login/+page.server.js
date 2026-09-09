import { redirect } from '@sveltejs/kit';

function getSafeRedirect(url) {
  const requestedRedirect = url.searchParams.get('redirect');
  return requestedRedirect?.startsWith('/') && !requestedRedirect.startsWith('//') ? requestedRedirect : '/operations/issues';
}

export function load({ locals, url }) {
  if (locals.user) {
    redirect(303, getSafeRedirect(url));
  }

  return { redirect: getSafeRedirect(url) };
}