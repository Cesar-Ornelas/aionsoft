import { fail, redirect } from '@sveltejs/kit';
import {
	bootstrapAdminAccess,
	getAdminSetupState
} from '$lib/server/admin-access-store';
import {
	addUsersToOrganization,
	createOrganization,
	createUser,
	getPublicErrorMessage,
	getSecurityBootstrapState
} from '$lib/server/logto-management';

function readTrimmedString(formData, name) {
	return String(formData.get(name) ?? '').trim();
}

function buildPostSetupSignInPath(url) {
	const signInUrl = new URL('/auth/sign-in', url.origin);
	 signInUrl.searchParams.set('returnTo', '/security/users');
	return `${signInUrl.pathname}${signInUrl.search}`;
}

async function getCombinedSetupState() {
	const [bootstrap, localSetup] = await Promise.all([
		getSecurityBootstrapState(),
		getAdminSetupState()
	]);

	return {
		bootstrap,
		localSetup,
		isComplete: bootstrap.hasOrganization && localSetup.isComplete
	};
}

export async function load() {
	const state = await getCombinedSetupState();

	if (state.isComplete) {
		throw redirect(302, '/security/users');
	}

	return {};
}

export const actions = {
	default: async ({ request, url }) => {
		const formData = await request.formData();
		const organizationName = readTrimmedString(formData, 'organizationName');
		const organizationDescription = readTrimmedString(formData, 'organizationDescription');
		const name = readTrimmedString(formData, 'name');
		const email = readTrimmedString(formData, 'email').toLowerCase();
		const password = String(formData.get('password') ?? '');
		const errors = {};

		if (!organizationName) {
			errors.organizationName = 'Organization name is required.';
		}

		if (!name) {
			errors.name = 'Admin name is required.';
		}

		if (!email) {
			errors.email = 'Email is required.';
		}

		if (!password) {
			errors.password = 'Password is required.';
		}

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				errors,
				values: {
					organizationName,
					organizationDescription,
					name,
					email
				}
			});
		}

		try {
			const state = await getCombinedSetupState();
			const organization =
				state.bootstrap.organization ??
				(await createOrganization({
					name: organizationName,
					description: organizationDescription
				}));

			const user = await createUser({
				name,
				email,
				password
			});

			await addUsersToOrganization(organization.id, [user.id]);
			await bootstrapAdminAccess({ organization, user });
		} catch (error) {
			return fail(error?.status ?? 500, {
				message: getPublicErrorMessage(error),
				values: {
					organizationName,
					organizationDescription,
					name,
					email
				}
			});
		}

		throw redirect(303, buildPostSetupSignInPath(url));
	}
};