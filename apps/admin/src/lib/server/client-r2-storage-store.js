// @ts-nocheck

import { randomUUID } from 'node:crypto';
import { env } from '$env/dynamic/private';
import postgres from 'postgres';
import { ensureAdminAccessSchema } from '$lib/server/admin-access-store';
import { ensureClientsSchema } from '$lib/server/clients-store';
import {
	buildCompanyStorageBasePrefix,
	buildCompanyStorageDirectoryPrefix,
	buildClientStorageBasePrefix,
	buildClientStorageDirectoryPrefix,
	ensureClientR2Prefix,
	getClientR2BucketName
} from '$lib/server/cloudflare-r2';

const STORAGE_STATUSES = new Set(['disabled', 'provisioning', 'enabled', 'error']);
const COMPANY_STORAGE_SCOPE = 'company';

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
				CREATE TABLE IF NOT EXISTS admin_client_r2_storage_configs (
					client_id text PRIMARY KEY REFERENCES admin_clients(id) ON DELETE CASCADE,
					status text NOT NULL DEFAULT 'disabled',
					bucket_name text,
					base_prefix text NOT NULL,
					provisioned_at timestamptz,
					last_synced_at timestamptz,
					last_error text,
					created_by_user_id text REFERENCES admin_app_users(id) ON DELETE SET NULL,
					created_at timestamptz NOT NULL DEFAULT now(),
					updated_at timestamptz NOT NULL DEFAULT now(),
					CHECK (status IN ('disabled', 'provisioning', 'enabled', 'error'))
				)
			`;

			await sql`
				CREATE TABLE IF NOT EXISTS admin_company_r2_storage_configs (
					scope text PRIMARY KEY,
					status text NOT NULL DEFAULT 'disabled',
					bucket_name text,
					base_prefix text NOT NULL,
					provisioned_at timestamptz,
					last_synced_at timestamptz,
					last_error text,
					created_by_user_id text REFERENCES admin_app_users(id) ON DELETE SET NULL,
					created_at timestamptz NOT NULL DEFAULT now(),
					updated_at timestamptz NOT NULL DEFAULT now(),
					CHECK (scope = 'company'),
					CHECK (status IN ('disabled', 'provisioning', 'enabled', 'error'))
				)
			`;

			await sql`
				CREATE TABLE IF NOT EXISTS admin_company_r2_storage_directories (
					id text PRIMARY KEY,
					scope text NOT NULL REFERENCES admin_company_r2_storage_configs(scope) ON DELETE CASCADE,
					path text NOT NULL,
					display_name text NOT NULL,
					is_active boolean NOT NULL DEFAULT true,
					created_by_user_id text REFERENCES admin_app_users(id) ON DELETE SET NULL,
					created_at timestamptz NOT NULL DEFAULT now(),
					updated_at timestamptz NOT NULL DEFAULT now(),
					UNIQUE (scope, path)
				)
			`;

			await sql`
				CREATE INDEX IF NOT EXISTS admin_company_r2_storage_directories_scope_idx
				ON admin_company_r2_storage_directories (scope, is_active, path)
			`;

			await sql`
				CREATE TABLE IF NOT EXISTS admin_client_r2_storage_directories (
					id text PRIMARY KEY,
					client_id text NOT NULL REFERENCES admin_clients(id) ON DELETE CASCADE,
					path text NOT NULL,
					display_name text NOT NULL,
					is_active boolean NOT NULL DEFAULT true,
					created_by_user_id text REFERENCES admin_app_users(id) ON DELETE SET NULL,
					created_at timestamptz NOT NULL DEFAULT now(),
					updated_at timestamptz NOT NULL DEFAULT now(),
					UNIQUE (client_id, path)
				)
			`;

			await sql`
				CREATE INDEX IF NOT EXISTS admin_client_r2_storage_directories_client_idx
				ON admin_client_r2_storage_directories (client_id, is_active, path)
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

function normalizeNullableString(value) {
	const normalizedValue = normalizeString(value);
	return normalizedValue || null;
}

function normalizeStorageStatus(value) {
	const normalizedValue = normalizeString(value).toLowerCase() || 'disabled';

	if (!STORAGE_STATUSES.has(normalizedValue)) {
		throw new Error('Client storage status is invalid.');
	}

	return normalizedValue;
}

