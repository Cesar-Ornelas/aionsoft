import { error, fail, redirect } from '@sveltejs/kit';
import {
	getAccessStoreErrorMessage,
	getLocalPermissionById,
	updateLocalPermission
} from '$lib/server/admin-access-store';

function readTrimmedString(formData, name) {
	return String(formData.get(name) ?? '').trim();
}

export async function load({ params }) {
	try {
		const permission = await getLocalPermissionById(params.permissionId);

		if (!permission) {
			throw error(404, 'Permission not found.');
		}

		return {
			permission
		};
	} catch (caughtError) {
		throw error(caughtError?.status ?? 500, getAccessStoreErrorMessage(caughtError));
	}
}

export const actions = {
	default: async ({ params, request }) => {
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
			await updateLocalPermission(params.permissionId, { key, description });
		} catch (caughtError) {
			return fail(caughtError?.status ?? 500, {
				message: getAccessStoreErrorMessage(caughtError),
				values: { key, description }
			});
		}

		throw redirect(303, '/security/permissions?updated=1');
	}
};