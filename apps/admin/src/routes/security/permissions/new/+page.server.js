import { fail, redirect } from '@sveltejs/kit';
import {
	createLocalPermission,
	getAccessStoreErrorMessage
} from '$lib/server/admin-access-store';

function readTrimmedString(formData, name) {
	return String(formData.get(name) ?? '').trim();
}

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const key = readTrimmedString(formData, 'key');
		const description = readTrimmedString(formData, 'description');
		const errors = {};

		if (!key) {
			errors.key = 'Permission key is required.';
		}

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				errors,
				values: { key, description }
			});
		}

		try {
			await createLocalPermission({ key, description });
		} catch (error) {
			return fail(error?.status ?? 500, {
				message: getAccessStoreErrorMessage(error),
				values: { key, description }
			});
		}

		throw redirect(303, '/security/permissions?created=1');
	}
};