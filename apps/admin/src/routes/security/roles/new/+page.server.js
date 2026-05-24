import { fail, redirect } from '@sveltejs/kit';
import { createLocalRole, getAccessStoreErrorMessage } from '$lib/server/admin-access-store';

function readTrimmedString(formData, name) {
	return String(formData.get(name) ?? '').trim();
}

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const name = readTrimmedString(formData, 'name');
		const description = readTrimmedString(formData, 'description');
		const errors = {};

		if (!name) {
			errors.name = 'Role name is required.';
		}

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				errors,
				values: { name, description }
			});
		}

		try {
			await createLocalRole({ name, description });
		} catch (error) {
			return fail(error?.status ?? 500, {
				message: getAccessStoreErrorMessage(error),
				values: { name, description }
			});
		}

		throw redirect(303, '/security/roles?created=1');
	}
};