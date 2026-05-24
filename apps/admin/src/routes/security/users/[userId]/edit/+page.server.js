import { error, fail, redirect } from '@sveltejs/kit';
import {
	getPublicErrorMessage,
	getUserById,
	updateUser
} from '$lib/server/logto-management';

function readTrimmedString(formData, name) {
	return String(formData.get(name) ?? '').trim();
}

export async function load({ params }) {
	try {
		return {
			user: await getUserById(params.userId)
		};
	} catch (caughtError) {
		throw error(caughtError?.status ?? 500, getPublicErrorMessage(caughtError));
	}
}

export const actions = {
	default: async ({ params, request }) => {
		const formData = await request.formData();
		const name = readTrimmedString(formData, 'name');
		const email = readTrimmedString(formData, 'email').toLowerCase();
		const errors = {};

		if (!name) {
			errors.name = 'Name is required.';
		}

		if (!email) {
			errors.email = 'Email is required.';
		}

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				errors,
				values: { name, email }
			});
		}

		try {
			await updateUser(params.userId, { name, email });
		} catch (caughtError) {
			return fail(caughtError?.status ?? 500, {
				message: getPublicErrorMessage(caughtError),
				values: { name, email }
			});
		}

		throw redirect(303, '/security/users?updated=1');
	}
};