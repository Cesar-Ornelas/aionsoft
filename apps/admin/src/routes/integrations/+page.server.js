import { fail } from '@sveltejs/kit';
import { getLocalUserByLogtoUserId, listLocalUsers } from '$lib/server/admin-access-store';
import {
	createIntegration,
	getIntegrationsStoreErrorMessage,
	listIntegrationPermissions,
	listIntegrations
} from '$lib/server/integrations-store';

function readTrimmedString(formData, name) {
	return String(formData.get(name) ?? '').trim();
}

function readPermissions(formData) {
	return formData
		.getAll('permissions')
		.map((value) => String(value).trim())
		.filter(Boolean);
}

function buildValues(input) {
	return {
		name: input.name,
		kind: input.kind,
		actorUserId: input.actorUserId,
		permissions: input.permissions
	};
}

export async function load() {
	try {
		const [integrations, users] = await Promise.all([listIntegrations(), listLocalUsers()]);

		return {
			integrations,
			users,
			permissions: listIntegrationPermissions()
		};
	} catch (error) {
		return {
			integrations: [],
			users: [],
			permissions: listIntegrationPermissions(),
			errorMessage: getIntegrationsStoreErrorMessage(error, 'The integrations view could not be loaded.')
		};
	}
}

export const actions = {
	create: async ({ locals, request }) => {
		const formData = await request.formData();
		const input = {
			name: readTrimmedString(formData, 'name'),
			kind: readTrimmedString(formData, 'kind') || 'external',
			actorUserId: readTrimmedString(formData, 'actorUserId'),
			permissions: readPermissions(formData)
		};
		const errors = {};

		if (!input.name) {
			errors.name = 'Integration name is required.';
		}

		if (!input.actorUserId) {
			errors.actorUserId = 'Select the internal owner used for created tasks.';
		}

		if (input.permissions.length === 0) {
			errors.permissions = 'Select at least one integration permission.';
		}

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				intent: 'create',
				errors,
				values: buildValues(input)
			});
		}

		try {
			const currentLocalUser = await getLocalUserByLogtoUserId(locals.user?.sub);

			if (!currentLocalUser) {
				return fail(403, {
					intent: 'create',
					message: 'No local admin user mapping was found for the current account.',
					values: buildValues(input)
				});
			}

			const result = await createIntegration({
				...input,
				createdByUserId: currentLocalUser.id
			});

			return {
				intent: 'create',
				success: true,
				integration: result.integration,
				values: buildValues(input),
				token: result.token
			};
		} catch (error) {
			return fail(400, {
				intent: 'create',
				message: getIntegrationsStoreErrorMessage(error),
				values: buildValues(input)
			});
		}
	}
};