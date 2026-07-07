export function createLogtoSvelteKitAuthHelpers({ env, missingEnvLabel = 'auth' }) {
	const REQUIRED_ENV_NAMES = [
		'LOGTO_ENDPOINT',
		'LOGTO_APP_ID',
		'LOGTO_APP_SECRET',
		'LOGTO_COOKIE_ENCRYPTION_KEY'
	];

	function getRequiredEnv(name) {
		const value = env[name]?.trim();

		if (!value) {
			throw new Error(`Missing required ${missingEnvLabel} env var: ${name}`);
		}

		return value;
	}

	function normalizeReturnTo(returnTo) {
		if (!returnTo || !returnTo.startsWith('/') || returnTo.startsWith('//')) {
			return '/';
		}

		return returnTo;
	}

	function getLogtoConfig() {
		for (const name of REQUIRED_ENV_NAMES) {
			getRequiredEnv(name);
		}

		return {
			endpoint: getRequiredEnv('LOGTO_ENDPOINT'),
			appId: getRequiredEnv('LOGTO_APP_ID'),
			appSecret: getRequiredEnv('LOGTO_APP_SECRET')
		};
	}

	function getLogtoCookieConfig() {
		return {
			encryptionKey: getRequiredEnv('LOGTO_COOKIE_ENCRYPTION_KEY')
		};
	}

	function getReturnTo(searchParams) {
		return normalizeReturnTo(searchParams.get('returnTo'));
	}

	function buildSignInPath(url) {
		const signInUrl = new URL('/auth/sign-in', url.origin);
		const returnTo = normalizeReturnTo(`${url.pathname}${url.search}`);

		if (returnTo !== '/') {
			signInUrl.searchParams.set('returnTo', returnTo);
		}

		return `${signInUrl.pathname}${signInUrl.search}`;
	}

	function buildCallbackUrl(url) {
		return new URL('/callback', url.origin).toString();
	}

	function buildPostSignInUrl(url, returnTo) {
		return new URL(normalizeReturnTo(returnTo), url.origin).toString();
	}

	function buildPostSignOutUrl(url) {
		return new URL('/', url.origin).toString();
	}

	return {
		getLogtoConfig,
		getLogtoCookieConfig,
		getReturnTo,
		buildSignInPath,
		buildCallbackUrl,
		buildPostSignInUrl,
		buildPostSignOutUrl
	};
}
