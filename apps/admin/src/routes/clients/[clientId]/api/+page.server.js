import { error, fail } from '@sveltejs/kit';
import { getLocalUserByLogtoUserId } from '$lib/server/admin-access-store';
import {
	createClientApiToken,
	getClientApiTokensStoreErrorMessage,
	listClientApiTokenPermissions,
	listClientApiTokens,
	rotateClientApiToken,
	revokeClientApiToken
} from '$lib/server/client-api-tokens-store';

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
		permissions: input.permissions
	};
}

async function requireClientToken(params, tokenId) {
	const tokens = await listClientApiTokens(params.clientId);
	const token = tokens.find((entry) => entry.id === tokenId) ?? null;

	if (!token) {
		throw error(404, 'Client API token not found.');
	}

	return token;
}

export async function load({ params }) {
	try {
		return {
			apiTokens: await listClientApiTokens(params.clientId),
			permissions: listClientApiTokenPermissions()
		};
	} catch (caughtError) {
		return {
			apiTokens: [],
			permissions: listClientApiTokenPermissions(),
			errorMessage: getClientApiTokensStoreErrorMessage(caughtError, 'The client API access view could not be loaded.')
		};
	}
}

export const actions = {
	create: async ({ locals, params, request }) => {
		const formData = await request.formData();
		const input = {
			name: readTrimmedString(formData, 'name'),
			permissions: readPermissions(formData)
		};
		const errors = {};

		if (!input.name) {
			errors.name = 'Token name is required.';
		}

		if (input.permissions.length === 0) {
			errors.permissions = 'Select at least one API permission.';
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

			const result = await createClientApiToken({
				clientId: params.clientId,
				name: input.name,
				permissions: input.permissions,
				createdByUserId: currentLocalUser.id
			});

			return {
				intent: 'create',
				success: true,
				notice: 'The client API token was created successfully.',
				token: result.token,
				tokenRecord: result.tokenRecord,
				values: buildValues(input)
			};
		} catch (caughtError) {
			return fail(caughtError?.status ?? 400, {
				intent: 'create',
				message: getClientApiTokensStoreErrorMessage(caughtError),
				values: buildValues(input)
			});
		}
	},
	rotate: async ({ params, request }) => {
		const formData = await request.formData();
		const tokenId = readTrimmedString(formData, 'tokenId');

		if (!tokenId) {
			return fail(400, {
				intent: 'rotate',
				message: 'Token ID is required to rotate a client API token.'
			});
		}

		try {
			await requireClientToken(params, tokenId);
			const result = await rotateClientApiToken(tokenId);

			if (!result) {
				throw error(404, 'Client API token not found.');
			}

			return {
				intent: 'rotate',
				success: true,
				notice: `The token ${result.tokenRecord.name} was rotated successfully.`,
				token: result.token,
				tokenRecord: result.tokenRecord
			};
		} catch (caughtError) {
			return fail(caughtError?.status ?? 400, {
				intent: 'rotate',
				message: getClientApiTokensStoreErrorMessage(caughtError)
			});
		}
	},
	revoke: async ({ params, request }) => {
		const formData = await request.formData();
		const tokenId = readTrimmedString(formData, 'tokenId');

		if (!tokenId) {
			return fail(400, {
				intent: 'revoke',
				message: 'Token ID is required to revoke a client API token.'
			});
		}

		try {
			const tokenRecord = await requireClientToken(params, tokenId);
			const revokedToken = await revokeClientApiToken(tokenId);

			if (!revokedToken) {
				throw error(404, 'Client API token not found.');
			}

			return {
				intent: 'revoke',
				success: true,
				notice: `The token ${tokenRecord.name} was revoked successfully.`
			};
		} catch (caughtError) {
			return fail(caughtError?.status ?? 400, {
				intent: 'revoke',
				message: getClientApiTokensStoreErrorMessage(caughtError)
			});
		}
	}
};