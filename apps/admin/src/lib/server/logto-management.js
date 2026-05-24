import { env } from '$env/dynamic/private';

const TOKEN_EXPIRY_BUFFER_MS = 60 * 1000;

let cachedToken;
let cachedTokenExpiresAt = 0;

export class LogtoManagementError extends Error {
	constructor(message, status = 500, details = null) {
		super(message);
		this.name = 'LogtoManagementError';
		this.status = status;
		this.details = details;
	}
}

function getRequiredEnv(name) {
	const value = env[name]?.trim();

	if (!value) {
		throw new LogtoManagementError(`Missing required admin security env var: ${name}`, 500);
	}

	return value;
}

function getLogtoEndpoint() {
	return getRequiredEnv('LOGTO_ENDPOINT').replace(/\/$/, '');
}

function getManagementBaseUrl() {
	return `${getLogtoEndpoint()}/api`;
}

function getManagementResource() {
	return env.LOGTO_MANAGEMENT_RESOURCE?.trim() || 'https://default.logto.app/api';
}

function getAdminResourceIndicator() {
	return env.LOGTO_ADMIN_RESOURCE_INDICATOR?.trim() || 'urn:aionsoft:admin';
}

function getAdminResourceName() {
	return env.LOGTO_ADMIN_RESOURCE_NAME?.trim() || 'Aionsoft Admin';
}

function normalizeTimestamp(value) {
	if (!value) {
		return null;
	}

	if (typeof value === 'string') {
		return value;
	}

	const numericValue = Number(value);

	if (!Number.isFinite(numericValue)) {
		return null;
	}

	const milliseconds = numericValue > 1_000_000_000_000 ? numericValue : numericValue * 1000;
	return new Date(milliseconds).toISOString();
}

function parseListResponse(payload, keys = []) {
	if (Array.isArray(payload)) {
		return payload;
	}

	for (const key of keys) {
		if (Array.isArray(payload?.[key])) {
			return payload[key];
		}
	}

	return [];
}

function getErrorMessage(payload, fallback) {
	if (typeof payload === 'string' && payload) {
		return payload;
	}

	if (payload && typeof payload === 'object') {
		return payload.message || payload.error_description || payload.error || fallback;
	}

	return fallback;
}

async function parseResponseBody(response) {
	const text = await response.text();

	if (!text) {
		return null;
	}

	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

async function getManagementAccessToken() {
	if (cachedToken && Date.now() < cachedTokenExpiresAt - TOKEN_EXPIRY_BUFFER_MS) {
		return cachedToken;
	}

	const tokenResponse = await fetch(`${getLogtoEndpoint()}/oidc/token`, {
		method: 'POST',
		headers: {
			'content-type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({
			grant_type: 'client_credentials',
			client_id: getRequiredEnv('LOGTO_M2M_APP_ID'),
			client_secret: getRequiredEnv('LOGTO_M2M_APP_SECRET'),
			resource: getManagementResource(),
			scope: 'all'
		})
	});

	const tokenPayload = await parseResponseBody(tokenResponse);

	if (!tokenResponse.ok || !tokenPayload?.access_token) {
		throw new LogtoManagementError(
			getErrorMessage(tokenPayload, 'Unable to authenticate with the Logto Management API.'),
			tokenResponse.status || 500,
			tokenPayload
		);
	}

	cachedToken = tokenPayload.access_token;
	cachedTokenExpiresAt = Date.now() + Number(tokenPayload.expires_in || 3600) * 1000;

	return cachedToken;
}

async function managementRequest(path, init = {}) {
	const accessToken = await getManagementAccessToken();
	const headers = new Headers(init.headers || {});
	const hasJsonBody = init.body && !(init.body instanceof URLSearchParams);

	headers.set('authorization', `Bearer ${accessToken}`);

	if (hasJsonBody && !headers.has('content-type')) {
		headers.set('content-type', 'application/json');
	}

	const response = await fetch(`${getManagementBaseUrl()}${path}`, {
		...init,
		headers
	});

	const payload = await parseResponseBody(response);

	if (!response.ok) {
		throw new LogtoManagementError(
			getErrorMessage(payload, `Logto request failed for ${path}`),
			response.status,
			payload
		);
	}

	return payload;
}

function normalizeUser(user) {
	return {
		id: user.id,
		name: user.name || user.username || user.primaryEmail || 'Unnamed user',
		email: user.primaryEmail || user.email || null,
		username: user.username || null,
		avatar: user.avatar || null,
		createdAt: normalizeTimestamp(user.createdAt),
		updatedAt: normalizeTimestamp(user.updatedAt)
	};
}

function normalizeRole(role) {
	return {
		id: role.id,
		name: role.name,
		description: role.description || '',
		createdAt: normalizeTimestamp(role.createdAt),
		updatedAt: normalizeTimestamp(role.updatedAt)
	};
}

