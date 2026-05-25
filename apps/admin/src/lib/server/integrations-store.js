import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { env } from '$env/dynamic/private';
import postgres from 'postgres';
import { ensureAdminAccessSchema } from '$lib/server/admin-access-store';

const INTEGRATION_STATUSES = new Set(['active', 'revoked']);
const INTEGRATION_PERMISSIONS = new Set(['tasks:create', 'tasks:update', 'tasks:read']);
const INTEGRATION_TASK_ACCESS_SCOPES = new Set(['own', 'tags', 'all']);

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
			await ensureAdminAccessSchema();

			await sql`
				CREATE TABLE IF NOT EXISTS admin_integrations (
					id text PRIMARY KEY,
					name text NOT NULL,
					kind text NOT NULL DEFAULT 'external',
					status text NOT NULL DEFAULT 'active',
					token_hash text NOT NULL UNIQUE,
					token_hint text NOT NULL,
					permissions text[] NOT NULL DEFAULT '{}'::text[],
						task_access_scope text NOT NULL DEFAULT 'own',
						allowed_task_tags text[] NOT NULL DEFAULT '{}'::text[],
					actor_user_id text NOT NULL REFERENCES admin_app_users(id) ON DELETE RESTRICT,
					created_by_user_id text NOT NULL REFERENCES admin_app_users(id) ON DELETE RESTRICT,
					last_used_at timestamptz,
					rotated_at timestamptz,
					revoked_at timestamptz,
					created_at timestamptz NOT NULL DEFAULT now(),
					updated_at timestamptz NOT NULL DEFAULT now(),
					CHECK (status IN ('active', 'revoked'))
				)
			`;

				await sql`ALTER TABLE admin_integrations ADD COLUMN IF NOT EXISTS task_access_scope text NOT NULL DEFAULT 'own'`;
				await sql`ALTER TABLE admin_integrations ADD COLUMN IF NOT EXISTS allowed_task_tags text[] NOT NULL DEFAULT '{}'::text[]`;
				await sql`ALTER TABLE admin_integrations DROP CONSTRAINT IF EXISTS admin_integrations_task_access_scope_check`;
				await sql`
					ALTER TABLE admin_integrations
					ADD CONSTRAINT admin_integrations_task_access_scope_check
					CHECK (task_access_scope IN ('own', 'tags', 'all'))
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

	if (!INTEGRATION_STATUSES.has(normalizedValue)) {
		throw new Error('Integration status is invalid.');
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

		if (!INTEGRATION_PERMISSIONS.has(permission)) {
			throw new Error(`Unsupported integration permission: ${permission}`);
		}

		seen.add(permission);
		permissions.push(permission);
	}

	if (permissions.length === 0) {
		throw new Error('At least one integration permission is required.');
	}

	return permissions;
}

function normalizeTagKey(value) {
	return normalizeString(value)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function normalizeTaskAccessScope(value) {
	const normalizedValue = normalizeString(value).toLowerCase() || 'own';

	if (!INTEGRATION_TASK_ACCESS_SCOPES.has(normalizedValue)) {
		throw new Error('Integration task access scope is invalid.');
	}

	return normalizedValue;
}

function normalizeAllowedTaskTags(value) {
	const items = Array.isArray(value) ? value : value ? [value] : [];
	const seenKeys = new Set();
	const tags = [];

	for (const item of items) {
		const normalizedKey = normalizeTagKey(item);

		if (!normalizedKey || seenKeys.has(normalizedKey)) {
			continue;
		}

		seenKeys.add(normalizedKey);
		tags.push(normalizedKey);
	}

	return tags;
}

function normalizeIntegrationTaskAccess(input) {
	const taskAccessScope = normalizeTaskAccessScope(input.taskAccessScope);
	const allowedTaskTags = taskAccessScope === 'tags'
		? normalizeAllowedTaskTags(input.allowedTaskTags)
		: [];

	if (taskAccessScope === 'tags' && allowedTaskTags.length === 0) {
		throw new Error('At least one allowed task tag is required when task scope is set to tags.');
	}

	return {
		taskAccessScope,
		allowedTaskTags
	};
}

function hashToken(token) {
	return createHash('sha256').update(token).digest('hex');
}

function buildTokenValue() {
	return `ait_${randomBytes(24).toString('base64url')}`;
}

function buildTokenHint(token) {
	return `${token.slice(0, 7)}...${token.slice(-4)}`;
}

function normalizeIntegrationRecord(record) {
	return {
		id: record.id,
		name: record.name,
		kind: record.kind,
		status: record.status,
		tokenHint: record.token_hint,
		permissions: record.permissions ?? [],
		taskAccessScope: normalizeTaskAccessScope(record.task_access_scope),
		allowedTaskTags: normalizeAllowedTaskTags(record.allowed_task_tags),
		actorUserId: record.actor_user_id,
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
		throw new Error('Integration user references are required.');
	}

	const users = await executor`
		SELECT id
		FROM admin_app_users
		WHERE id IN ${executor(normalizedUserIds)}
	`;

	if (users.length !== normalizedUserIds.length) {
		throw new Error('One or more integration users could not be found.');
	}
}

export function getIntegrationsStoreErrorMessage(error, fallback = 'The requested integration change could not be completed.') {
	if (error?.code === '23505') {
		return 'An integration with the same unique value already exists.';
	}

	if (error instanceof Error && error.message) {
		return error.message;
	}

	return fallback;
}

export function listIntegrationPermissions() {
	return [...INTEGRATION_PERMISSIONS];
}

export function listIntegrationTaskAccessScopes() {
	return [...INTEGRATION_TASK_ACCESS_SCOPES];
}

export async function listIntegrations() {
	await ensureSchema();
	const sql = getSql();
	const rows = await sql`
		SELECT *
		FROM admin_integrations
		ORDER BY created_at DESC, name ASC
	`;

	return rows.map(normalizeIntegrationRecord);
}

export async function getIntegrationById(integrationId) {
	await ensureSchema();
	const sql = getSql();
	const [row] = await sql`
		SELECT *
		FROM admin_integrations
		WHERE id = ${normalizeString(integrationId)}
		LIMIT 1
	`;

	return row ? normalizeIntegrationRecord(row) : null;
}

export async function createIntegration(input) {
	await ensureSchema();
	const sql = getSql();
	const name = normalizeString(input.name);
	const kind = normalizeString(input.kind) || 'external';
	const actorUserId = normalizeString(input.actorUserId);
	const createdByUserId = normalizeString(input.createdByUserId);
	const permissions = normalizePermissions(input.permissions);
	const taskAccess = normalizeIntegrationTaskAccess(input);

	if (!name) {
		throw new Error('Integration name is required.');
	}

	if (!actorUserId) {
		throw new Error('Integration actor user is required.');
	}

	if (!createdByUserId) {
		throw new Error('Integration creator user is required.');
	}

	const token = buildTokenValue();
	const tokenHash = hashToken(token);
	const tokenHint = buildTokenHint(token);

	return sql.begin(async (tx) => {
		await ensureUsersExist(tx, [actorUserId, createdByUserId]);

		const [row] = await tx`
			INSERT INTO admin_integrations (
				id,
				name,
				kind,
				status,
				token_hash,
				token_hint,
				permissions,
				task_access_scope,
				allowed_task_tags,
				actor_user_id,
				created_by_user_id,
				rotated_at
			)
			VALUES (
				${randomUUID()},
				${name},
				${kind},
				'active',
				${tokenHash},
				${tokenHint},
				${permissions},
				${taskAccess.taskAccessScope},
				${taskAccess.allowedTaskTags},
				${actorUserId},
				${createdByUserId},
				now()
			)
			RETURNING *
		`;

		return {
			integration: normalizeIntegrationRecord(row),
			token
		};
	});
}

export async function rotateIntegrationToken(integrationId) {
	await ensureSchema();
	const sql = getSql();
	const normalizedIntegrationId = normalizeString(integrationId);
	const token = buildTokenValue();
	const tokenHash = hashToken(token);
	const tokenHint = buildTokenHint(token);

	const [row] = await sql`
		UPDATE admin_integrations
		SET token_hash = ${tokenHash},
			token_hint = ${tokenHint},
			status = 'active',
			revoked_at = null,
			rotated_at = now(),
			updated_at = now()
		WHERE id = ${normalizedIntegrationId}
		RETURNING *
	`;

	if (!row) {
		return null;
	}

	return {
		integration: normalizeIntegrationRecord(row),
		token
	};
}

export async function revokeIntegration(integrationId) {
	await ensureSchema();
	const sql = getSql();
	const [row] = await sql`
		UPDATE admin_integrations
		SET status = 'revoked',
			revoked_at = now(),
			updated_at = now()
		WHERE id = ${normalizeString(integrationId)}
		RETURNING *
	`;

	return row ? normalizeIntegrationRecord(row) : null;
}

export async function getIntegrationByToken(token) {
	await ensureSchema();
	const sql = getSql();
	const normalizedToken = normalizeString(token);

	if (!normalizedToken) {
		return null;
	}

	const [row] = await sql`
		SELECT *
		FROM admin_integrations
		WHERE token_hash = ${hashToken(normalizedToken)}
		LIMIT 1
	`;

	return row ? normalizeIntegrationRecord(row) : null;
}

export async function markIntegrationUsed(integrationId) {
	await ensureSchema();
	const sql = getSql();
	await sql`
		UPDATE admin_integrations
		SET last_used_at = now(),
			updated_at = now()
		WHERE id = ${normalizeString(integrationId)}
	`;
}

export function hasIntegrationPermission(integration, permission) {
	if (!integration || normalizeStatus(integration.status) !== 'active') {
		return false;
	}

	return (integration.permissions ?? []).includes(normalizeString(permission).toLowerCase());
}

export function getIntegrationTaskAccessScope(integration) {
	if (!integration) {
		return {
			taskAccessScope: 'own',
			allowedTaskTags: []
		};
	}

	return {
		taskAccessScope: normalizeTaskAccessScope(integration.taskAccessScope),
		allowedTaskTags: normalizeAllowedTaskTags(integration.allowedTaskTags)
	};
}