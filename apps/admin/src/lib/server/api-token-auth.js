import { getIntegrationByToken, getIntegrationTaskAccessScope, hasIntegrationPermission, markIntegrationUsed } from '$lib/server/integrations-store';

export class ApiTokenAuthError extends Error {
	constructor(message, status = 401) {
		super(message);
		this.name = 'ApiTokenAuthError';
		this.status = status;
	}
}

function readBearerToken(request) {
	const headerValue = request.headers.get('authorization')?.trim() ?? '';

	if (!headerValue) {
		throw new ApiTokenAuthError('Missing Authorization header.', 401);
	}

	const [scheme, token] = headerValue.split(/\s+/, 2);

	if (scheme?.toLowerCase() !== 'bearer' || !token?.trim()) {
		throw new ApiTokenAuthError('Expected a Bearer token in the Authorization header.', 401);
	}

	return token.trim();
}

export async function requireApiIntegration(request, permission) {
	const token = readBearerToken(request);
	const integration = await getIntegrationByToken(token);

	if (!integration) {
		throw new ApiTokenAuthError('The provided API token is invalid.', 401);
	}

	if (integration.status !== 'active') {
		throw new ApiTokenAuthError('The provided API token has been revoked.', 403);
	}

	if (!hasIntegrationPermission(integration, permission)) {
		throw new ApiTokenAuthError('This integration does not have permission for the requested task operation.', 403);
	}

	await markIntegrationUsed(integration.id);

	return integration;
}

export function getApiIntegrationTaskReadScope(integration) {
	const taskAccess = getIntegrationTaskAccessScope(integration);

	if (taskAccess.taskAccessScope === 'all') {
		return {
			sourceIntegrationId: null,
			allowedTagKeys: []
		};
	}

	if (taskAccess.taskAccessScope === 'tags') {
		return {
			sourceIntegrationId: null,
			allowedTagKeys: taskAccess.allowedTaskTags
		};
	}

	return {
		sourceIntegrationId: integration?.id ?? null,
		allowedTagKeys: []
	};
}

export function getApiAuthErrorMessage(error, fallback = 'The API request could not be authenticated.') {
	if (error instanceof ApiTokenAuthError) {
		return error.message;
	}

	if (error instanceof Error && error.message) {
		return error.message;
	}

	return fallback;
}