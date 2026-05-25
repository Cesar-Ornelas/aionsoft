import { randomUUID } from 'node:crypto';
import { env } from '$env/dynamic/private';
import postgres from 'postgres';

const TASK_STATUSES = new Set(['open', 'completed']);
const TASK_RECURRENCE_RULES = new Set(['none', 'daily', 'weekly', 'monthly', 'yearly']);

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
				CREATE TABLE IF NOT EXISTS admin_tasks (
					id text PRIMARY KEY,
					title text NOT NULL,
					description text NOT NULL DEFAULT '',
					status text NOT NULL DEFAULT 'open',
					due_at timestamptz NOT NULL,
					notification_offset_minutes integer,
					recurrence_rule text NOT NULL DEFAULT 'none',
					created_by_user_id text NOT NULL REFERENCES admin_app_users(id) ON DELETE RESTRICT,
					created_at timestamptz NOT NULL DEFAULT now(),
					updated_at timestamptz NOT NULL DEFAULT now(),
					CHECK (status IN ('open', 'completed')),
					CHECK (recurrence_rule IN ('none', 'daily', 'weekly', 'monthly', 'yearly')),
					CHECK (notification_offset_minutes IS NULL OR notification_offset_minutes >= 0)
				)
			`;

				await sql`
					ALTER TABLE admin_tasks
					ADD COLUMN IF NOT EXISTS source_integration_id text,
					ADD COLUMN IF NOT EXISTS source_type text,
					ADD COLUMN IF NOT EXISTS source_label text,
					ADD COLUMN IF NOT EXISTS source_external_id text,
					ADD COLUMN IF NOT EXISTS created_via text NOT NULL DEFAULT 'ui'
				`;

				await sql`
					CREATE UNIQUE INDEX IF NOT EXISTS admin_tasks_source_reference_idx
					ON admin_tasks (source_integration_id, source_external_id)
					WHERE source_integration_id IS NOT NULL AND source_external_id IS NOT NULL
				`;

			await sql`
				CREATE TABLE IF NOT EXISTS admin_task_assignments (
					task_id text NOT NULL REFERENCES admin_tasks(id) ON DELETE CASCADE,
					user_id text NOT NULL REFERENCES admin_app_users(id) ON DELETE CASCADE,
					created_at timestamptz NOT NULL DEFAULT now(),
					PRIMARY KEY (task_id, user_id)
				)
			`;

			await sql`
				CREATE TABLE IF NOT EXISTS admin_task_tags (
					id text PRIMARY KEY,
					key text NOT NULL UNIQUE,
					name text NOT NULL,
					created_at timestamptz NOT NULL DEFAULT now(),
					updated_at timestamptz NOT NULL DEFAULT now()
				)
			`;

			await sql`
				CREATE TABLE IF NOT EXISTS admin_task_tag_links (
					task_id text NOT NULL REFERENCES admin_tasks(id) ON DELETE CASCADE,
					tag_id text NOT NULL REFERENCES admin_task_tags(id) ON DELETE CASCADE,
					created_at timestamptz NOT NULL DEFAULT now(),
					PRIMARY KEY (task_id, tag_id)
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

function normalizeTimestamp(value) {
	return value?.toISOString?.() ?? value;
}

function normalizeString(value) {
	return String(value ?? '').trim();
}

function normalizeNullableString(value) {
	const normalizedValue = normalizeString(value);
	return normalizedValue || null;
}

function normalizeTaskStatus(value) {
	const normalizedValue = normalizeString(value).toLowerCase() || 'open';

	if (!TASK_STATUSES.has(normalizedValue)) {
		throw new Error('Task status is invalid.');
	}

	return normalizedValue;
}

function normalizeTaskRecurrenceRule(value) {
	const normalizedValue = normalizeString(value).toLowerCase() || 'none';

	if (!TASK_RECURRENCE_RULES.has(normalizedValue)) {
		throw new Error('Task recurrence rule is invalid.');
	}

	return normalizedValue;
}

function normalizeDueAt(value) {
	const normalizedValue = normalizeString(value);

	if (!normalizedValue) {
		throw new Error('Task due date is required.');
	}

	const date = new Date(normalizedValue);

	if (Number.isNaN(date.getTime())) {
		throw new Error('Task due date is invalid.');
	}

	return date.toISOString();
}

function normalizeNotificationOffset(value) {
	const normalizedValue = normalizeString(value);

	if (!normalizedValue) {
		return null;
	}

	const parsedValue = Number.parseInt(normalizedValue, 10);

	if (!Number.isInteger(parsedValue) || parsedValue < 0) {
		throw new Error('Notification offset must be zero or greater.');
	}

	return parsedValue;
}

function normalizeTagKey(value) {
	return normalizeString(value)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function normalizeTagsInput(value) {
	const rawTags = Array.isArray(value)
		? value
		: normalizeString(value)
				.split(',')
				.map((tag) => tag.trim())
				.filter(Boolean);

		const seenKeys = new Set();
		const tags = [];

		for (const rawTag of rawTags) {
			const name = normalizeString(rawTag);
			const key = normalizeTagKey(name);

			if (!name || !key || seenKeys.has(key)) {
				continue;
			}

			seenKeys.add(key);
			tags.push({ key, name });
		}

		return tags;
}

function normalizeAssignedUserIds(value) {
	const userIds = Array.isArray(value) ? value : value ? [value] : [];
	const normalizedUserIds = [];
	const seenUserIds = new Set();

	for (const userId of userIds) {
		const normalizedUserId = normalizeString(userId);

		if (!normalizedUserId || seenUserIds.has(normalizedUserId)) {
			continue;
		}

		seenUserIds.add(normalizedUserId);
		normalizedUserIds.push(normalizedUserId);
	}

	return normalizedUserIds;
}

function normalizeTaskRecord(task) {
	return {
		id: task.id,
		title: task.title,
		description: task.description,
		status: task.status,
		dueAt: normalizeTimestamp(task.due_at),
		notificationOffsetMinutes: task.notification_offset_minutes,
		recurrenceRule: task.recurrence_rule,
		createdByUserId: task.created_by_user_id,
		sourceIntegrationId: task.source_integration_id,
		sourceType: task.source_type,
		sourceLabel: task.source_label,
		sourceExternalId: task.source_external_id,
		createdVia: task.created_via,
		createdAt: normalizeTimestamp(task.created_at),
		updatedAt: normalizeTimestamp(task.updated_at)
	};
}

function normalizeUserRecord(user) {
	return {
		id: user.id,
		name: user.name,
		email: user.email,
		createdAt: normalizeTimestamp(user.created_at),
		updatedAt: normalizeTimestamp(user.updated_at)
	};
}

function normalizeTagRecord(tag) {
	return {
		id: tag.id,
		key: tag.key,
		name: tag.name,
		createdAt: normalizeTimestamp(tag.created_at),
		updatedAt: normalizeTimestamp(tag.updated_at)
	};
}

function normalizeTaskInput(input) {
	const task = {
		title: normalizeString(input.title),
		description: normalizeString(input.description),
		status: normalizeTaskStatus(input.status),
		dueAt: normalizeDueAt(input.dueAt),
		notificationOffsetMinutes: normalizeNotificationOffset(input.notificationOffsetMinutes),
		recurrenceRule: normalizeTaskRecurrenceRule(input.recurrenceRule),
		assignedUserIds: normalizeAssignedUserIds(input.assignedUserIds),
		tags: normalizeTagsInput(input.tags),
		createdByUserId: normalizeString(input.createdByUserId),
		sourceIntegrationId: normalizeNullableString(input.sourceIntegrationId),
		sourceType: normalizeNullableString(input.sourceType),
		sourceLabel: normalizeNullableString(input.sourceLabel),
		sourceExternalId: normalizeNullableString(input.sourceExternalId),
		createdVia: normalizeString(input.createdVia) || 'ui'
	};

	if (!task.title) {
		throw new Error('Task title is required.');
	}

	if (!task.createdByUserId) {
		throw new Error('Task creator is required.');
	}

	if (task.sourceIntegrationId && !task.sourceExternalId) {
		throw new Error('An external source reference is required for integration-created tasks.');
	}

	return task;
}

async function ensureUsersExist(executor, userIds) {
	if (userIds.length === 0) {
		return;
	}

	const users = await executor`
		SELECT id
		FROM admin_app_users
		WHERE id IN ${executor(userIds)}
	`;

	if (users.length !== userIds.length) {
		throw new Error('One or more assigned users could not be found.');
	}
}

async function upsertTaskTags(executor, tags) {
	const persistedTags = [];

	for (const tag of tags) {
		const [persistedTag] = await executor`
			INSERT INTO admin_task_tags (id, key, name)
			VALUES (${randomUUID()}, ${tag.key}, ${tag.name})
			ON CONFLICT (key)
			DO UPDATE SET
				name = EXCLUDED.name,
				updated_at = now()
			RETURNING *
		`;

		persistedTags.push(persistedTag);
	}

	return persistedTags;
}

async function syncTaskAssignments(executor, taskId, userIds) {
	await executor`
		DELETE FROM admin_task_assignments
		WHERE task_id = ${taskId}
	`;

	for (const userId of userIds) {
		await executor`
			INSERT INTO admin_task_assignments (task_id, user_id)
			VALUES (${taskId}, ${userId})
		`;
	}
}

async function syncTaskTags(executor, taskId, tags) {
	await executor`
		DELETE FROM admin_task_tag_links
		WHERE task_id = ${taskId}
	`;

	const persistedTags = await upsertTaskTags(executor, tags);

	for (const tag of persistedTags) {
		await executor`
			INSERT INTO admin_task_tag_links (task_id, tag_id)
			VALUES (${taskId}, ${tag.id})
		`;
	}
}

async function getTaskWithRelations(executor, taskId) {
	const [task] = await executor`
		SELECT *
		FROM admin_tasks
		WHERE id = ${taskId}
		LIMIT 1
	`;

	if (!task) {
		return null;
	}

	const [assignedUsers, tags] = await Promise.all([
		executor`
			SELECT u.*
			FROM admin_task_assignments ta
			JOIN admin_app_users u ON u.id = ta.user_id
			WHERE ta.task_id = ${taskId}
			ORDER BY u.name ASC, u.email ASC
		`,
		executor`
			SELECT t.*
			FROM admin_task_tag_links ttl
			JOIN admin_task_tags t ON t.id = ttl.tag_id
			WHERE ttl.task_id = ${taskId}
			ORDER BY t.name ASC
		`
	]);

	return {
		...normalizeTaskRecord(task),
		assignedUsers: assignedUsers.map(normalizeUserRecord),
		tags: tags.map(normalizeTagRecord)
	};
}

export function getTasksStoreErrorMessage(error, fallback = 'The requested task change could not be completed.') {
	if (error?.code === '23505') {
		return 'A task record with the same unique value already exists.';
	}

	if (error instanceof Error && error.message) {
		return error.message;
	}

	return fallback;
}

export async function listAssignableUsers() {
	await ensureSchema();
	const sql = getSql();
	const users = await sql`
		SELECT *
		FROM admin_app_users
		ORDER BY name ASC, email ASC
	`;

	return users.map(normalizeUserRecord);
}

export async function listTasks() {
	await ensureSchema();
	const sql = getSql();
	const tasks = await sql`
		SELECT id
		FROM admin_tasks
		ORDER BY due_at ASC, created_at DESC
	`;

	return Promise.all(tasks.map((task) => getTaskWithRelations(sql, task.id)));
}

export async function getTaskById(taskId) {
	await ensureSchema();
	const sql = getSql();
	return getTaskWithRelations(sql, taskId);
}

export async function getTaskBySourceReference(sourceIntegrationId, sourceExternalId) {
	await ensureSchema();
	const sql = getSql();
	const normalizedIntegrationId = normalizeNullableString(sourceIntegrationId);
	const normalizedExternalId = normalizeNullableString(sourceExternalId);

	if (!normalizedIntegrationId || !normalizedExternalId) {
		return null;
	}

	const [task] = await sql`
		SELECT id
		FROM admin_tasks
		WHERE source_integration_id = ${normalizedIntegrationId}
			AND source_external_id = ${normalizedExternalId}
		LIMIT 1
	`;

	return task ? getTaskWithRelations(sql, task.id) : null;
}

export async function createTask(input) {
	await ensureSchema();
	const sql = getSql();
	const task = normalizeTaskInput(input);

	return sql.begin(async (tx) => {
		await ensureUsersExist(tx, [task.createdByUserId, ...task.assignedUserIds]);

		const [createdTask] = await tx`
			INSERT INTO admin_tasks (
				id,
				title,
				description,
				status,
				due_at,
				notification_offset_minutes,
				recurrence_rule,
				created_by_user_id,
				source_integration_id,
				source_type,
				source_label,
				source_external_id,
				created_via
			)
			VALUES (
				${randomUUID()},
				${task.title},
				${task.description},
				${task.status},
				${task.dueAt},
				${task.notificationOffsetMinutes},
				${task.recurrenceRule},
				${task.createdByUserId},
				${task.sourceIntegrationId},
				${task.sourceType},
				${task.sourceLabel},
				${task.sourceExternalId},
				${task.createdVia}
			)
			RETURNING *
		`;

		await syncTaskAssignments(tx, createdTask.id, task.assignedUserIds);
		await syncTaskTags(tx, createdTask.id, task.tags);

		return getTaskWithRelations(tx, createdTask.id);
	});
}

export async function updateTask(taskId, input) {
	await ensureSchema();
	const sql = getSql();
	const task = normalizeTaskInput(input);

	return sql.begin(async (tx) => {
		await ensureUsersExist(tx, [task.createdByUserId, ...task.assignedUserIds]);

		const [updatedTask] = await tx`
			UPDATE admin_tasks
			SET title = ${task.title},
				description = ${task.description},
				status = ${task.status},
				due_at = ${task.dueAt},
				notification_offset_minutes = ${task.notificationOffsetMinutes},
				recurrence_rule = ${task.recurrenceRule},
				created_by_user_id = ${task.createdByUserId},
				updated_at = now()
			WHERE id = ${taskId}
			RETURNING *
		`;

		if (!updatedTask) {
			return null;
		}

		await syncTaskAssignments(tx, taskId, task.assignedUserIds);
		await syncTaskTags(tx, taskId, task.tags);

		return getTaskWithRelations(tx, taskId);
	});
}