function normalizePermission(permission) {
	return {
		id: permission.id,
		key: permission.name,
		description: permission.description || '',
		resourceId: permission.resourceId || null,
		createdAt: normalizeTimestamp(permission.createdAt),
		updatedAt: normalizeTimestamp(permission.updatedAt)
	};
}

export function getPublicErrorMessage(error) {
	if (error instanceof LogtoManagementError) {
		return error.message;
	}

	return 'The requested security action could not be completed.';
}

export async function listOrganizations() {
	const payload = await managementRequest('/organizations');
	return parseListResponse(payload, ['organizations']).sort((left, right) => left.name.localeCompare(right.name));
}

export async function createOrganization(input) {
	return managementRequest('/organizations', {
		method: 'POST',
		body: JSON.stringify({
			name: input.name,
			description: input.description || undefined
		})
	});
}

export async function addUsersToOrganization(organizationId, userIds) {
	return managementRequest(`/organizations/${organizationId}/users`, {
		method: 'POST',
		body: JSON.stringify({
			userIds
		})
	});
}

export async function listUsers() {
	const payload = await managementRequest('/users');
	return parseListResponse(payload, ['users']).map(normalizeUser).sort((left, right) => left.name.localeCompare(right.name));
}

export async function getUserById(userId) {
	const payload = await managementRequest(`/users/${userId}`);
	return normalizeUser(payload);
}

export async function createUser(input) {
	const payload = await managementRequest('/users', {
		method: 'POST',
		body: JSON.stringify({
			primaryEmail: input.email,
			password: input.password,
			name: input.name
		})
	});

	return normalizeUser(payload);
}

export async function updateUser(userId, input) {
	const payload = await managementRequest(`/users/${userId}`, {
		method: 'PATCH',
		body: JSON.stringify({
			primaryEmail: input.email,
			name: input.name
		})
	});

	return normalizeUser(payload);
}

export async function listRoles() {
	const payload = await managementRequest('/roles');
	return parseListResponse(payload, ['roles']).map(normalizeRole).sort((left, right) => left.name.localeCompare(right.name));
}

export async function getRoleById(roleId) {
	const payload = await managementRequest(`/roles/${roleId}`);
	return normalizeRole(payload);
}

export async function createRole(input) {
	const payload = await managementRequest('/roles', {
		method: 'POST',
		body: JSON.stringify({
			name: input.name,
			description: input.description || undefined
		})
	});

	return normalizeRole(payload);
}

export async function updateRole(roleId, input) {
	const payload = await managementRequest(`/roles/${roleId}`, {
		method: 'PATCH',
		body: JSON.stringify({
			name: input.name,
			description: input.description || undefined
		})
	});

	return normalizeRole(payload);
}

async function ensureAdminResource() {
	const resourcesPayload = await managementRequest('/resources');
	const resources = parseListResponse(resourcesPayload, ['resources']);
	const indicator = getAdminResourceIndicator();
	const existingResource = resources.find((resource) => resource.indicator === indicator);

	if (existingResource) {
		return existingResource;
	}

	return managementRequest('/resources', {
		method: 'POST',
		body: JSON.stringify({
			name: getAdminResourceName(),
			indicator
		})
	});
}

export async function listPermissions() {
	const resource = await ensureAdminResource();
	const payload = await managementRequest(`/resources/${resource.id}/scopes`);

	return parseListResponse(payload, ['scopes'])
		.map((permission) => normalizePermission({ ...permission, resourceId: resource.id }))
		.sort((left, right) => left.key.localeCompare(right.key));
}

export async function getPermissionById(permissionId) {
	const permissions = await listPermissions();
	const permission = permissions.find((entry) => entry.id === permissionId);

	if (!permission) {
		throw new LogtoManagementError('Permission not found.', 404);
	}

	return permission;
}

export async function createPermission(input) {
	const resource = await ensureAdminResource();
	const payload = await managementRequest(`/resources/${resource.id}/scopes`, {
		method: 'POST',
		body: JSON.stringify({
			name: input.key,
			description: input.description || undefined
		})
	});

	return normalizePermission({ ...payload, resourceId: resource.id });
}

export async function updatePermission(permissionId, input) {
	const resource = await ensureAdminResource();
	const payload = await managementRequest(`/resources/${resource.id}/scopes/${permissionId}`, {
		method: 'PATCH',
		body: JSON.stringify({
			name: input.key,
			description: input.description || undefined
		})
	});

	return normalizePermission({ ...payload, resourceId: resource.id });
}

export async function getSecurityBootstrapState() {
	const organizations = await listOrganizations();

	return {
		hasOrganization: organizations.length > 0,
		organizationCount: organizations.length,
		organization: organizations[0]
	};
}