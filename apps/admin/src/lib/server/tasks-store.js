import { randomUUID } from 'node:crypto';
import { env } from '$env/dynamic/private';
import postgres from 'postgres';

const TASK_STATUSES = new Set(['open', 'in_progress', 'on_hold', 'deferred', 'canceled', 'completed']);
const PROGRESS_DRIVEN_STATUSES = new Set(['open', 'on_hold', 'deferred']);
const TASK_RECURRENCE_RULES = new Set(['none', 'daily', 'weekly', 'monthly', 'yearly']);
const TERMINAL_TASK_STATUSES = new Set(['completed', 'canceled']);
const STALE_TASK_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;
const SYSTEM_TASK_TAGS = {
	due: { key: 'due', name: 'Due' },
	stale: { key: 'stale', name: 'Stale' }
};
const SYSTEM_TASK_TAG_KEYS = new Set(Object.values(SYSTEM_TASK_TAGS).map((tag) => tag.key));

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
						progress_percentage integer NOT NULL DEFAULT 0,
						last_activity_at timestamptz NOT NULL DEFAULT now(),
					notification_offset_minutes integer,
					recurrence_rule text NOT NULL DEFAULT 'none',
					created_by_user_id text NOT NULL REFERENCES admin_app_users(id) ON DELETE RESTRICT,
					created_at timestamptz NOT NULL DEFAULT now(),
					updated_at timestamptz NOT NULL DEFAULT now(),
						CHECK (status IN ('open', 'in_progress', 'on_hold', 'deferred', 'canceled', 'completed')),
						CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
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
					ADD COLUMN IF NOT EXISTS created_via text NOT NULL DEFAULT 'ui',
					ADD COLUMN IF NOT EXISTS due_time text,
					ADD COLUMN IF NOT EXISTS has_due_time boolean NOT NULL DEFAULT true,
					ADD COLUMN IF NOT EXISTS progress_percentage integer NOT NULL DEFAULT 0
				`;

				await sql`ALTER TABLE admin_tasks ADD COLUMN IF NOT EXISTS last_activity_at timestamptz`;
				await sql`
					UPDATE admin_tasks
					SET last_activity_at = COALESCE(last_activity_at, updated_at, created_at, now())
					WHERE last_activity_at IS NULL
				`;
				await sql`ALTER TABLE admin_tasks ALTER COLUMN last_activity_at SET DEFAULT now()`;
				await sql`ALTER TABLE admin_tasks ALTER COLUMN last_activity_at SET NOT NULL`;

				await sql`ALTER TABLE admin_tasks DROP CONSTRAINT IF EXISTS admin_tasks_status_check`;
				await sql`
					ALTER TABLE admin_tasks
					ADD CONSTRAINT admin_tasks_status_check
					CHECK (status IN ('open', 'in_progress', 'on_hold', 'deferred', 'canceled', 'completed'))
				`;

				await sql`ALTER TABLE admin_tasks DROP CONSTRAINT IF EXISTS admin_tasks_progress_percentage_check`;
				await sql`
					ALTER TABLE admin_tasks
					ADD CONSTRAINT admin_tasks_progress_percentage_check
					CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
				`;

				await sql`
					CREATE UNIQUE INDEX IF NOT EXISTS admin_tasks_source_reference_idx
					ON admin_tasks (source_integration_id, source_external_id)
					WHERE source_integration_id IS NOT NULL AND source_external_id IS NOT NULL
				`;
				await sql`
					CREATE INDEX IF NOT EXISTS admin_tasks_last_activity_idx
					ON admin_tasks (last_activity_at)
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

			await sql`
				CREATE TABLE IF NOT EXISTS admin_task_comments (
					id text PRIMARY KEY,
					task_id text NOT NULL REFERENCES admin_tasks(id) ON DELETE CASCADE,
					author_user_id text NOT NULL REFERENCES admin_app_users(id) ON DELETE RESTRICT,
					body text NOT NULL,
					created_at timestamptz NOT NULL DEFAULT now(),
					updated_at timestamptz NOT NULL DEFAULT now()
				)
			`;

			await sql`
				CREATE INDEX IF NOT EXISTS admin_task_comments_task_created_idx
				ON admin_task_comments (task_id, created_at DESC)
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

function normalizeDueTime(value) {
	const normalizedValue = normalizeString(value);

	if (!normalizedValue) {
		return null;
	}

	if (!/^\d{2}:\d{2}$/.test(normalizedValue)) {
		throw new Error('Task due time is invalid.');
	}

	return normalizedValue;
}

function normalizeHasDueTime(value, dueTime) {
	if (value === false || value === 'false') {
		return false;
	}

	if (value === true || value === 'true') {
		return true;
	}

	return Boolean(dueTime);
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

function normalizeProgressPercentage(value, status) {
	const normalizedValue = normalizeString(value);

	if (status === 'completed') {
		return 100;
	}

	if (!normalizedValue) {
		return 0;
	}

	const parsedValue = Number.parseInt(normalizedValue, 10);

	if (!Number.isInteger(parsedValue) || parsedValue < 0 || parsedValue > 100) {
		throw new Error('Task progress must be a whole percentage between 0 and 100.');
	}

	return parsedValue;
}

function resolveTaskStatus(status, progressPercentage) {
	if (status === 'completed') {
		return 'completed';
	}

	if (progressPercentage > 0 && PROGRESS_DRIVEN_STATUSES.has(status)) {
		return 'in_progress';
	}

	return status;
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

function normalizeTaskTagCollection(tags) {
	const rawTags = Array.isArray(tags) ? tags : tags ? [tags] : [];
	const seenKeys = new Set();
	const normalizedTags = [];

	for (const rawTag of rawTags) {
		const sourceTag = typeof rawTag === 'string'
			? { key: rawTag, name: rawTag }
			: {
				key: rawTag?.key ?? rawTag?.name,
				name: rawTag?.name ?? rawTag?.key
			};
		const name = normalizeString(sourceTag.name);
		const key = normalizeTagKey(sourceTag.key ?? sourceTag.name);

		if (!name || !key || seenKeys.has(key)) {
			continue;
		}

		seenKeys.add(key);
		normalizedTags.push({ key, name });
	}

	return normalizedTags;
}

function getTaskActivityTimestamp(task) {
	return normalizeTimestamp(task.lastActivityAt ?? task.last_activity_at ?? task.updatedAt ?? task.updated_at ?? task.createdAt ?? task.created_at);
}

function shouldHaveDueTag(task, now = Date.now()) {
	if (TERMINAL_TASK_STATUSES.has(task.status)) {
		return false;
	}

	const dueAt = new Date(task.dueAt).getTime();
	return Number.isFinite(dueAt) && dueAt <= now;
}

function shouldHaveStaleTag(task, now = Date.now()) {
	if (TERMINAL_TASK_STATUSES.has(task.status)) {
		return false;
	}

	const lastActivityAt = new Date(getTaskActivityTimestamp(task)).getTime();
	return Number.isFinite(lastActivityAt) && lastActivityAt <= now - STALE_TASK_THRESHOLD_MS;
}

function applySystemTaskTags(tags, task) {
	const nextTags = normalizeTaskTagCollection(tags).filter((tag) => !SYSTEM_TASK_TAG_KEYS.has(tag.key));

	if (shouldHaveDueTag(task)) {
		nextTags.push(SYSTEM_TASK_TAGS.due);
	}

	if (shouldHaveStaleTag(task)) {
		nextTags.push(SYSTEM_TASK_TAGS.stale);
	}

	return normalizeTaskTagCollection(nextTags);
}

function summarizeSystemTagChanges(previousTags, nextTags) {
	const previousKeys = new Set(normalizeTaskTagCollection(previousTags).map((tag) => tag.key));
	const nextKeys = new Set(normalizeTaskTagCollection(nextTags).map((tag) => tag.key));

	return {
		dueAdded: Number(!previousKeys.has('due') && nextKeys.has('due')),
		dueRemoved: Number(previousKeys.has('due') && !nextKeys.has('due')),
		staleAdded: Number(!previousKeys.has('stale') && nextKeys.has('stale')),
		staleRemoved: Number(previousKeys.has('stale') && !nextKeys.has('stale'))
	};
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
		dueTime: task.has_due_time ? task.due_time ?? task.due_at?.toISOString?.().slice(11, 16) ?? null : null,
		hasDueTime: Boolean(task.has_due_time),
		progressPercentage: task.progress_percentage,
		notificationOffsetMinutes: task.notification_offset_minutes,
		recurrenceRule: task.recurrence_rule,
		createdByUserId: task.created_by_user_id,
		sourceIntegrationId: task.source_integration_id,
		sourceType: task.source_type,
		sourceLabel: task.source_label,
		sourceExternalId: task.source_external_id,
		createdVia: task.created_via,
		createdAt: normalizeTimestamp(task.created_at),
		updatedAt: normalizeTimestamp(task.updated_at),
		lastActivityAt: normalizeTimestamp(task.last_activity_at)
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

function normalizeTaskCommentRecord(comment) {
	return {
		id: comment.id,
		body: comment.body,
		author: {
			id: comment.author_id,
			name: comment.author_name,
			email: comment.author_email
		},
		createdAt: normalizeTimestamp(comment.created_at),
		updatedAt: normalizeTimestamp(comment.updated_at)
	};
}

function normalizeTaskCommentBody(value) {
	const normalizedValue = normalizeString(value);

	if (!normalizedValue) {
		throw new Error('Task comment is required.');
	}

	return normalizedValue;
}

function normalizeTaskInput(input) {
	const normalizedStatus = normalizeTaskStatus(input.status);
	const progressPercentage = normalizeProgressPercentage(input.progressPercentage, normalizedStatus);

	const task = {
		title: normalizeString(input.title),
		description: normalizeString(input.description),
		status: resolveTaskStatus(normalizedStatus, progressPercentage),
		dueAt: normalizeDueAt(input.dueAt),
		dueTime: normalizeDueTime(input.dueTime),
		hasDueTime: normalizeHasDueTime(input.hasDueTime, input.dueTime),
		progressPercentage,
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
	const uniqueUserIds = [...new Set(userIds)];

	if (uniqueUserIds.length === 0) {
		return;
	}

	const users = await executor`
		SELECT id
		FROM admin_app_users
		WHERE id IN ${executor(uniqueUserIds)}
	`;

	if (users.length !== uniqueUserIds.length) {
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

async function getTaskWithRelations(executor, taskId, options) {
	const includeComments = options?.includeComments ?? false;
	const [task] = await executor`
		SELECT *
		FROM admin_tasks
		WHERE id = ${taskId}
		LIMIT 1
	`;

	if (!task) {
		return null;
	}

	const relationPromises = [
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
	];

	if (includeComments) {
		relationPromises.push(executor`
			SELECT c.id,
				c.body,
				c.created_at,
				c.updated_at,
				u.id AS author_id,
				u.name AS author_name,
				u.email AS author_email
			FROM admin_task_comments c
			JOIN admin_app_users u ON u.id = c.author_user_id
			WHERE c.task_id = ${taskId}
			ORDER BY c.created_at DESC
		`);
	}

	const [assignedUsers, tags, comments = []] = await Promise.all(relationPromises);

	return {
		...normalizeTaskRecord(task),
		assignedUsers: assignedUsers.map(normalizeUserRecord),
		tags: tags.map(normalizeTagRecord),
		comments: comments.map(normalizeTaskCommentRecord)
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

export async function getTaskById(taskId, options = {}) {
	await ensureSchema();
	const sql = getSql();
	return getTaskWithRelations(sql, taskId, options);
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
		const activityTimestamp = new Date().toISOString();
		const tags = applySystemTaskTags(task.tags, {
			...task,
			lastActivityAt: activityTimestamp
		});

		const [createdTask] = await tx`
			INSERT INTO admin_tasks (
				id,
				title,
				description,
				status,
				due_at,
				due_time,
				has_due_time,
				progress_percentage,
				last_activity_at,
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
				${task.dueTime},
				${task.hasDueTime},
				${task.progressPercentage},
				${activityTimestamp},
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
		await syncTaskTags(tx, createdTask.id, tags);

		return getTaskWithRelations(tx, createdTask.id);
	});
}

