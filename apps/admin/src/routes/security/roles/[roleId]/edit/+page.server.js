import { error, fail, redirect } from '@sveltejs/kit';
import {
	getAccessStoreErrorMessage,
	getLocalRoleById,
	updateLocalRole
} from '$lib/server/admin-access-store';

function readTrimmedString(formData, name) {
	return String(formData.get(name) ?? '').trim();
}

export async function load({ params }) {
	try {
		const role = await getLocalRoleById(params.roleId);

		if (!role) {
			throw error(404, 'Role not found.');
		}

		return {
			role
		};
	} catch (caughtError) {
		throw error(caughtError?.status ?? 500, getAccessStoreErrorMessage(caughtError));
	}
}

export const actions = {
	default: async ({ params, request }) => {
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
			await updateLocalRole(params.roleId, { name, description });
		} catch (caughtError) {
			return fail(caughtError?.status ?? 500, {
				message: getAccessStoreErrorMessage(caughtError),
				values: { name, description }
			});
		}

		throw redirect(303, '/security/roles?updated=1');
	}
};