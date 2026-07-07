import { env } from '$env/dynamic/private';
import { createLogtoSvelteKitAuthHelpers } from '@aionsoft/shared/auth-logto';

export const {
	getLogtoConfig,
	getLogtoCookieConfig,
	getReturnTo,
	buildSignInPath,
	buildCallbackUrl,
	buildPostSignInUrl,
	buildPostSignOutUrl
} = createLogtoSvelteKitAuthHelpers({
	env,
	missingEnvLabel: 'portal auth'
});