function normalizeStorageDirectoryPath(value) {
	const normalizedValue = normalizeString(value)
		.toLowerCase()
		.replace(/\\+/g, '/')
		.replace(/\/+/g, '/')
		.replace(/^\/+|\/+$/g, '');

	if (!normalizedValue) {
		throw new Error('Directory path is required.');
	}

	if (normalizedValue.includes('..')) {
		throw new Error('Directory paths cannot traverse outside the client prefix.');
	}

	const segments = normalizedValue.split('/');

	for (const segment of segments) {
		if (!segment || segment === '.' || segment === '..') {
			throw new Error('Directory paths must use valid nested segments.');
		}

		if (!/^[a-z0-9][a-z0-9_-]*$/.test(segment)) {
			throw new Error('Directory paths may only use lowercase letters, numbers, dashes, underscores, and slashes.');
		}
	}

	return normalizedValue;
}

function buildDirectoryDisplayName(path, displayName) {
	const normalizedDisplayName = normalizeString(displayName);
	if (normalizedDisplayName) {
		return normalizedDisplayName;
	}

	const fallback = path.split('/').at(-1) ?? path;
	return fallback
		.split(/[-_]+/)
		.filter(Boolean)
		.map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
		.join(' ');
}

function normalizeStorageConfigRecord(record) {
	return {
		clientId: record.client_id,
		status: normalizeStorageStatus(record.status),
		bucketName: record.bucket_name,
		basePrefix: record.base_prefix,
		provisionedAt: normalizeTimestamp(record.provisioned_at),
		lastSyncedAt: normalizeTimestamp(record.last_synced_at),
		lastError: record.last_error,
		createdByUserId: record.created_by_user_id,
		createdAt: normalizeTimestamp(record.created_at),
		updatedAt: normalizeTimestamp(record.updated_at)
	};
}

function normalizeStorageDirectoryRecord(record) {
	return {
		id: record.id,
		clientId: record.client_id,
		path: record.path,
		displayName: record.display_name,
		isActive: Boolean(record.is_active),
		createdByUserId: record.created_by_user_id,
		createdAt: normalizeTimestamp(record.created_at),
		updatedAt: normalizeTimestamp(record.updated_at)
	};
}

function normalizeCompanyStorageConfigRecord(record) {
	return {
		scope: record.scope,
		status: normalizeStorageStatus(record.status),
		bucketName: record.bucket_name,
		basePrefix: record.base_prefix,
		provisionedAt: normalizeTimestamp(record.provisioned_at),
		lastSyncedAt: normalizeTimestamp(record.last_synced_at),
		lastError: record.last_error,
		createdByUserId: record.created_by_user_id,
		createdAt: normalizeTimestamp(record.created_at),
		updatedAt: normalizeTimestamp(record.updated_at)
	};
}

function normalizeCompanyStorageDirectoryRecord(record) {
	return {
		id: record.id,
		scope: record.scope,
		path: record.path,
		displayName: record.display_name,
		isActive: Boolean(record.is_active),
		createdByUserId: record.created_by_user_id,
		createdAt: normalizeTimestamp(record.created_at),
		updatedAt: normalizeTimestamp(record.updated_at)
	};
}

function normalizeClientStorageDirectoryOverviewRecord(record) {
	return {
		id: record.id,
		clientId: record.client_id,
		clientCompanyName: record.company_name,
		clientStatus: normalizeStorageStatus(record.client_status ?? 'disabled'),
		basePrefix: record.base_prefix,
		path: record.path,
		displayName: record.display_name,
		fullPrefix: `${record.base_prefix}${record.path}/`,
		isActive: Boolean(record.is_active),
		createdAt: normalizeTimestamp(record.created_at),
		updatedAt: normalizeTimestamp(record.updated_at)
	};
}

