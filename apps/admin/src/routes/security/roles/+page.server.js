import { fail, redirect } from '@sveltejs/kit';
import { createLocalRole, getAccessStoreErrorMessage, listLocalRoles } from '$lib/server/admin-access-store';

function readTrimmedString(formData, name) {
	return String(formData.get(name) ?? '').trim();
}

function getNotice(searchParams) {
	if (searchParams.get('created') === '1') {
		return 'The new role was created successfully.';
	}

	if (searchParams.get('updated') === '1') {
		return 'The role was updated successfully.';
	}

	return null;
}

export async function load({ url }) {
	try {
		return {
			roles: await listLocalRoles(),
			notice: getNotice(url.searchParams)
		};
	} catch (error) {
		return {
			roles: [],
			notice: null,
			errorMessage: getAccessStoreErrorMessage(error)
		};
	}
}

export const actions = {
	create: async ({ request }) => {
		const formData = await request.formData();
		const name = readTrimmedString(formData, 'name');
		const description = readTrimmedString(formData, 'description');
		const errors = {};

		if (!name) {
			errors.name = 'Role name is required.';
		}

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				intent: 'create',
				errors,
				values: { name, description }
			});
		}

		try {
			await createLocalRole({ name, description });
		} catch (error) {
			return fail(error?.status ?? 500, {
				intent: 'create',
				message: getAccessStoreErrorMessage(error),
				values: { name, description }
			});
		}

		throw redirect(303, '/security/roles?created=1');
	}
};