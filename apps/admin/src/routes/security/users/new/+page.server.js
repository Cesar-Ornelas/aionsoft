import { fail, redirect } from '@sveltejs/kit';
import { createUser, getPublicErrorMessage } from '$lib/server/logto-management';

function readTrimmedString(formData, name) {
	return String(formData.get(name) ?? '').trim();
}

export const actions = {
	default: async ({ request }) => {
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
				errors,
				values: { name, email }
			});
		}

		try {
			await createUser({ name, email, password });
		} catch (error) {
			return fail(error?.status ?? 500, {
				message: getPublicErrorMessage(error),
				values: { name, email }
			});
		}

		throw redirect(303, '/security/users?created=1');
	}
};