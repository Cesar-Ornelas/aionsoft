import { redirect } from '@sveltejs/kit';
import { buildSignInPath } from '$lib/server/auth';

export function load({ locals, url }) {
	if (!locals.user) {
		throw redirect(302, buildSignInPath(url));
	}

	throw redirect(302, '/security');
}