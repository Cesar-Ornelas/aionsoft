import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { env } from '$env/dynamic/private';
import postgres from 'postgres';
import { ensureAdminAccessSchema } from '$lib/server/admin-access-store';
import { ensureClientsSchema } from '$lib/server/clients-store';

const CLIENT_API_TOKEN_STATUSES = new Set(['active', 'revoked']);
const CLIENT_API_TOKEN_PERMISSIONS = new Set(['tasks:read', 'invoices:read']);

let sqlClient;
let schemaPromise;

function getRequiredEnv(name) {
	const value = env[name]?.trim();

	if (!value) {
		throw new Error(`Missing required admin data env var: ${name}`);
	}

	return value;
}

function getSql() {
	if (!sqlClient) {
		sqlClient = postgres(getRequiredEnv('DATABASE_URL'), {
			max: 1,
			prepare: false
		});
	}

	return sqlClient;
}

async function ensureSchema() {
	if (!schemaPromise) {
		const sql = getSql();
		schemaPromise = (async () => {
			await Promise.all([ensureAdminAccessSchema(), ensureClientsSchema()]);

			await sql`
				CREATE TABLE IF NOT EXISTS admin_client_api_tokens (
					id text PRIMARY KEY,
					client_id text NOT NULL REFERENCES admin_clients(id) ON DELETE CASCADE,
					name text NOT NULL,
					status text NOT NULL DEFAULT 'active',
					token_hash text NOT NULL UNIQUE,
					token_hint text NOT NULL,
					permissions text[] NOT NULL DEFAULT '{}'::text[],
					created_by_user_id text NOT NULL REFERENCES admin_app_users(id) ON DELETE RESTRICT,
					last_used_at timestamptz,
					rotated_at timestamptz,
					revoked_at timestamptz,
					created_at timestamptz NOT NULL DEFAULT now(),
					updated_at timestamptz NOT NULL DEFAULT now(),
					CHECK (status IN ('active', 'revoked'))
				)
			`;

			await sql`
				CREATE INDEX IF NOT EXISTS admin_client_api_tokens_client_created_idx
				ON admin_client_api_tokens (client_id, created_at DESC)
			`;
		})();

		schemaPromise = schemaPromise.catch((error) => {
			schemaPromise = undefined;
			throw error;
		});
	}

	await schemaPromise;
}

function normalizeString(value) {
	return String(value ?? '').trim();
}

function normalizeTimestamp(value) {
	return value?.toISOString?.() ?? value;
}

function normalizeStatus(value) {
	const normalizedValue = normalizeString(value).toLowerCase() || 'active';

	if (!CLIENT_API_TOKEN_STATUSES.has(normalizedValue)) {
		throw new Error('Client API token status is invalid.');
	}

	return normalizedValue;
}

function normalizePermissions(value) {
	const items = Array.isArray(value) ? value : value ? [value] : [];
	const permissions = [];
	const seen = new Set();

	for (const item of items) {
		const permission = normalizeString(item).toLowerCase();

		if (!permission || seen.has(permission)) {
			continue;
		}

		if (!CLIENT_API_TOKEN_PERMISSIONS.has(permission)) {
			throw new Error(`Unsupported client API token permission: ${permission}`);
		}

		seen.add(permission);
		permissions.push(permission);
	}

	if (permissions.length === 0) {
		throw new Error('At least one client API permission is required.');
	}

	return permissions;
}

function hashToken(token) {
	return createHash('sha256').update(token).digest('hex');
}

function buildTokenValue() {
	return `act_${randomBytes(24).toString('base64url')}`;
}

function buildTokenHint(token) {
	return `${token.slice(0, 7)}...${token.slice(-4)}`;
}

function normalizeClientApiTokenRecord(record) {
	return {
		id: record.id,
		clientId: record.client_id,
		name: record.name,
		status: normalizeStatus(record.status),
		tokenHint: record.token_hint,
		permissions: record.permissions ?? [],
		createdByUserId: record.created_by_user_id,
		lastUsedAt: normalizeTimestamp(record.last_used_at),
		rotatedAt: normalizeTimestamp(record.rotated_at),
		revokedAt: normalizeTimestamp(record.revoked_at),
		createdAt: normalizeTimestamp(record.created_at),
		updatedAt: normalizeTimestamp(record.updated_at)
	};
}

async function ensureUsersExist(executor, userIds) {
	const normalizedUserIds = [...new Set(userIds.map((userId) => normalizeString(userId)).filter(Boolean))];

	if (normalizedUserIds.length === 0) {
		throw new Error('Client API token user references are required.');
	}

	const users = await executor`
		SELECT id
		FROM admin_app_users
		WHERE id IN ${executor(normalizedUserIds)}
	`;

	if (users.length !== normalizedUserIds.length) {
		throw new Error('One or more client API token users could not be found.');
	}
}

