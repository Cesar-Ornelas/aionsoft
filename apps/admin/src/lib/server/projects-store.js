import { randomUUID } from 'node:crypto';
import { env } from '$env/dynamic/private';
import postgres from 'postgres';
import { ensureAdminAccessSchema } from '$lib/server/admin-access-store';
import { ensureClientsSchema } from '$lib/server/clients-store';

const DEFAULT_PHASES = ['Planning', 'Design', 'Development', 'QA', 'Release'];
const DEFAULT_BUCKETS = [
	{ key: 'backlog', name: 'Backlog', status: 'open', isTerminal: false, color: '#64748b' },
	{ key: 'in-progress', name: 'In progress', status: 'in_progress', isTerminal: false, color: '#f97316' },
	{ key: 'completed', name: 'Completed', status: 'completed', isTerminal: true, color: '#10b981' },
	{ key: 'canceled', name: 'Canceled', status: 'canceled', isTerminal: true, color: '#ef4444' }
];
const PROJECT_STATUSES = new Set(['planning', 'active', 'on_hold', 'completed', 'canceled']);
const TASK_STATUSES = new Set(['open', 'in_progress', 'on_hold', 'deferred', 'completed', 'canceled']);
const TASK_PRIORITIES = new Set(['low', 'normal', 'high', 'critical']);
const TERMINAL_TASK_STATUSES = new Set(['completed', 'canceled']);
const SNAPSHOT_VERSION = 1;

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
			await ensureClientsSchema();

			await sql`
				CREATE TABLE IF NOT EXISTS admin_projects (
					id text PRIMARY KEY,
					name text NOT NULL,
					description text NOT NULL DEFAULT '',
					status text NOT NULL DEFAULT 'active',
					start_at date,
					due_at date,
					audience_id text REFERENCES admin_clients(id) ON DELETE SET NULL,
					created_by_user_id text REFERENCES admin_app_users(id) ON DELETE SET NULL,
					created_at timestamptz NOT NULL DEFAULT now(),
					updated_at timestamptz NOT NULL DEFAULT now(),
					CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'canceled'))
				)
			`;

			await sql`
				ALTER TABLE admin_projects
				ADD COLUMN IF NOT EXISTS audience_id text REFERENCES admin_clients(id) ON DELETE SET NULL
			`;

			await sql`
				CREATE TABLE IF NOT EXISTS admin_project_phases (
					id text PRIMARY KEY,
					project_id text NOT NULL REFERENCES admin_projects(id) ON DELETE CASCADE,
					name text NOT NULL,
					description text NOT NULL DEFAULT '',
					start_at date,
					due_at date,
					sort_order integer NOT NULL DEFAULT 0,
					created_at timestamptz NOT NULL DEFAULT now(),
					updated_at timestamptz NOT NULL DEFAULT now()
				)
			`;

			await sql`
				CREATE TABLE IF NOT EXISTS admin_project_milestones (
					id text PRIMARY KEY,
					project_id text NOT NULL REFERENCES admin_projects(id) ON DELETE CASCADE,
					phase_id text NOT NULL REFERENCES admin_project_phases(id) ON DELETE CASCADE,
					name text NOT NULL,
					description text NOT NULL DEFAULT '',
					start_at date,
					due_at date,
					sort_order integer NOT NULL DEFAULT 0,
					created_at timestamptz NOT NULL DEFAULT now(),
					updated_at timestamptz NOT NULL DEFAULT now()
				)
			`;

			await sql`
				CREATE TABLE IF NOT EXISTS admin_project_buckets (
					id text PRIMARY KEY,
					project_id text NOT NULL REFERENCES admin_projects(id) ON DELETE CASCADE,
					key text NOT NULL,
					name text NOT NULL,
					status text NOT NULL DEFAULT 'open',
					color text NOT NULL DEFAULT '#64748b',
					is_terminal boolean NOT NULL DEFAULT false,
					sort_order integer NOT NULL DEFAULT 0,
					created_at timestamptz NOT NULL DEFAULT now(),
					updated_at timestamptz NOT NULL DEFAULT now(),
					UNIQUE (project_id, key),
					CHECK (status IN ('open', 'in_progress', 'on_hold', 'deferred', 'completed', 'canceled'))
				)
			`;

			await sql`
				ALTER TABLE admin_project_buckets
				ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '#64748b'
			`;

			await sql`
				CREATE TABLE IF NOT EXISTS admin_project_tasks (
					id text PRIMARY KEY,
					project_id text NOT NULL REFERENCES admin_projects(id) ON DELETE CASCADE,
					phase_id text REFERENCES admin_project_phases(id) ON DELETE SET NULL,
					milestone_id text REFERENCES admin_project_milestones(id) ON DELETE SET NULL,
					bucket_id text REFERENCES admin_project_buckets(id) ON DELETE SET NULL,
					title text NOT NULL,
					description text NOT NULL DEFAULT '',
					status text NOT NULL DEFAULT 'open',
					priority text NOT NULL DEFAULT 'normal',
					progress_percentage integer NOT NULL DEFAULT 0,
					start_at date,
					due_at date,
					sort_order integer NOT NULL DEFAULT 0,
					last_activity_at timestamptz NOT NULL DEFAULT now(),
					created_by_user_id text REFERENCES admin_app_users(id) ON DELETE SET NULL,
					created_at timestamptz NOT NULL DEFAULT now(),
					updated_at timestamptz NOT NULL DEFAULT now(),
					CHECK (status IN ('open', 'in_progress', 'on_hold', 'deferred', 'completed', 'canceled')),
					CHECK (priority IN ('low', 'normal', 'high', 'critical')),
					CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
				)
			`;

			await sql`
				CREATE TABLE IF NOT EXISTS admin_project_task_assignments (
					task_id text NOT NULL REFERENCES admin_project_tasks(id) ON DELETE CASCADE,
					user_id text NOT NULL REFERENCES admin_app_users(id) ON DELETE CASCADE,
					created_at timestamptz NOT NULL DEFAULT now(),
					PRIMARY KEY (task_id, user_id)
				)
			`;

			await sql`
				CREATE TABLE IF NOT EXISTS admin_project_task_tags (
					id text PRIMARY KEY,
					project_id text NOT NULL REFERENCES admin_projects(id) ON DELETE CASCADE,
					key text NOT NULL,
					name text NOT NULL,
					created_at timestamptz NOT NULL DEFAULT now(),
					updated_at timestamptz NOT NULL DEFAULT now(),
					UNIQUE (project_id, key)
				)
			`;

			await sql`
				CREATE TABLE IF NOT EXISTS admin_project_task_tag_links (
					task_id text NOT NULL REFERENCES admin_project_tasks(id) ON DELETE CASCADE,
					tag_id text NOT NULL REFERENCES admin_project_task_tags(id) ON DELETE CASCADE,
					created_at timestamptz NOT NULL DEFAULT now(),
					PRIMARY KEY (task_id, tag_id)
				)
			`;

			await sql`
				CREATE TABLE IF NOT EXISTS admin_project_task_comments (
					id text PRIMARY KEY,
					task_id text NOT NULL REFERENCES admin_project_tasks(id) ON DELETE CASCADE,
					author_user_id text REFERENCES admin_app_users(id) ON DELETE SET NULL,
					body text NOT NULL,
					created_at timestamptz NOT NULL DEFAULT now(),
					updated_at timestamptz NOT NULL DEFAULT now()
				)
			`;

			await sql`CREATE INDEX IF NOT EXISTS admin_project_phases_project_idx ON admin_project_phases (project_id, sort_order)`;
			await sql`CREATE INDEX IF NOT EXISTS admin_project_milestones_project_idx ON admin_project_milestones (project_id, phase_id, sort_order)`;
			await sql`CREATE INDEX IF NOT EXISTS admin_projects_audience_idx ON admin_projects (audience_id, updated_at DESC)`;
			await sql`CREATE INDEX IF NOT EXISTS admin_project_tasks_project_idx ON admin_project_tasks (project_id, phase_id, milestone_id, sort_order)`;
			await sql`CREATE INDEX IF NOT EXISTS admin_project_task_comments_task_idx ON admin_project_task_comments (task_id, created_at DESC)`;
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

