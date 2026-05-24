import { redirect } from '@sveltejs/kit';
import { buildSignInPath } from '$lib/server/auth';
import { getAdminSetupState } from '$lib/server/admin-access-store';
import { getSecurityBootstrapState } from '$lib/server/logto-management';

export async function requireAdminAppReady({ locals, url }) {
	const [bootstrap, localSetup] = await Promise.all([
		getSecurityBootstrapState(),
		getAdminSetupState()
	]);
	const isSetupComplete = bootstrap.hasOrganization && localSetup.isComplete;

	if (!isSetupComplete) {
		throw redirect(302, '/setup');
	}

	if (!locals.user) {
		throw redirect(302, buildSignInPath(url));
	}

	return {
		bootstrap,
		currentPath: url.pathname
	};
}