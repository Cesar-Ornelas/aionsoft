import { randomUUID } from 'node:crypto';
import { env } from '$env/dynamic/private';
import postgres from 'postgres';

const DEFAULT_ADMIN_ROLE = {
	key: 'admin',
	name: 'Admin',
	description: 'Default administrator role for the admin application.'
};

const DEFAULT_PERMISSIONS = [
	{
		key: 'manage:security',
		name: 'Manage security',
		description: 'Manage security bootstrap and access configuration.'
	},
	{
		key: 'manage:users',
		name: 'Manage users',
		description: 'Create and update user records for the admin application.'
	},
	{
		key: 'manage:roles',
		name: 'Manage roles',
		description: 'Create and update local admin roles.'
	},
	{
		key: 'manage:permissions',
		name: 'Manage permissions',
		description: 'Create and update local admin permissions.'
	}
];

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
			await sql`
				CREATE TABLE IF NOT EXISTS admin_app_users (
					id text PRIMARY KEY,
					logto_user_id text NOT NULL UNIQUE,
					email text NOT NULL,
					name text NOT NULL,
					logto_organization_id text,
					organization_name text,
					created_at timestamptz NOT NULL DEFAULT now(),
					updated_at timestamptz NOT NULL DEFAULT now()
				)
			`;

			await sql`
				CREATE TABLE IF NOT EXISTS admin_app_roles (
					id text PRIMARY KEY,
					key text NOT NULL UNIQUE,
					name text NOT NULL,
					description text NOT NULL DEFAULT '',
					is_system boolean NOT NULL DEFAULT false,
					created_at timestamptz NOT NULL DEFAULT now(),
					updated_at timestamptz NOT NULL DEFAULT now()
				)
			`;

			await sql`
				CREATE TABLE IF NOT EXISTS admin_app_permissions (
					id text PRIMARY KEY,
					key text NOT NULL UNIQUE,
					name text NOT NULL,
					description text NOT NULL DEFAULT '',
					created_at timestamptz NOT NULL DEFAULT now(),
					updated_at timestamptz NOT NULL DEFAULT now()
				)
			`;

			await sql`
				CREATE TABLE IF NOT EXISTS admin_app_role_permissions (
					role_id text NOT NULL REFERENCES admin_app_roles(id) ON DELETE CASCADE,
					permission_id text NOT NULL REFERENCES admin_app_permissions(id) ON DELETE CASCADE,
					created_at timestamptz NOT NULL DEFAULT now(),
					PRIMARY KEY (role_id, permission_id)
				)
			`;

			await sql`
				CREATE TABLE IF NOT EXISTS admin_app_user_roles (
					user_id text NOT NULL REFERENCES admin_app_users(id) ON DELETE CASCADE,
					role_id text NOT NULL REFERENCES admin_app_roles(id) ON DELETE CASCADE,
					created_at timestamptz NOT NULL DEFAULT now(),
					PRIMARY KEY (user_id, role_id)
				)
			`;
		})();

		schemaPromise = schemaPromise.catch((error) => {
			schemaPromise = undefined;
			throw error;
		});
	}

	await schemaPromise;
}

function normalizeRole(role) {
	return {
		id: role.id,
		key: role.key,
		name: role.name,
		description: role.description,
		createdAt: role.created_at?.toISOString?.() ?? role.created_at,
		updatedAt: role.updated_at?.toISOString?.() ?? role.updated_at
	};
}

function normalizePermission(permission) {
	return {
		id: permission.id,
		key: permission.key,
		name: permission.name,
		description: permission.description,
		createdAt: permission.created_at?.toISOString?.() ?? permission.created_at,
		updatedAt: permission.updated_at?.toISOString?.() ?? permission.updated_at
	};
}

function getKeyFallback(value, fallback = 'item') {
	return String(value || fallback)
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '') || fallback;
}

export function getAccessStoreErrorMessage(error, fallback = 'The requested access change could not be completed.') {
	if (error?.code === '23505') {
		return 'An item with the same key already exists.';
	}

	if (error instanceof Error && error.message) {
		return error.message;
	}

	return fallback;
}

async function upsertPermission(tx, permission) {
	const [record] = await tx`
		INSERT INTO admin_app_permissions (id, key, name, description)
		VALUES (${randomUUID()}, ${permission.key}, ${permission.name}, ${permission.description})
		ON CONFLICT (key)
		DO UPDATE SET
			name = EXCLUDED.name,
			description = EXCLUDED.description,
			updated_at = now()
		RETURNING *
	`;

	return record;
}

async function upsertRole(tx, role) {
	const [record] = await tx`
		INSERT INTO admin_app_roles (id, key, name, description, is_system)
		VALUES (${randomUUID()}, ${role.key}, ${role.name}, ${role.description}, ${role.isSystem ?? false})
		ON CONFLICT (key)
		DO UPDATE SET
			name = EXCLUDED.name,
			description = EXCLUDED.description,
			is_system = EXCLUDED.is_system,
			updated_at = now()
		RETURNING *
	`;

	return record;
}