function normalizeNullableString(value) {
	const normalizedValue = normalizeString(value);
	return normalizedValue || null;
}

function normalizeBucketColor(value) {
	const normalizedValue = normalizeString(value);

	if (!normalizedValue) {
		return '#64748b';
	}

	if (!/^#(?:[0-9a-fA-F]{6})$/.test(normalizedValue)) {
		throw new Error('Bucket color must use a six-digit hex value.');
	}

	return normalizedValue.toLowerCase();
}

function normalizeDate(value) {
	const normalizedValue = normalizeString(value);

	if (!normalizedValue) {
		return null;
	}

	if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
		throw new Error('Date values must use YYYY-MM-DD format.');
	}

	return normalizedValue;
}

function normalizeDateRecord(value) {
	if (!value) {
		return null;
	}

	if (value instanceof Date) {
		return value.toISOString().slice(0, 10);
	}

	return normalizeString(value);
}

function normalizeTimestamp(value) {
	return value?.toISOString?.() ?? value;
}

function normalizeOptionalTimestamp(value) {
	if (!value) {
		return null;
	}

	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeInteger(value, fallback = 0) {
	const normalizedValue = normalizeString(value);
	const parsedValue = normalizedValue ? Number.parseInt(normalizedValue, 10) : fallback;
	return Number.isInteger(parsedValue) ? parsedValue : fallback;
}

function normalizeProjectStatus(value) {
	const normalizedValue = normalizeString(value).toLowerCase() || 'active';

	if (!PROJECT_STATUSES.has(normalizedValue)) {
		throw new Error('Project status is invalid.');
	}

	return normalizedValue;
}

function normalizeTaskStatus(value) {
	const normalizedValue = normalizeString(value).toLowerCase() || 'open';

	if (!TASK_STATUSES.has(normalizedValue)) {
		throw new Error('Project task status is invalid.');
	}

	return normalizedValue;
}

function normalizeTaskPriority(value) {
	const normalizedValue = normalizeString(value).toLowerCase() || 'normal';

	if (!TASK_PRIORITIES.has(normalizedValue)) {
		throw new Error('Project task priority is invalid.');
	}

	return normalizedValue;
}

function normalizeProgressPercentage(value, status) {
	if (status === 'completed') {
		return 100;
	}

	const parsedValue = normalizeInteger(value, 0);

	if (parsedValue < 0 || parsedValue > 100) {
		throw new Error('Project task progress must be between 0 and 100.');
	}

	return parsedValue;
}

function normalizeBucketKey(value) {
	return normalizeString(value)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function normalizeTagKey(value) {
	return normalizeBucketKey(value);
}

function normalizeTagsInput(value) {
	const rawTags = Array.isArray(value)
		? value
		: normalizeString(value)
			.split(',')
			.map((tag) => tag.trim())
			.filter(Boolean);
	const tags = [];
	const seenKeys = new Set();

	for (const rawTag of rawTags) {
		const name = normalizeString(typeof rawTag === 'string' ? rawTag : rawTag?.name ?? rawTag?.key);
		const key = normalizeTagKey(typeof rawTag === 'string' ? rawTag : rawTag?.key ?? rawTag?.name);

		if (!name || !key || seenKeys.has(key)) {
			continue;
		}

		seenKeys.add(key);
		tags.push({ key, name });
	}

	return tags;
}

function normalizeAssignedUserIds(value) {
	const rawIds = Array.isArray(value) ? value : value ? [value] : [];
	return [...new Set(rawIds.map((userId) => normalizeString(userId)).filter(Boolean))];
}

function resolveTaskStatus(status, progressPercentage, bucket = null) {
	if (bucket?.isTerminal) {
		return bucket.status;
	}

	if (status === 'completed') {
		return 'completed';
	}

	if (progressPercentage > 0 && status === 'open') {
		return 'in_progress';
	}

	return status;
}

function normalizeProjectInput(input) {
	const name = normalizeString(input.name);

	if (!name) {
		throw new Error('Project name is required.');
	}

	return {
		name,
		description: normalizeString(input.description),
		status: normalizeProjectStatus(input.status),
		startAt: normalizeDate(input.startAt),
		dueAt: normalizeDate(input.dueAt),
		audienceId: normalizeNullableString(input.audienceId),
		createdByUserId: normalizeNullableString(input.createdByUserId)
	};
}

function normalizePhaseInput(input) {
	const name = normalizeString(input.name);

	if (!name) {
		throw new Error('Phase name is required.');
	}

	return {
		name,
		description: normalizeString(input.description),
		startAt: normalizeDate(input.startAt),
		dueAt: normalizeDate(input.dueAt),
		sortOrder: normalizeInteger(input.sortOrder, 0)
	};
}

function normalizeMilestoneInput(input) {
	const name = normalizeString(input.name);
	const phaseId = normalizeString(input.phaseId);

	if (!name) {
		throw new Error('Milestone name is required.');
	}

	if (!phaseId) {
		throw new Error('Select a phase for this milestone.');
	}

	return {
		phaseId,
		name,
		description: normalizeString(input.description),
		startAt: normalizeDate(input.startAt),
		dueAt: normalizeDate(input.dueAt),
		sortOrder: normalizeInteger(input.sortOrder, 0)
	};
}

function normalizeTaskInput(input, bucket = null) {
	const title = normalizeString(input.title);
	let status = normalizeTaskStatus(input.status ?? bucket?.status ?? 'open');
	let progressPercentage = normalizeProgressPercentage(input.progressPercentage, status);

	if (!title) {
		throw new Error('Project task title is required.');
	}

	status = resolveTaskStatus(status, progressPercentage, bucket);
	progressPercentage = normalizeProgressPercentage(progressPercentage, status);

	return {
		phaseId: normalizeNullableString(input.phaseId),
		milestoneId: normalizeNullableString(input.milestoneId),
		bucketId: normalizeNullableString(input.bucketId ?? bucket?.id),
		title,
		description: normalizeString(input.description),
		status,
		priority: normalizeTaskPriority(input.priority),
		progressPercentage,
		startAt: normalizeDate(input.startAt),
		dueAt: normalizeDate(input.dueAt),
		sortOrder: normalizeInteger(input.sortOrder, 0),
		assignedUserIds: normalizeAssignedUserIds(input.assignedUserIds),
		tags: normalizeTagsInput(input.tags),
		createdByUserId: normalizeNullableString(input.createdByUserId)
	};
}

function normalizeProjectRecord(record) {
	return {
		id: record.id,
		name: record.name,
		description: record.description,
		status: record.status,
		startAt: normalizeDateRecord(record.start_at),
		dueAt: normalizeDateRecord(record.due_at),
		audienceId: record.audience_id,
		createdByUserId: record.created_by_user_id,
		createdAt: normalizeTimestamp(record.created_at),
		updatedAt: normalizeTimestamp(record.updated_at)
	};
}

function normalizePhaseRecord(record) {
	return {
		id: record.id,
		projectId: record.project_id,
		name: record.name,
		description: record.description,
		startAt: normalizeDateRecord(record.start_at),
		dueAt: normalizeDateRecord(record.due_at),
		sortOrder: record.sort_order,
		createdAt: normalizeTimestamp(record.created_at),
		updatedAt: normalizeTimestamp(record.updated_at)
	};
}

function normalizeMilestoneRecord(record) {
	return {
		id: record.id,
		projectId: record.project_id,
		phaseId: record.phase_id,
		name: record.name,
		description: record.description,
		startAt: normalizeDateRecord(record.start_at),
		dueAt: normalizeDateRecord(record.due_at),
		sortOrder: record.sort_order,
		createdAt: normalizeTimestamp(record.created_at),
		updatedAt: normalizeTimestamp(record.updated_at)
	};
}

function normalizeBucketRecord(record) {
	return {
		id: record.id,
		projectId: record.project_id,
		key: record.key,
		name: record.name,
		status: record.status,
		color: normalizeBucketColor(record.color),
		isTerminal: Boolean(record.is_terminal),
		sortOrder: record.sort_order,
		createdAt: normalizeTimestamp(record.created_at),
		updatedAt: normalizeTimestamp(record.updated_at)
	};
}

function normalizeTaskRecord(record) {
	return {
		id: record.id,
		projectId: record.project_id,
		phaseId: record.phase_id,
		milestoneId: record.milestone_id,
		bucketId: record.bucket_id,
		title: record.title,
		description: record.description,
		status: record.status,
		priority: record.priority,
		progressPercentage: record.progress_percentage,
		startAt: normalizeDateRecord(record.start_at),
		dueAt: normalizeDateRecord(record.due_at),
		sortOrder: record.sort_order,
		lastActivityAt: normalizeTimestamp(record.last_activity_at),
		createdByUserId: record.created_by_user_id,
		createdAt: normalizeTimestamp(record.created_at),
		updatedAt: normalizeTimestamp(record.updated_at)
	};
}

function normalizeUserRecord(record) {
	return {
		id: record.id,
		name: record.name,
		email: record.email
	};
}

function normalizeTagRecord(record) {
	return {
		id: record.id,
		projectId: record.project_id,
		key: record.key,
		name: record.name
	};
}

function normalizeCommentRecord(record) {
	return {
		id: record.id,
		taskId: record.task_id,
		body: record.body,
		createdAt: normalizeTimestamp(record.created_at),
		updatedAt: normalizeTimestamp(record.updated_at),
		author: record.author_id
			? {
				id: record.author_id,
				name: record.author_name,
				email: record.author_email
			}
			: { id: '', name: 'Deleted user', email: '' }
	};
}

async function ensureUsersExist(executor, userIds) {
	const normalizedUserIds = normalizeAssignedUserIds(userIds);

	if (normalizedUserIds.length === 0) {
		return;
	}

	const users = await executor`
		SELECT id
		FROM admin_app_users
		WHERE id IN ${executor(normalizedUserIds)}
	`;

	if (users.length !== normalizedUserIds.length) {
		throw new Error('One or more selected users could not be found.');
	}
}

async function getBucketById(executor, projectId, bucketId) {
	if (!bucketId) {
		return null;
	}

	const [bucket] = await executor`
		SELECT *
		FROM admin_project_buckets
		WHERE project_id = ${projectId}
			AND id = ${bucketId}
		LIMIT 1
	`;

	return bucket ? normalizeBucketRecord(bucket) : null;
}

async function syncTaskAssignments(executor, taskId, userIds) {
	await executor`DELETE FROM admin_project_task_assignments WHERE task_id = ${taskId}`;

	for (const userId of userIds) {
		await executor`
			INSERT INTO admin_project_task_assignments (task_id, user_id)
			VALUES (${taskId}, ${userId})
			ON CONFLICT DO NOTHING
		`;
	}
}

async function resolveSnapshotUserIds(executor, users) {
	const emails = [...new Set((Array.isArray(users) ? users : [])
		.map((user) => normalizeString(user?.email).toLowerCase())
		.filter(Boolean))];

	if (emails.length === 0) {
		return [];
	}

	const rows = await executor`
		SELECT id, lower(email) AS email
		FROM admin_app_users
		WHERE lower(email) IN ${executor(emails)}
	`;

	const idsByEmail = new Map(rows.map((row) => [row.email, row.id]));
	return emails.map((email) => idsByEmail.get(email)).filter(Boolean);
}

async function resolveSnapshotUserId(executor, user, fallbackUserId = null) {
	const email = normalizeString(user?.email).toLowerCase();

	if (!email) {
		return fallbackUserId;
	}

	const [row] = await executor`
		SELECT id
		FROM admin_app_users
		WHERE lower(email) = ${email}
		LIMIT 1
	`;

	return row?.id ?? fallbackUserId;
}

async function syncTaskTags(executor, projectId, taskId, tags) {
	await executor`DELETE FROM admin_project_task_tag_links WHERE task_id = ${taskId}`;

	for (const tag of tags) {
		const [tagRecord] = await executor`
			INSERT INTO admin_project_task_tags (id, project_id, key, name)
			VALUES (${randomUUID()}, ${projectId}, ${tag.key}, ${tag.name})
			ON CONFLICT (project_id, key)
			DO UPDATE SET name = EXCLUDED.name, updated_at = now()
			RETURNING *
		`;

		await executor`
			INSERT INTO admin_project_task_tag_links (task_id, tag_id)
			VALUES (${taskId}, ${tagRecord.id})
			ON CONFLICT DO NOTHING
		`;
	}
}

async function seedProjectDefaults(executor, projectId) {
	for (const [index, name] of DEFAULT_PHASES.entries()) {
		await executor`
			INSERT INTO admin_project_phases (id, project_id, name, sort_order)
			VALUES (${randomUUID()}, ${projectId}, ${name}, ${index})
		`;
	}

	for (const [index, bucket] of DEFAULT_BUCKETS.entries()) {
		await executor`
			INSERT INTO admin_project_buckets (id, project_id, key, name, status, color, is_terminal, sort_order)
			VALUES (${randomUUID()}, ${projectId}, ${bucket.key}, ${bucket.name}, ${bucket.status}, ${bucket.color}, ${bucket.isTerminal}, ${index})
		`;
	}
}

async function getProjectParts(executor, projectId, options = {}) {
	const [project] = await executor`SELECT * FROM admin_projects WHERE id = ${projectId} LIMIT 1`;

	if (!project) {
		return null;
	}

	const [phases, milestones, buckets, taskRows] = await Promise.all([
		executor`SELECT * FROM admin_project_phases WHERE project_id = ${projectId} ORDER BY sort_order ASC, created_at ASC`,
		executor`SELECT * FROM admin_project_milestones WHERE project_id = ${projectId} ORDER BY sort_order ASC, created_at ASC`,
		executor`SELECT * FROM admin_project_buckets WHERE project_id = ${projectId} ORDER BY sort_order ASC, created_at ASC`,
		executor`SELECT * FROM admin_project_tasks WHERE project_id = ${projectId} ORDER BY sort_order ASC, created_at ASC`
	]);

	const tasks = await Promise.all(taskRows.map((task) => getProjectTaskByIdWithExecutor(executor, projectId, task.id, options)));

	return {
		...normalizeProjectRecord(project),
		phases: phases.map(normalizePhaseRecord),
		milestones: milestones.map(normalizeMilestoneRecord),
		buckets: buckets.map(normalizeBucketRecord),
		tasks: tasks.filter(Boolean)
	};
}

async function getProjectTaskByIdWithExecutor(executor, projectId, taskId, options = {}) {
	const [task] = await executor`
		SELECT *
		FROM admin_project_tasks
		WHERE project_id = ${projectId}
			AND id = ${taskId}
		LIMIT 1
	`;

	if (!task) {
		return null;
	}

	const relationPromises = [
		executor`
			SELECT u.*
			FROM admin_project_task_assignments pta
			JOIN admin_app_users u ON u.id = pta.user_id
			WHERE pta.task_id = ${taskId}
			ORDER BY u.name ASC, u.email ASC
		`,
		executor`
			SELECT t.*
			FROM admin_project_task_tag_links pttl
			JOIN admin_project_task_tags t ON t.id = pttl.tag_id
			WHERE pttl.task_id = ${taskId}
			ORDER BY t.name ASC
		`
	];

	if (options.includeComments) {
		relationPromises.push(executor`
			SELECT c.id,
				c.task_id,
				c.body,
				c.created_at,
				c.updated_at,
				u.id AS author_id,
				u.name AS author_name,
				u.email AS author_email
			FROM admin_project_task_comments c
			LEFT JOIN admin_app_users u ON u.id = c.author_user_id
			WHERE c.task_id = ${taskId}
			ORDER BY c.created_at DESC
		`);
	}

	const [assignedUsers, tags, comments = []] = await Promise.all(relationPromises);

	return {
		...normalizeTaskRecord(task),
		assignedUsers: assignedUsers.map(normalizeUserRecord),
		tags: tags.map(normalizeTagRecord),
		comments: comments.map(normalizeCommentRecord)
	};
}

function summarizeProject(project) {
	const tasks = project.tasks ?? [];
	const totalTasks = tasks.length;
	const completedTasks = tasks.filter((task) => task.status === 'completed').length;
	const canceledTasks = tasks.filter((task) => task.status === 'canceled').length;
	const activeTasks = tasks.filter((task) => !TERMINAL_TASK_STATUSES.has(task.status)).length;
	const overdueTasks = tasks.filter((task) => {
		if (TERMINAL_TASK_STATUSES.has(task.status) || !task.dueAt) {
			return false;
		}

		return new Date(`${task.dueAt}T23:59:59`).getTime() < Date.now();
	}).length;
	const averageProgress = totalTasks > 0
		? Math.round(tasks.reduce((sum, task) => sum + task.progressPercentage, 0) / totalTasks)
		: 0;

	return {
		totalTasks,
		activeTasks,
		completedTasks,
		canceledTasks,
		overdueTasks,
		averageProgress,
		phaseCount: project.phases?.length ?? 0,
		milestoneCount: project.milestones?.length ?? 0
	};
}

export function getProjectsStoreErrorMessage(error, fallback = 'The requested project change could not be completed.') {
	if (error?.code === '23505') {
		return 'A project record with the same unique value already exists.';
	}

	if (error instanceof Error && error.message) {
		return error.message;
	}

	return fallback;
}

export async function listProjects() {
	await ensureSchema();
	const sql = getSql();
	const projects = await sql`SELECT * FROM admin_projects ORDER BY updated_at DESC, name ASC`;
	const detailedProjects = await Promise.all(projects.map((project) => getProjectParts(sql, project.id)));

	return detailedProjects.filter(Boolean).map((project) => ({
		...project,
		summary: summarizeProject(project)
	}));
}

export async function listProjectsByAudienceId(audienceId) {
	await ensureSchema();
	const sql = getSql();
	const normalizedAudienceId = normalizeNullableString(audienceId);

	if (!normalizedAudienceId) {
		return [];
	}

	const projects = await sql`
		SELECT *
		FROM admin_projects
		WHERE audience_id = ${normalizedAudienceId}
		ORDER BY updated_at DESC, name ASC
	`;
	const detailedProjects = await Promise.all(projects.map((project) => getProjectParts(sql, project.id)));

	return detailedProjects.filter(Boolean).map((project) => ({
		...project,
		summary: summarizeProject(project)
	}));
}

export async function listInternalProjects() {
	await ensureSchema();
	const sql = getSql();
	const projects = await sql`
		SELECT *
		FROM admin_projects
		WHERE audience_id IS NULL
		ORDER BY updated_at DESC, name ASC
	`;
	const detailedProjects = await Promise.all(projects.map((project) => getProjectParts(sql, project.id)));

	return detailedProjects.filter(Boolean).map((project) => ({
		...project,
		summary: summarizeProject(project)
	}));
}

export async function getProjectById(projectId) {
	await ensureSchema();
	const sql = getSql();
	const project = await getProjectParts(sql, projectId);

	return project
		? {
			...project,
			summary: summarizeProject(project)
		}
		: null;
}

export async function createProject(input) {
	await ensureSchema();
	const sql = getSql();
	const project = normalizeProjectInput(input);

	return sql.begin(async (tx) => {
		await ensureUsersExist(tx, [project.createdByUserId]);
		const [createdProject] = await tx`
			INSERT INTO admin_projects (id, name, description, status, start_at, due_at, audience_id, created_by_user_id)
			VALUES (${randomUUID()}, ${project.name}, ${project.description}, ${project.status}, ${project.startAt}, ${project.dueAt}, ${project.audienceId}, ${project.createdByUserId})
			RETURNING *
		`;

		await seedProjectDefaults(tx, createdProject.id);
		return getProjectParts(tx, createdProject.id);
	});
}

export async function updateProject(projectId, input) {
	await ensureSchema();
	const sql = getSql();
	const project = normalizeProjectInput(input);

	const [updatedProject] = await sql`
		UPDATE admin_projects
		SET name = ${project.name},
			description = ${project.description},
			status = ${project.status},
			start_at = ${project.startAt},
			due_at = ${project.dueAt},
			audience_id = ${project.audienceId},
			updated_at = now()
		WHERE id = ${projectId}
		RETURNING *
	`;

	return updatedProject ? getProjectById(projectId) : null;
}

export async function createProjectPhase(projectId, input) {
	await ensureSchema();
	const sql = getSql();
	const phase = normalizePhaseInput(input);
	const [row] = await sql`
		INSERT INTO admin_project_phases (id, project_id, name, description, start_at, due_at, sort_order)
		VALUES (${randomUUID()}, ${projectId}, ${phase.name}, ${phase.description}, ${phase.startAt}, ${phase.dueAt}, ${phase.sortOrder})
		RETURNING *
	`;
	await sql`UPDATE admin_projects SET updated_at = now() WHERE id = ${projectId}`;
	return normalizePhaseRecord(row);
}

export async function createProjectMilestone(projectId, input) {
	await ensureSchema();
	const sql = getSql();
	const milestone = normalizeMilestoneInput(input);
	const [row] = await sql`
		INSERT INTO admin_project_milestones (id, project_id, phase_id, name, description, start_at, due_at, sort_order)
		VALUES (${randomUUID()}, ${projectId}, ${milestone.phaseId}, ${milestone.name}, ${milestone.description}, ${milestone.startAt}, ${milestone.dueAt}, ${milestone.sortOrder})
		RETURNING *
	`;
	await sql`UPDATE admin_projects SET updated_at = now() WHERE id = ${projectId}`;
	return normalizeMilestoneRecord(row);
}

export async function createProjectBucket(projectId, input) {
	await ensureSchema();
	const sql = getSql();
	const name = normalizeString(input.name);
	const key = normalizeBucketKey(input.key || name);
	const status = normalizeTaskStatus(input.status || 'open');
	const color = normalizeBucketColor(input.color);

	if (!name || !key) {
		throw new Error('Bucket name is required.');
	}

	const [row] = await sql`
		INSERT INTO admin_project_buckets (id, project_id, key, name, status, color, is_terminal, sort_order)
		VALUES (${randomUUID()}, ${projectId}, ${key}, ${name}, ${status}, ${color}, ${Boolean(input.isTerminal)}, ${normalizeInteger(input.sortOrder, 0)})
		RETURNING *
	`;
	await sql`UPDATE admin_projects SET updated_at = now() WHERE id = ${projectId}`;
	return normalizeBucketRecord(row);
}

export async function updateProjectBucketColor(projectId, bucketId, color) {
	await ensureSchema();
	const sql = getSql();
	const normalizedColor = normalizeBucketColor(color);
	const [row] = await sql`
		UPDATE admin_project_buckets
		SET color = ${normalizedColor},
			updated_at = now()
		WHERE project_id = ${projectId}
			AND id = ${bucketId}
		RETURNING *
	`;

	if (!row) {
		return null;
	}

	await sql`UPDATE admin_projects SET updated_at = now() WHERE id = ${projectId}`;
	return normalizeBucketRecord(row);
}

export async function getProjectTaskById(projectId, taskId, options = {}) {
	await ensureSchema();
	const sql = getSql();
	return getProjectTaskByIdWithExecutor(sql, projectId, taskId, options);
}

export async function createProjectTask(projectId, input) {
	await ensureSchema();
	const sql = getSql();

	return sql.begin(async (tx) => {
		const bucket = await getBucketById(tx, projectId, normalizeNullableString(input.bucketId));
		const task = normalizeTaskInput(input, bucket);
		await ensureUsersExist(tx, [task.createdByUserId, ...task.assignedUserIds]);
		const [createdTask] = await tx`
			INSERT INTO admin_project_tasks (
				id, project_id, phase_id, milestone_id, bucket_id, title, description, status, priority,
				progress_percentage, start_at, due_at, sort_order, created_by_user_id
			)
			VALUES (
				${randomUUID()}, ${projectId}, ${task.phaseId}, ${task.milestoneId}, ${task.bucketId}, ${task.title}, ${task.description}, ${task.status}, ${task.priority},
				${task.progressPercentage}, ${task.startAt}, ${task.dueAt}, ${task.sortOrder}, ${task.createdByUserId}
			)
			RETURNING *
		`;

		await syncTaskAssignments(tx, createdTask.id, task.assignedUserIds);
		await syncTaskTags(tx, projectId, createdTask.id, task.tags);
		await tx`UPDATE admin_projects SET updated_at = now() WHERE id = ${projectId}`;
		return getProjectTaskByIdWithExecutor(tx, projectId, createdTask.id, { includeComments: true });
	});
}

export async function updateProjectTask(projectId, taskId, input) {
	await ensureSchema();
	const sql = getSql();

	return sql.begin(async (tx) => {
		const existingTask = await getProjectTaskByIdWithExecutor(tx, projectId, taskId);

		if (!existingTask) {
			return null;
		}

		const bucket = await getBucketById(tx, projectId, normalizeNullableString(input.bucketId));
		const task = normalizeTaskInput({ ...input, createdByUserId: existingTask.createdByUserId }, bucket);
		await ensureUsersExist(tx, [task.createdByUserId, ...task.assignedUserIds]);
		const activityTimestamp = new Date().toISOString();
		const [updatedTask] = await tx`
			UPDATE admin_project_tasks
			SET phase_id = ${task.phaseId},
				milestone_id = ${task.milestoneId},
				bucket_id = ${task.bucketId},
				title = ${task.title},
				description = ${task.description},
				status = ${task.status},
				priority = ${task.priority},
				progress_percentage = ${task.progressPercentage},
				start_at = ${task.startAt},
				due_at = ${task.dueAt},
				sort_order = ${task.sortOrder},
				last_activity_at = ${activityTimestamp},
				updated_at = now()
			WHERE project_id = ${projectId}
				AND id = ${taskId}
			RETURNING *
		`;

		if (!updatedTask) {
			return null;
		}

		await syncTaskAssignments(tx, taskId, task.assignedUserIds);
		await syncTaskTags(tx, projectId, taskId, task.tags);
		await tx`UPDATE admin_projects SET updated_at = now() WHERE id = ${projectId}`;
		return getProjectTaskByIdWithExecutor(tx, projectId, taskId, { includeComments: true });
	});
}

export async function moveProjectTask(projectId, taskId, input) {
	await ensureSchema();
	const sql = getSql();
	const bucket = await getBucketById(sql, projectId, normalizeString(input.bucketId));

	if (!bucket) {
		throw new Error('Select a valid project bucket.');
	}

	return sql.begin(async (tx) => {
		const [existingTask] = await tx`
			SELECT *
			FROM admin_project_tasks
			WHERE project_id = ${projectId}
				AND id = ${taskId}
			LIMIT 1
		`;

		if (!existingTask) {
			return null;
		}

		const sourceBucketId = existingTask.bucket_id;
		const nextStatus = bucket.status;
		const nextProgress = nextStatus === 'completed' ? 100 : normalizeInteger(input.progressPercentage, 0);
		const requestedIndex = normalizeInteger(input.targetIndex, 0);
		const siblingTasks = await tx`
			SELECT id
			FROM admin_project_tasks
			WHERE project_id = ${projectId}
				AND bucket_id = ${bucket.id}
				AND id <> ${taskId}
			ORDER BY sort_order ASC, created_at ASC
		`;
		const boundedIndex = Math.max(0, Math.min(requestedIndex, siblingTasks.length));
		const reorderedTaskIds = [...siblingTasks.map((row) => row.id)];
		reorderedTaskIds.splice(boundedIndex, 0, taskId);

		await tx`
			UPDATE admin_project_tasks
			SET bucket_id = ${bucket.id},
				status = ${nextStatus},
				progress_percentage = ${nextProgress},
				sort_order = ${boundedIndex},
				last_activity_at = now(),
				updated_at = now()
			WHERE project_id = ${projectId}
				AND id = ${taskId}
		`;

		for (const [index, reorderedTaskId] of reorderedTaskIds.entries()) {
			await tx`
				UPDATE admin_project_tasks
				SET sort_order = ${index},
					updated_at = CASE WHEN id = ${taskId} THEN updated_at ELSE now() END
				WHERE project_id = ${projectId}
					AND id = ${reorderedTaskId}
			`;
		}

		if (sourceBucketId && sourceBucketId !== bucket.id) {
			const sourceTasks = await tx`
				SELECT id
				FROM admin_project_tasks
				WHERE project_id = ${projectId}
					AND bucket_id = ${sourceBucketId}
				ORDER BY sort_order ASC, created_at ASC
			`;

			for (const [index, sourceTask] of sourceTasks.entries()) {
				await tx`
					UPDATE admin_project_tasks
					SET sort_order = ${index},
						updated_at = now()
					WHERE project_id = ${projectId}
						AND id = ${sourceTask.id}
				`;
			}
		}

		await tx`UPDATE admin_projects SET updated_at = now() WHERE id = ${projectId}`;
		return getProjectTaskByIdWithExecutor(tx, projectId, taskId);
	});
}

export async function createProjectTaskComment(projectId, taskId, input) {
	await ensureSchema();
	const sql = getSql();
	const body = normalizeString(input.body);
	const authorUserId = normalizeNullableString(input.authorUserId);

	if (!body) {
		throw new Error('Project task comment is required.');
	}

	return sql.begin(async (tx) => {
		await ensureUsersExist(tx, [authorUserId]);
		const existingTask = await getProjectTaskByIdWithExecutor(tx, projectId, taskId);

		if (!existingTask) {
			return null;
		}

		await tx`
			INSERT INTO admin_project_task_comments (id, task_id, author_user_id, body)
			VALUES (${randomUUID()}, ${taskId}, ${authorUserId}, ${body})
		`;
		await tx`
			UPDATE admin_project_tasks
			SET last_activity_at = now(), updated_at = now()
			WHERE id = ${taskId}
		`;
		await tx`UPDATE admin_projects SET updated_at = now() WHERE id = ${projectId}`;
		return getProjectTaskByIdWithExecutor(tx, projectId, taskId, { includeComments: true });
	});
}

export async function buildProjectDashboard(projectId) {
	const project = await getProjectById(projectId);

	if (!project) {
		return null;
	}

	const bucketCounts = project.buckets.map((bucket) => ({
		...bucket,
		count: project.tasks.filter((task) => task.bucketId === bucket.id).length
	}));
	const phaseSummaries = project.phases.map((phase) => {
		const phaseTasks = project.tasks.filter((task) => task.phaseId === phase.id);
		const completedTasks = phaseTasks.filter((task) => task.status === 'completed').length;

		return {
			...phase,
			taskCount: phaseTasks.length,
			completedTasks,
			progressPercentage: phaseTasks.length > 0 ? Math.round((completedTasks / phaseTasks.length) * 100) : 0
		};
	});
	const recentActivity = [...project.tasks]
		.sort((left, right) => new Date(right.lastActivityAt).getTime() - new Date(left.lastActivityAt).getTime())
		.slice(0, 6);
	const upcomingTasks = project.tasks
		.filter((task) => !TERMINAL_TASK_STATUSES.has(task.status) && task.dueAt)
		.sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime())
		.slice(0, 6);

	return {
		project,
		summary: project.summary,
		bucketCounts,
		phaseSummaries,
		recentActivity,
		upcomingTasks
	};
}

function buildProjectSnapshot(project) {
	return {
		name: project.name,
		description: project.description,
		status: project.status,
		startAt: project.startAt,
		dueAt: project.dueAt,
		audienceId: project.audienceId,
		phases: project.phases.map((phase) => ({
			id: phase.id,
			name: phase.name,
			description: phase.description,
			startAt: phase.startAt,
			dueAt: phase.dueAt,
			sortOrder: phase.sortOrder
		})),
		milestones: project.milestones.map((milestone) => ({
			id: milestone.id,
			phaseId: milestone.phaseId,
			name: milestone.name,
			description: milestone.description,
			startAt: milestone.startAt,
			dueAt: milestone.dueAt,
			sortOrder: milestone.sortOrder
		})),
		buckets: project.buckets.map((bucket) => ({
			id: bucket.id,
			key: bucket.key,
			name: bucket.name,
			status: bucket.status,
			color: bucket.color,
			isTerminal: bucket.isTerminal,
			sortOrder: bucket.sortOrder
		})),
		tasks: project.tasks.map((task) => ({
			id: task.id,
			phaseId: task.phaseId,
			milestoneId: task.milestoneId,
			bucketId: task.bucketId,
			title: task.title,
			description: task.description,
			status: task.status,
			priority: task.priority,
			progressPercentage: task.progressPercentage,
			startAt: task.startAt,
			dueAt: task.dueAt,
			sortOrder: task.sortOrder,
			assignedUsers: task.assignedUsers.map((user) => ({ id: user.id, email: user.email, name: user.name })),
			tags: task.tags.map((tag) => ({ key: tag.key, name: tag.name })),
			comments: (task.comments ?? []).map((comment) => ({
				body: comment.body,
				authorEmail: comment.author.email,
				createdAt: comment.createdAt
			}))
		}))
	};
}

export async function exportProjectsSnapshot(projectId = null) {
	await ensureSchema();
	const sql = getSql();
	const projects = projectId
		? [await getProjectParts(sql, projectId, { includeComments: true })]
		: await Promise.all((await listProjects()).map((project) => getProjectParts(sql, project.id, { includeComments: true })));

	return {
		version: SNAPSHOT_VERSION,
		exportedAt: new Date().toISOString(),
		projects: projects.filter(Boolean).map(buildProjectSnapshot)
	};
}

export async function importProjectsSnapshot(snapshot, options = {}) {
	await ensureSchema();
	const sql = getSql();
	const rawProjects = snapshot?.projects;

	if (snapshot?.version && snapshot.version > SNAPSHOT_VERSION) {
		throw new Error('This project export was created by a newer schema version.');
	}

	if (!Array.isArray(rawProjects) || rawProjects.length === 0) {
		throw new Error('The import file must include at least one project.');
	}

	return sql.begin(async (tx) => {
		let importedCount = 0;

		for (const rawProject of rawProjects) {
			const project = normalizeProjectInput({ ...rawProject, createdByUserId: options.createdByUserId });
			const [projectRecord] = await tx`
				INSERT INTO admin_projects (id, name, description, status, start_at, due_at, audience_id, created_by_user_id)
				VALUES (${randomUUID()}, ${project.name}, ${project.description}, ${project.status}, ${project.startAt}, ${project.dueAt}, ${project.audienceId}, ${project.createdByUserId})
				RETURNING *
			`;
			const phaseIdMap = new Map();
			const milestoneIdMap = new Map();
			const bucketIdMap = new Map();

			for (const rawPhase of Array.isArray(rawProject.phases) && rawProject.phases.length > 0 ? rawProject.phases : DEFAULT_PHASES.map((name, index) => ({ name, sortOrder: index }))) {
				const phase = normalizePhaseInput(rawPhase);
				const [phaseRecord] = await tx`
					INSERT INTO admin_project_phases (id, project_id, name, description, start_at, due_at, sort_order)
					VALUES (${randomUUID()}, ${projectRecord.id}, ${phase.name}, ${phase.description}, ${phase.startAt}, ${phase.dueAt}, ${phase.sortOrder})
					RETURNING *
				`;
				phaseIdMap.set(rawPhase.id, phaseRecord.id);
			}

			for (const rawBucket of Array.isArray(rawProject.buckets) && rawProject.buckets.length > 0 ? rawProject.buckets : DEFAULT_BUCKETS) {
				const name = normalizeString(rawBucket.name);
				const key = normalizeBucketKey(rawBucket.key || name);
				const [bucketRecord] = await tx`
					INSERT INTO admin_project_buckets (id, project_id, key, name, status, is_terminal, sort_order)
					VALUES (${randomUUID()}, ${projectRecord.id}, ${key}, ${name}, ${normalizeTaskStatus(rawBucket.status)}, ${Boolean(rawBucket.isTerminal)}, ${normalizeInteger(rawBucket.sortOrder, 0)})
					RETURNING *
				`;
				bucketIdMap.set(rawBucket.id, bucketRecord.id);
			}

			for (const rawMilestone of Array.isArray(rawProject.milestones) ? rawProject.milestones : []) {
				const milestone = normalizeMilestoneInput({
					...rawMilestone,
					phaseId: phaseIdMap.get(rawMilestone.phaseId) ?? rawMilestone.phaseId
				});
				const [milestoneRecord] = await tx`
					INSERT INTO admin_project_milestones (id, project_id, phase_id, name, description, start_at, due_at, sort_order)
					VALUES (${randomUUID()}, ${projectRecord.id}, ${milestone.phaseId}, ${milestone.name}, ${milestone.description}, ${milestone.startAt}, ${milestone.dueAt}, ${milestone.sortOrder})
					RETURNING *
				`;
				milestoneIdMap.set(rawMilestone.id, milestoneRecord.id);
			}

			for (const rawTask of Array.isArray(rawProject.tasks) ? rawProject.tasks : []) {
				const assignedUserIds = await resolveSnapshotUserIds(tx, rawTask.assignedUsers);
				const task = normalizeTaskInput({
					...rawTask,
					phaseId: phaseIdMap.get(rawTask.phaseId) ?? null,
					milestoneId: milestoneIdMap.get(rawTask.milestoneId) ?? null,
					bucketId: bucketIdMap.get(rawTask.bucketId) ?? null,
					assignedUserIds,
					createdByUserId: options.createdByUserId
				});
				const [taskRecord] = await tx`
					INSERT INTO admin_project_tasks (id, project_id, phase_id, milestone_id, bucket_id, title, description, status, priority, progress_percentage, start_at, due_at, sort_order, created_by_user_id)
					VALUES (${randomUUID()}, ${projectRecord.id}, ${task.phaseId}, ${task.milestoneId}, ${task.bucketId}, ${task.title}, ${task.description}, ${task.status}, ${task.priority}, ${task.progressPercentage}, ${task.startAt}, ${task.dueAt}, ${task.sortOrder}, ${task.createdByUserId})
					RETURNING *
				`;
				await syncTaskAssignments(tx, taskRecord.id, task.assignedUserIds);
				await syncTaskTags(tx, projectRecord.id, taskRecord.id, task.tags);

				for (const rawComment of Array.isArray(rawTask.comments) ? rawTask.comments : []) {
					const body = normalizeString(rawComment.body);
					if (!body) continue;

					const authorUserId = await resolveSnapshotUserId(tx, { email: rawComment.authorEmail }, options.createdByUserId ?? null);
					const createdAt = normalizeOptionalTimestamp(rawComment.createdAt) ?? new Date();
					await tx`
						INSERT INTO admin_project_task_comments (id, task_id, author_user_id, body, created_at)
						VALUES (${randomUUID()}, ${taskRecord.id}, ${authorUserId}, ${body}, ${createdAt})
					`;
				}
			}

			importedCount += 1;
		}

		return { importedCount };
	});
}