export async function updateTask(taskId, input) {
	await ensureSchema();
	const sql = getSql();
	const task = normalizeTaskInput(input);

	return sql.begin(async (tx) => {
		await ensureUsersExist(tx, [task.createdByUserId, ...task.assignedUserIds]);
		const activityTimestamp = new Date().toISOString();
		const tags = applySystemTaskTags(task.tags, {
			...task,
			lastActivityAt: activityTimestamp
		});

		const [updatedTask] = await tx`
			UPDATE admin_tasks
			SET title = ${task.title},
				description = ${task.description},
				status = ${task.status},
				due_at = ${task.dueAt},
				due_time = ${task.dueTime},
				has_due_time = ${task.hasDueTime},
				progress_percentage = ${task.progressPercentage},
				last_activity_at = ${activityTimestamp},
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
		await syncTaskTags(tx, taskId, tags);

		return getTaskWithRelations(tx, taskId);
	});
}

export async function createTaskComment(taskId, input) {
	await ensureSchema();
	const sql = getSql();
	const normalizedTaskId = normalizeString(taskId);
	const authorUserId = normalizeString(input.authorUserId);
	const body = normalizeTaskCommentBody(input.body);

	if (!normalizedTaskId) {
		throw new Error('Task ID is required to add a comment.');
	}

	if (!authorUserId) {
		throw new Error('Comment author is required.');
	}

	return sql.begin(async (tx) => {
		await ensureUsersExist(tx, [authorUserId]);
		const existingTask = await getTaskWithRelations(tx, normalizedTaskId);

		if (!existingTask) {
			throw new Error('Task not found.');
		}

		await tx`
			INSERT INTO admin_task_comments (
				id,
				task_id,
				author_user_id,
				body
			)
			VALUES (
				${randomUUID()},
				${normalizedTaskId},
				${authorUserId},
				${body}
			)
		`;

		const activityTimestamp = new Date().toISOString();
		await tx`
			UPDATE admin_tasks
			SET last_activity_at = ${activityTimestamp},
				updated_at = now()
			WHERE id = ${normalizedTaskId}
		`;
		await syncTaskTags(
			tx,
			normalizedTaskId,
			applySystemTaskTags(existingTask.tags, {
				...existingTask,
				lastActivityAt: activityTimestamp
			})
		);

		return getTaskWithRelations(tx, normalizedTaskId, { includeComments: true });
	});
}

export async function reconcileTaskSystemTags() {
	await ensureSchema();
	const sql = getSql();
	const tasks = await sql`
		SELECT id
		FROM admin_tasks
	`;

	return sql.begin(async (tx) => {
		const summary = {
			scanned: 0,
			updated: 0,
			dueAdded: 0,
			dueRemoved: 0,
			staleAdded: 0,
			staleRemoved: 0
		};

		for (const task of tasks) {
			const currentTask = await getTaskWithRelations(tx, task.id);

			if (!currentTask) {
				continue;
			}

			summary.scanned += 1;
			const nextTags = applySystemTaskTags(currentTask.tags, currentTask);
			const changes = summarizeSystemTagChanges(currentTask.tags, nextTags);

			if (changes.dueAdded || changes.dueRemoved || changes.staleAdded || changes.staleRemoved) {
				await syncTaskTags(tx, currentTask.id, nextTags);
				summary.updated += 1;
				summary.dueAdded += changes.dueAdded;
				summary.dueRemoved += changes.dueRemoved;
				summary.staleAdded += changes.staleAdded;
				summary.staleRemoved += changes.staleRemoved;
			}
		}

		return summary;
	});
}