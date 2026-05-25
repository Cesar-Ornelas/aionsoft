import { fail, redirect } from '@sveltejs/kit';
import { createUser, getPublicErrorMessage, listUsers } from '$lib/server/logto-management';

function readTrimmedString(formData, name) {
	return String(formData.get(name) ?? '').trim();
}

function getNotice(searchParams) {
	if (searchParams.get('created') === '1') {
		return 'The new user was created successfully.';
	}

	if (searchParams.get('updated') === '1') {
		return 'The user was updated successfully.';
	}

	if (searchParams.get('created') === 'setup') {
		return 'Security setup is complete. Your organization and first user are now in Logto.';
	}

	return null;
}

export async function load({ url }) {
	try {
		return {
			users: await listUsers(),
			notice: getNotice(url.searchParams)
		};
	} catch (error) {
		return {
			users: [],
			notice: null,
			errorMessage: getPublicErrorMessage(error)
		};
	}
}

export const actions = {
	create: async ({ request }) => {
		const formData = await request.formData();
		const name = readTrimmedString(formData, 'name');
		const email = readTrimmedString(formData, 'email').toLowerCase();
		const password = String(formData.get('password') ?? '');
		const errors = {};

		if (!name) {
			errors.name = 'Name is required.';
		}

		if (!email) {
			errors.email = 'Email is required.';
		}

		if (!password) {
			errors.password = 'Password is required.';
		}

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				intent: 'create',
				errors,
				values: { name, email }
			});
		}

		try {
			await createUser({ name, email, password });
		} catch (error) {
			return fail(error?.status ?? 500, {
				intent: 'create',
				message: getPublicErrorMessage(error),
				values: { name, email }
			});
		}

		throw redirect(303, '/security/users?created=1');
	}
};