async function ensureUserExists(executor, userId) {
	const normalizedUserId = normalizeString(userId);

	if (!normalizedUserId) {
		throw new Error('A mapped local admin user is required.');
	}

	const [user] = await executor`
		SELECT id
		FROM admin_app_users
		WHERE id = ${normalizedUserId}
		LIMIT 1
	`;

	if (!user) {
		throw new Error('The current local admin user could not be found.');
	}

	return normalizedUserId;
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

async function getStorageConfigRecord(executor, clientId) {
	const [record] = await executor`
		SELECT *
		FROM admin_client_r2_storage_configs
		WHERE client_id = ${clientId}
		LIMIT 1
	`;

	return record ?? null;
}

async function getCompanyStorageConfigRecord(executor) {
	const [record] = await executor`
		SELECT *
		FROM admin_company_r2_storage_configs
		WHERE scope = ${COMPANY_STORAGE_SCOPE}
		LIMIT 1
	`;

	return record ?? null;
}

export function getClientR2StorageStoreErrorMessage(error, fallback = 'The requested client storage change could not be completed.') {
	if (error?.code === '23505') {
		return 'That client storage path already exists.';
	}

	if (error instanceof Error && error.message) {
		return error.message;
	}

	return fallback;
}

export async function getClientR2StorageByClientId(clientId) {
	await ensureSchema();
	const sql = getSql();
	const normalizedClientId = await ensureClientExists(sql, clientId);
	const [configRecord, directoryRows] = await Promise.all([
		getStorageConfigRecord(sql, normalizedClientId),
		sql`
			SELECT *
			FROM admin_client_r2_storage_directories
			WHERE client_id = ${normalizedClientId}
			ORDER BY is_active DESC, path ASC, created_at ASC
		`
	]);

	return {
		config: configRecord
			? normalizeStorageConfigRecord(configRecord)
			: {
				clientId: normalizedClientId,
				status: 'disabled',
				bucketName: null,
				basePrefix: buildClientStorageBasePrefix(normalizedClientId),
				provisionedAt: null,
				lastSyncedAt: null,
				lastError: null,
				createdByUserId: null,
				createdAt: null,
				updatedAt: null
			},
		directories: directoryRows.map(normalizeStorageDirectoryRecord)
	};
}

export async function getCompanyR2Storage() {
	await ensureSchema();
	const sql = getSql();
	const [configRecord, directoryRows] = await Promise.all([
		getCompanyStorageConfigRecord(sql),
		sql`
			SELECT *
			FROM admin_company_r2_storage_directories
			WHERE scope = ${COMPANY_STORAGE_SCOPE}
			ORDER BY is_active DESC, path ASC, created_at ASC
		`
	]);

	return {
		config: configRecord
			? normalizeCompanyStorageConfigRecord(configRecord)
			: {
				scope: COMPANY_STORAGE_SCOPE,
				status: 'disabled',
				bucketName: null,
				basePrefix: buildCompanyStorageBasePrefix(),
				provisionedAt: null,
				lastSyncedAt: null,
				lastError: null,
				createdByUserId: null,
				createdAt: null,
				updatedAt: null
			},
		directories: directoryRows.map(normalizeCompanyStorageDirectoryRecord)
	};
}

export async function listClientR2DirectoriesOverview() {
	await ensureSchema();
	const sql = getSql();
	const rows = await sql`
		SELECT d.*, c.company_name, cfg.base_prefix, cfg.status AS client_status
		FROM admin_client_r2_storage_directories d
		INNER JOIN admin_clients c ON c.id = d.client_id
		LEFT JOIN admin_client_r2_storage_configs cfg ON cfg.client_id = d.client_id
		ORDER BY c.company_name ASC, d.path ASC, d.created_at ASC
	`;

	return rows.map(normalizeClientStorageDirectoryOverviewRecord);
}

export async function enableCompanyR2Storage(input) {
	await ensureSchema();
	const sql = getSql();
	const createdByUserId = normalizeString(input.createdByUserId);
	const bucketName = getClientR2BucketName();
	const basePrefix = buildCompanyStorageBasePrefix();

	await ensureUserExists(sql, createdByUserId);

	await sql`
		INSERT INTO admin_company_r2_storage_configs (
			scope,
			status,
			bucket_name,
			base_prefix,
			created_by_user_id
		)
		VALUES (
			${COMPANY_STORAGE_SCOPE},
			'provisioning',
			${bucketName},
			${basePrefix},
			${createdByUserId}
		)
		ON CONFLICT (scope)
		DO UPDATE SET
			status = 'provisioning',
			bucket_name = EXCLUDED.bucket_name,
			base_prefix = EXCLUDED.base_prefix,
			last_error = null,
			updated_at = now()
	`;

	try {
		await ensureClientR2Prefix(basePrefix);
		await sql`
			UPDATE admin_company_r2_storage_configs
			SET status = 'enabled',
				bucket_name = ${bucketName},
				base_prefix = ${basePrefix},
				provisioned_at = COALESCE(provisioned_at, now()),
				last_synced_at = now(),
				last_error = null,
				updated_at = now()
			WHERE scope = ${COMPANY_STORAGE_SCOPE}
		`;
		return getCompanyR2Storage();
	} catch (error) {
		await sql`
			UPDATE admin_company_r2_storage_configs
			SET status = 'error',
				last_error = ${getClientR2StorageStoreErrorMessage(error)},
				updated_at = now()
			WHERE scope = ${COMPANY_STORAGE_SCOPE}
		`;
		throw error;
	}
}

export async function createCompanyR2StorageDirectory(input) {
	await ensureSchema();
	const sql = getSql();
	const createdByUserId = normalizeString(input.createdByUserId);
	const path = normalizeStorageDirectoryPath(input.path);
	const displayName = buildDirectoryDisplayName(path, input.displayName);

	await ensureUserExists(sql, createdByUserId);

	const config = await getCompanyStorageConfigRecord(sql);

	if (!config || config.status !== 'enabled') {
		throw new Error('Enable company storage before adding directories.');
	}

	const prefix = buildCompanyStorageDirectoryPrefix(path);

	try {
		await ensureClientR2Prefix(prefix);
	} catch (error) {
		await sql`
			UPDATE admin_company_r2_storage_configs
			SET status = 'error',
				last_error = ${getClientR2StorageStoreErrorMessage(error)},
				updated_at = now()
			WHERE scope = ${COMPANY_STORAGE_SCOPE}
		`;
		throw error;
	}

	const [row] = await sql`
		INSERT INTO admin_company_r2_storage_directories (
			id,
			scope,
			path,
			display_name,
			is_active,
			created_by_user_id
		)
		VALUES (
			${randomUUID()},
			${COMPANY_STORAGE_SCOPE},
			${path},
			${displayName},
			true,
			${createdByUserId}
		)
		RETURNING *
	`;

	await sql`
		UPDATE admin_company_r2_storage_configs
		SET last_synced_at = now(),
			last_error = null,
			status = 'enabled',
			updated_at = now()
		WHERE scope = ${COMPANY_STORAGE_SCOPE}
	`;

	return normalizeCompanyStorageDirectoryRecord(row);
}

export async function enableClientR2Storage(clientId, input) {
	await ensureSchema();
	const sql = getSql();
	const normalizedClientId = normalizeString(clientId);
	const createdByUserId = normalizeString(input.createdByUserId);
	const bucketName = getClientR2BucketName();
	const basePrefix = buildClientStorageBasePrefix(normalizedClientId);

	await ensureClientExists(sql, normalizedClientId);
	await ensureUserExists(sql, createdByUserId);

	await sql`
		INSERT INTO admin_client_r2_storage_configs (
			client_id,
			status,
			bucket_name,
			base_prefix,
			created_by_user_id
		)
		VALUES (
			${normalizedClientId},
			'provisioning',
			${bucketName},
			${basePrefix},
			${createdByUserId}
		)
		ON CONFLICT (client_id)
		DO UPDATE SET
			status = 'provisioning',
			bucket_name = EXCLUDED.bucket_name,
			base_prefix = EXCLUDED.base_prefix,
			last_error = null,
			updated_at = now()
	`;

	try {
		await ensureClientR2Prefix(basePrefix);
		await sql`
			UPDATE admin_client_r2_storage_configs
			SET status = 'enabled',
				bucket_name = ${bucketName},
				base_prefix = ${basePrefix},
				provisioned_at = COALESCE(provisioned_at, now()),
				last_synced_at = now(),
				last_error = null,
				updated_at = now()
			WHERE client_id = ${normalizedClientId}
		`;
		return getClientR2StorageByClientId(normalizedClientId);
	} catch (error) {
		await sql`
			UPDATE admin_client_r2_storage_configs
			SET status = 'error',
				last_error = ${getClientR2StorageStoreErrorMessage(error)},
				updated_at = now()
			WHERE client_id = ${normalizedClientId}
		`;
		throw error;
	}
}

export async function createClientR2StorageDirectory(clientId, input) {
	await ensureSchema();
	const sql = getSql();
	const normalizedClientId = normalizeString(clientId);
	const createdByUserId = normalizeString(input.createdByUserId);
	const path = normalizeStorageDirectoryPath(input.path);
	const displayName = buildDirectoryDisplayName(path, input.displayName);

	await ensureClientExists(sql, normalizedClientId);
	await ensureUserExists(sql, createdByUserId);

	const config = await getStorageConfigRecord(sql, normalizedClientId);

	if (!config || config.status !== 'enabled') {
		throw new Error('Enable client storage before adding allowed directories.');
	}

	const prefix = buildClientStorageDirectoryPrefix(normalizedClientId, path);

	try {
		await ensureClientR2Prefix(prefix);
	} catch (error) {
		await sql`
			UPDATE admin_client_r2_storage_configs
			SET status = 'error',
				last_error = ${getClientR2StorageStoreErrorMessage(error)},
				updated_at = now()
			WHERE client_id = ${normalizedClientId}
		`;
		throw error;
	}

	const [row] = await sql`
		INSERT INTO admin_client_r2_storage_directories (
			id,
			client_id,
			path,
			display_name,
			is_active,
			created_by_user_id
		)
		VALUES (
			${randomUUID()},
			${normalizedClientId},
			${path},
			${displayName},
			true,
			${createdByUserId}
		)
		RETURNING *
	`;

	await sql`
		UPDATE admin_client_r2_storage_configs
		SET last_synced_at = now(),
			last_error = null,
			status = 'enabled',
			updated_at = now()
		WHERE client_id = ${normalizedClientId}
	`;

	return normalizeStorageDirectoryRecord(row);
}