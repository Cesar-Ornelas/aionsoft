import { fail, redirect } from '@sveltejs/kit';
import { getLocalUserByLogtoUserId } from '$lib/server/admin-access-store';
import { getClientR2EnvironmentState } from '$lib/server/cloudflare-r2';
import {
	createClientR2StorageDirectory,
	enableClientR2Storage,
	getClientR2StorageByClientId,
	getClientR2StorageStoreErrorMessage
} from '$lib/server/client-r2-storage-store';

function readTrimmedString(formData, name) {
	return String(formData.get(name) ?? '').trim();
}

function getNotice(searchParams) {
	if (searchParams.get('enabled') === '1') {
		return 'Client storage was enabled successfully.';
	}

	if (searchParams.get('directory') === 'created') {
		return 'The allowed directory was created successfully.';
	}

	return null;
}

function buildDirectoryValues(input) {
	return {
		path: input.path,
		displayName: input.displayName
	};
}

export async function load({ params, url }) {
	const environment = getClientR2EnvironmentState();

	try {
		return {
			storage: await getClientR2StorageByClientId(params.clientId),
			environment,
			notice: getNotice(url.searchParams)
		};
	} catch (caughtError) {
		return {
			storage: null,
			environment,
			notice: getNotice(url.searchParams),
			errorMessage: getClientR2StorageStoreErrorMessage(caughtError, 'The client storage view could not be loaded.')
		};
	}
}

export const actions = {
	enable: async ({ locals, params }) => {
		const currentLocalUser = await getLocalUserByLogtoUserId(locals.user?.sub);

		if (!currentLocalUser) {
			return fail(403, {
				intent: 'enable',
				message: 'No local admin user mapping was found for the current account.'
			});
		}

		try {
			await enableClientR2Storage(params.clientId, {
				createdByUserId: currentLocalUser.id
			});
		} catch (caughtError) {
			return fail(caughtError?.status ?? 400, {
				intent: 'enable',
				message: getClientR2StorageStoreErrorMessage(caughtError)
			});
		}

		throw redirect(303, `/clients/${params.clientId}/storage?enabled=1`);
	},
	createDirectory: async ({ locals, params, request }) => {
		const formData = await request.formData();
		const input = {
			path: readTrimmedString(formData, 'path'),
			displayName: readTrimmedString(formData, 'displayName')
		};
		const errors = {};

		if (!input.path) {
			errors.path = 'Directory path is required.';
		}

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				intent: 'createDirectory',
				errors,
				values: buildDirectoryValues(input)
			});
		}

		const currentLocalUser = await getLocalUserByLogtoUserId(locals.user?.sub);

		if (!currentLocalUser) {
			return fail(403, {
				intent: 'createDirectory',
				message: 'No local admin user mapping was found for the current account.',
				values: buildDirectoryValues(input)
			});
		}

		try {
			await createClientR2StorageDirectory(params.clientId, {
				...input,
				createdByUserId: currentLocalUser.id
			});
		} catch (caughtError) {
			return fail(caughtError?.status ?? 400, {
				intent: 'createDirectory',
				message: getClientR2StorageStoreErrorMessage(caughtError),
				values: buildDirectoryValues(input)
			});
		}

		throw redirect(303, `/clients/${params.clientId}/storage?directory=created`);
	}
};