async function ensureClientExists(executor, clientId) {
	const normalizedClientId = normalizeString(clientId);

	if (!normalizedClientId) {
		throw new Error('Client reference is required.');
	}

	const [client] = await executor`
		SELECT id
		FROM admin_clients
		WHERE id = ${normalizedClientId}
		LIMIT 1
	`;

	if (!client) {
		throw new Error('Client not found.');
	}

	return normalizedClientId;
}

export function getClientApiTokensStoreErrorMessage(error, fallback = 'The requested client API token change could not be completed.') {
	if (error?.code === '23505') {
		return 'A client API token with the same unique value already exists.';
	}

	if (error instanceof Error && error.message) {
		return error.message;
	}

	return fallback;
}

export function listClientApiTokenPermissions() {
	return [...CLIENT_API_TOKEN_PERMISSIONS];
}

export async function listClientApiTokens(clientId) {
	await ensureSchema();
	const sql = getSql();
	const normalizedClientId = normalizeString(clientId);
	const rows = await sql`
		SELECT *
		FROM admin_client_api_tokens
		WHERE client_id = ${normalizedClientId}
		ORDER BY created_at DESC, name ASC
	`;

	return rows.map(normalizeClientApiTokenRecord);
}

export async function createClientApiToken(input) {
	await ensureSchema();
	const sql = getSql();
	const clientId = normalizeString(input.clientId);
	const name = normalizeString(input.name);
	const createdByUserId = normalizeString(input.createdByUserId);
	const permissions = normalizePermissions(input.permissions);

	if (!name) {
		throw new Error('Token name is required.');
	}

	if (!createdByUserId) {
		throw new Error('Token creator user is required.');
	}

	const token = buildTokenValue();
	const tokenHash = hashToken(token);
	const tokenHint = buildTokenHint(token);

	return sql.begin(async (tx) => {
		const normalizedClientId = await ensureClientExists(tx, clientId);
		await ensureUsersExist(tx, [createdByUserId]);

		const [row] = await tx`
			INSERT INTO admin_client_api_tokens (
				id,
				client_id,
				name,
				status,
				token_hash,
				token_hint,
				permissions,
				created_by_user_id,
				rotated_at
			)
			VALUES (
				${randomUUID()},
				${normalizedClientId},
				${name},
				'active',
				${tokenHash},
				${tokenHint},
				${permissions},
				${createdByUserId},
				now()
			)
			RETURNING *
		`;

		return {
			tokenRecord: normalizeClientApiTokenRecord(row),
			token
		};
	});
}

export async function rotateClientApiToken(tokenId) {
	await ensureSchema();
	const sql = getSql();
	const normalizedTokenId = normalizeString(tokenId);
	const token = buildTokenValue();
	const tokenHash = hashToken(token);
	const tokenHint = buildTokenHint(token);

	const [row] = await sql`
		UPDATE admin_client_api_tokens
		SET token_hash = ${tokenHash},
			token_hint = ${tokenHint},
			status = 'active',
			revoked_at = null,
			rotated_at = now(),
			updated_at = now()
		WHERE id = ${normalizedTokenId}
		RETURNING *
	`;

	if (!row) {
		return null;
	}

	return {
		tokenRecord: normalizeClientApiTokenRecord(row),
		token
	};
}

export async function revokeClientApiToken(tokenId) {
	await ensureSchema();
	const sql = getSql();
	const [row] = await sql`
		UPDATE admin_client_api_tokens
		SET status = 'revoked',
			revoked_at = now(),
			updated_at = now()
		WHERE id = ${normalizeString(tokenId)}
		RETURNING *
	`;

	return row ? normalizeClientApiTokenRecord(row) : null;
}

export async function getClientApiTokenByToken(token) {
	await ensureSchema();
	const sql = getSql();
	const normalizedToken = normalizeString(token);

	if (!normalizedToken) {
		return null;
	}

	const [row] = await sql`
		SELECT *
		FROM admin_client_api_tokens
		WHERE token_hash = ${hashToken(normalizedToken)}
		LIMIT 1
	`;

	return row ? normalizeClientApiTokenRecord(row) : null;
}

export async function markClientApiTokenUsed(tokenId) {
	await ensureSchema();
	const sql = getSql();
	await sql`
		UPDATE admin_client_api_tokens
		SET last_used_at = now(),
			updated_at = now()
		WHERE id = ${normalizeString(tokenId)}
	`;
}

export function hasClientApiTokenPermission(tokenRecord, permission) {
	if (!tokenRecord || normalizeStatus(tokenRecord.status) !== 'active') {
		return false;
	}

	return (tokenRecord.permissions ?? []).includes(normalizeString(permission).toLowerCase());
}