export async function getAdminSetupState() {
	await ensureSchema();
	const sql = getSql();
	const [counts] = await sql`
		SELECT
			(SELECT COUNT(*)::int FROM admin_app_users) AS user_count,
			(SELECT COUNT(*)::int FROM admin_app_roles WHERE key = ${DEFAULT_ADMIN_ROLE.key}) AS admin_role_count,
			(SELECT COUNT(*)::int FROM admin_app_user_roles aur JOIN admin_app_roles ar ON ar.id = aur.role_id WHERE ar.key = ${DEFAULT_ADMIN_ROLE.key}) AS admin_assignment_count
	`;

	return {
		hasLocalUsers: counts.user_count > 0,
		hasAdminRole: counts.admin_role_count > 0,
		hasAdminAssignment: counts.admin_assignment_count > 0,
		isComplete: counts.admin_assignment_count > 0
	};
}

export async function bootstrapAdminAccess({ organization, user }) {
	await ensureSchema();
	const sql = getSql();

	return sql.begin(async (tx) => {
		const permissionRecords = [];

		for (const permission of DEFAULT_PERMISSIONS) {
			permissionRecords.push(await upsertPermission(tx, permission));
		}

		const adminRole = await upsertRole(tx, {
			...DEFAULT_ADMIN_ROLE,
			isSystem: true
		});

		for (const permission of permissionRecords) {
			await tx`
				INSERT INTO admin_app_role_permissions (role_id, permission_id)
				VALUES (${adminRole.id}, ${permission.id})
				ON CONFLICT (role_id, permission_id) DO NOTHING
			`;
		}

		const [appUser] = await tx`
			INSERT INTO admin_app_users (id, logto_user_id, email, name, logto_organization_id, organization_name)
			VALUES (${randomUUID()}, ${user.id}, ${user.email}, ${user.name}, ${organization.id}, ${organization.name})
			ON CONFLICT (logto_user_id)
			DO UPDATE SET
				email = EXCLUDED.email,
				name = EXCLUDED.name,
				logto_organization_id = EXCLUDED.logto_organization_id,
				organization_name = EXCLUDED.organization_name,
				updated_at = now()
			RETURNING *
		`;

		await tx`
			INSERT INTO admin_app_user_roles (user_id, role_id)
			VALUES (${appUser.id}, ${adminRole.id})
			ON CONFLICT (user_id, role_id) DO NOTHING
		`;

		return {
			userId: appUser.id,
			roleId: adminRole.id
		};
	});
}

export async function listLocalRoles() {
	await ensureSchema();
	const sql = getSql();
	const roles = await sql`
		SELECT *
		FROM admin_app_roles
		ORDER BY name ASC
	`;

	return roles.map(normalizeRole);
}

export async function getLocalRoleById(roleId) {
	await ensureSchema();
	const sql = getSql();
	const [role] = await sql`
		SELECT *
		FROM admin_app_roles
		WHERE id = ${roleId}
		LIMIT 1
	`;

	return role ? normalizeRole(role) : null;
}

export async function createLocalRole(input) {
	await ensureSchema();
	const sql = getSql();
	const roleKey = input.key || getKeyFallback(input.name, 'role');
	const roleName = input.name || input.key || 'Role';
	const [role] = await sql`
		INSERT INTO admin_app_roles (id, key, name, description, is_system)
		VALUES (${randomUUID()}, ${roleKey}, ${roleName}, ${input.description || ''}, false)
		RETURNING *
	`;

	return normalizeRole(role);
}

export async function updateLocalRole(roleId, input) {
	await ensureSchema();
	const sql = getSql();
	const roleKey = input.key || getKeyFallback(input.name, 'role');
	const roleName = input.name || input.key || 'Role';
	const [role] = await sql`
		UPDATE admin_app_roles
		SET key = ${roleKey},
			name = ${roleName},
			description = ${input.description || ''},
			updated_at = now()
		WHERE id = ${roleId}
		RETURNING *
	`;

	return role ? normalizeRole(role) : null;
}

export async function listLocalPermissions() {
	await ensureSchema();
	const sql = getSql();
	const permissions = await sql`
		SELECT *
		FROM admin_app_permissions
		ORDER BY key ASC
	`;

	return permissions.map(normalizePermission);
}

export async function getLocalPermissionById(permissionId) {
	await ensureSchema();
	const sql = getSql();
	const [permission] = await sql`
		SELECT *
		FROM admin_app_permissions
		WHERE id = ${permissionId}
		LIMIT 1
	`;

	return permission ? normalizePermission(permission) : null;
}

export async function createLocalPermission(input) {
	await ensureSchema();
	const sql = getSql();
	const permissionKey = input.key || getKeyFallback(input.name, 'permission');
	const permissionName = input.name || input.key || 'Permission';
	const [permission] = await sql`
		INSERT INTO admin_app_permissions (id, key, name, description)
		VALUES (${randomUUID()}, ${permissionKey}, ${permissionName}, ${input.description || ''})
		RETURNING *
	`;

	return normalizePermission(permission);
}

export async function updateLocalPermission(permissionId, input) {
	await ensureSchema();
	const sql = getSql();
	const permissionKey = input.key || getKeyFallback(input.name, 'permission');
	const permissionName = input.name || input.key || 'Permission';
	const [permission] = await sql`
		UPDATE admin_app_permissions
		SET key = ${permissionKey},
			name = ${permissionName},
			description = ${input.description || ''},
			updated_at = now()
		WHERE id = ${permissionId}
		RETURNING *
	`;

	return permission ? normalizePermission(permission) : null;
}