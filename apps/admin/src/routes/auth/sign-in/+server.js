import { redirect } from '@sveltejs/kit';
import { buildCallbackUrl, buildPostSignInUrl, getReturnTo } from '$lib/server/auth';

export async function GET({ locals, url }) {
	const returnTo = getReturnTo(url.searchParams);

	if (locals.user) {
		throw redirect(302, returnTo);
	}

	await locals.logtoClient.signIn({
		redirectUri: buildCallbackUrl(url),
		postRedirectUri: buildPostSignInUrl(url, returnTo)
	});
}