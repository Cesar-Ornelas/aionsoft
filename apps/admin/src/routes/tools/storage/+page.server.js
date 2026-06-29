import { fail, redirect } from '@sveltejs/kit';
import { getLocalUserByLogtoUserId } from '$lib/server/admin-access-store';
import { getClientR2EnvironmentState } from '$lib/server/cloudflare-r2';
import {
	createCompanyR2StorageDirectory,
	enableCompanyR2Storage,
	getClientR2StorageStoreErrorMessage,
	getCompanyR2Storage,
	listClientR2DirectoriesOverview
} from '$lib/server/client-r2-storage-store';

function readTrimmedString(formData, name) {
	return String(formData.get(name) ?? '').trim();
}

function buildDirectoryValues(input) {
	return {
		path: input.path,
		displayName: input.displayName
	};
}

function getNotice(searchParams) {
	if (searchParams.get('enabled') === '1') {
		return 'Company storage was enabled successfully.';
	}

	if (searchParams.get('directory') === 'created') {
		return 'The company directory was created successfully.';
	}

	return null;
}

export async function load({ url }) {
	const environment = getClientR2EnvironmentState();

	try {
		const [companyStorage, clientDirectories] = await Promise.all([
			getCompanyR2Storage(),
			listClientR2DirectoriesOverview()
		]);

		return {
			companyStorage,
			clientDirectories,
			environment,
			notice: getNotice(url.searchParams)
		};
	} catch (caughtError) {
		return {
			companyStorage: null,
			clientDirectories: [],
			environment,
			notice: getNotice(url.searchParams),
			errorMessage: getClientR2StorageStoreErrorMessage(caughtError, 'The storage tool could not be loaded.')
		};
	}
}

export const actions = {
	createCompanyDirectory: async ({ locals, request }) => {
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
				intent: 'createCompanyDirectory',
				errors,
				values: buildDirectoryValues(input)
			});
		}

		const currentLocalUser = await getLocalUserByLogtoUserId(locals.user?.sub);

		if (!currentLocalUser) {
			return fail(403, {
				intent: 'createCompanyDirectory',
				message: 'No local admin user mapping was found for the current account.',
				values: buildDirectoryValues(input)
			});
		}

		try {
			await createCompanyR2StorageDirectory({
				...input,
				createdByUserId: currentLocalUser.id
			});
		} catch (caughtError) {
			return fail(caughtError?.status ?? 400, {
				intent: 'createCompanyDirectory',
				message: getClientR2StorageStoreErrorMessage(caughtError),
				values: buildDirectoryValues(input)
			});
		}

		throw redirect(303, '/tools/storage?directory=created');
	},
	enableCompany: async ({ locals }) => {
		const currentLocalUser = await getLocalUserByLogtoUserId(locals.user?.sub);

		if (!currentLocalUser) {
			return fail(403, {
				intent: 'enableCompany',
				message: 'No local admin user mapping was found for the current account.'
			});
		}

		try {
			await enableCompanyR2Storage({
				createdByUserId: currentLocalUser.id
			});
		} catch (caughtError) {
			return fail(caughtError?.status ?? 400, {
				intent: 'enableCompany',
				message: getClientR2StorageStoreErrorMessage(caughtError)
			});
		}

		throw redirect(303, '/tools/storage?enabled=1');
	}
};