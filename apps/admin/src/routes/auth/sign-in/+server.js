import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { buildCallbackUrl, buildPostSignInUrl, getReturnTo } from '$lib/server/auth';

const LOGTO_CONSENT_COOKIE = 'logto-consent-granted';

export async function GET({ locals, cookies, url }) {
	const returnTo = getReturnTo(url.searchParams);

	if (locals.user) {
		throw redirect(302, returnTo);
	}

	const hasConsentCookie = url.searchParams.has('forceConsent')
		? false
		: url.searchParams.has('consent')
			? true
			: Boolean(cookies.get(LOGTO_CONSENT_COOKIE));
	const isProduction = env.NODE_ENV === 'production';
	const prompt = url.searchParams.has('forceConsent')
		? 'consent'
		: isProduction
			? 'login'
			: hasConsentCookie
				? 'login'
				: 'consent';

	await locals.logtoClient.signIn({
		redirectUri: buildCallbackUrl(url),
		postRedirectUri: buildPostSignInUrl(url, returnTo),
		prompt
	});
}