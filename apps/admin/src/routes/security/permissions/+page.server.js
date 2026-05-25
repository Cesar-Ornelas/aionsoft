import { fail, redirect } from '@sveltejs/kit';
import {
	createLocalPermission,
	getAccessStoreErrorMessage,
	listLocalPermissions
} from '$lib/server/admin-access-store';

function readTrimmedString(formData, name) {
	return String(formData.get(name) ?? '').trim();
}

function getNotice(searchParams) {
	if (searchParams.get('created') === '1') {
		return 'The new permission was created successfully.';
	}

	if (searchParams.get('updated') === '1') {
		return 'The permission was updated successfully.';
	}

	return null;
}

export async function load({ url }) {
	try {
		return {
			permissions: await listLocalPermissions(),
			notice: getNotice(url.searchParams)
		};
	} catch (error) {
		return {
			permissions: [],
			notice: null,
			errorMessage: getAccessStoreErrorMessage(error)
		};
	}
}

export const actions = {
	create: async ({ request }) => {
		const formData = await request.formData();
		const key = readTrimmedString(formData, 'key');
		const description = readTrimmedString(formData, 'description');
		const errors = {};

		if (!key) {
			errors.key = 'Permission key is required.';
		}

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				intent: 'create',
				errors,
				values: { key, description }
			});
		}

		try {
			await createLocalPermission({ key, description });
		} catch (error) {
			return fail(error?.status ?? 500, {
				intent: 'create',
				message: getAccessStoreErrorMessage(error),
				values: { key, description }
			});
		}

		throw redirect(303, '/security/permissions?created=1');
	}
};