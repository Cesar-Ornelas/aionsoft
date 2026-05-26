import { fail } from '@sveltejs/kit';
import { getLocalUserByLogtoUserId, listLocalUsers } from '$lib/server/admin-access-store';
import {
	createIntegration,
	getIntegrationById,
	getIntegrationsStoreErrorMessage,
	listIntegrationPermissions,
	listIntegrationTaskAccessScopes,
	listIntegrations,
	updateIntegration
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
		permissions: input.permissions,
		taskAccessScope: input.taskAccessScope,
		allowedTaskTags: input.allowedTaskTags
	};
}

function readAllowedTaskTags(formData) {
	return String(formData.get('allowedTaskTags') ?? '')
		.split(',')
		.map((value) => value.trim())
		.filter(Boolean);
}

export async function load({ url }) {
	const editIntegrationId = readTrimmedString(url.searchParams, 'edit');

	try {
		const [integrations, users, editingIntegration] = await Promise.all([
			listIntegrations(),
			listLocalUsers(),
			editIntegrationId ? getIntegrationById(editIntegrationId) : Promise.resolve(null)
		]);

		return {
			integrations,
			users,
			editingIntegration,
			permissions: listIntegrationPermissions(),
			taskAccessScopes: listIntegrationTaskAccessScopes()
		};
	} catch (error) {
		return {
			integrations: [],
			users: [],
			editingIntegration: null,
			permissions: listIntegrationPermissions(),
			taskAccessScopes: listIntegrationTaskAccessScopes(),
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
			permissions: readPermissions(formData),
			taskAccessScope: readTrimmedString(formData, 'taskAccessScope') || 'own',
			allowedTaskTags: readAllowedTaskTags(formData)
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

		if (input.taskAccessScope === 'tags' && input.allowedTaskTags.length === 0) {
			errors.allowedTaskTags = 'Add at least one task tag when the scope is limited by tags.';
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
	},
	edit: async ({ request }) => {
		const formData = await request.formData();
		const integrationId = readTrimmedString(formData, 'integrationId');
		const input = {
			permissions: readPermissions(formData),
			taskAccessScope: readTrimmedString(formData, 'taskAccessScope') || 'own',
			allowedTaskTags: readAllowedTaskTags(formData)
		};
		const errors = {};

		if (!integrationId) {
			return fail(400, {
				intent: 'edit',
				message: 'Integration ID is required.',
				values: buildValues(input),
				integrationId
			});
		}

		if (input.permissions.length === 0) {
			errors.permissions = 'Select at least one integration permission.';
		}

		if (input.taskAccessScope === 'tags' && input.allowedTaskTags.length === 0) {
			errors.allowedTaskTags = 'Add at least one task tag when the scope is limited by tags.';
		}

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				intent: 'edit',
				errors,
				values: buildValues(input),
				integrationId
			});
		}

		try {
			const integration = await updateIntegration(integrationId, input);

			if (!integration) {
				return fail(404, {
					intent: 'edit',
					message: 'Integration not found.',
					values: buildValues(input),
					integrationId
				});
			}

			return {
				intent: 'edit',
				success: true,
				integration,
				values: buildValues(input),
				integrationId
			};
		} catch (error) {
			return fail(400, {
				intent: 'edit',
				message: getIntegrationsStoreErrorMessage(error),
				values: buildValues(input),
				integrationId
			});
		}
	}
};