import { randomUUID } from 'node:crypto';
import { env } from '$env/dynamic/private';
import postgres from 'postgres';

const JOB_RUN_STATUSES = new Set(['running', 'succeeded', 'failed']);

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
				CREATE TABLE IF NOT EXISTS admin_job_runs (
					id text PRIMARY KEY,
					job_key text NOT NULL,
					job_name text NOT NULL,
					source text NOT NULL DEFAULT 'system',
					status text NOT NULL DEFAULT 'running',
					started_at timestamptz NOT NULL DEFAULT now(),
					finished_at timestamptz,
					duration_ms integer,
					result jsonb,
					error_message text,
					metadata jsonb,
					created_at timestamptz NOT NULL DEFAULT now(),
					updated_at timestamptz NOT NULL DEFAULT now(),
					CHECK (status IN ('running', 'succeeded', 'failed')),
					CHECK (duration_ms IS NULL OR duration_ms >= 0)
				)
			`;

			await sql`
				CREATE INDEX IF NOT EXISTS admin_job_runs_job_key_started_idx
				ON admin_job_runs (job_key, started_at DESC)
			`;

			await sql`
				CREATE INDEX IF NOT EXISTS admin_job_runs_status_started_idx
				ON admin_job_runs (status, started_at DESC)
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

function normalizeJobKey(value) {
	const normalizedValue = normalizeString(value).toLowerCase();

	if (!normalizedValue) {
		throw new Error('Job key is required.');
	}

	return normalizedValue;
}

function normalizeJobName(value) {
	const normalizedValue = normalizeString(value);

	if (!normalizedValue) {
		throw new Error('Job name is required.');
	}

	return normalizedValue;
}

function normalizeJobStatus(value) {
	const normalizedValue = normalizeString(value).toLowerCase();

	if (!JOB_RUN_STATUSES.has(normalizedValue)) {
		throw new Error('Job status is invalid.');
	}

	return normalizedValue;
}

function normalizeOptionalJobStatus(value) {
	const normalizedValue = normalizeString(value).toLowerCase();

	if (!normalizedValue) {
		return null;
	}

	return normalizeJobStatus(normalizedValue);
}

function normalizeDateBoundary(value, { endOfDay = false } = {}) {
	const normalizedValue = normalizeString(value);

	if (!normalizedValue) {
		return null;
	}

	if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
		throw new Error('Job run date filter is invalid.');
	}

	const suffix = endOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z';
	const date = new Date(`${normalizedValue}${suffix}`);

	if (Number.isNaN(date.getTime())) {
		throw new Error('Job run date filter is invalid.');
	}

	return date;
}

function normalizeJobRunFilters(filters = {}) {
	const status = normalizeOptionalJobStatus(filters.status);
	const dateFrom = normalizeDateBoundary(filters.dateFrom);
	const dateTo = normalizeDateBoundary(filters.dateTo, { endOfDay: true });

	if (dateFrom && dateTo && dateFrom.getTime() > dateTo.getTime()) {
		throw new Error('Job run date range is invalid.');
	}

	return {
		status,
		dateFrom,
		dateTo
	};
}

function normalizeJsonValue(value) {
	if (value == null) {
		return null;
	}

	return value;
}

function normalizeJobRunRecord(record) {
	return {
		id: record.id,
		jobKey: record.job_key,
		jobName: record.job_name,
		source: record.source,
		status: record.status,
		startedAt: normalizeTimestamp(record.started_at),
		finishedAt: normalizeTimestamp(record.finished_at),
		durationMs: record.duration_ms,
		result: record.result,
		errorMessage: record.error_message,
		metadata: record.metadata,
		createdAt: normalizeTimestamp(record.created_at),
		updatedAt: normalizeTimestamp(record.updated_at)
	};
}

function normalizeJobRunGroupRecord(record) {
	return {
		jobKey: record.job_key,
		jobName: record.job_name,
		totalRuns: Number(record.total_runs ?? 0),
		succeededRuns: Number(record.succeeded_runs ?? 0),
		failedRuns: Number(record.failed_runs ?? 0),
		runningRuns: Number(record.running_runs ?? 0),
		lastStatus: record.last_status,
		lastStartedAt: normalizeTimestamp(record.last_started_at),
		lastFinishedAt: normalizeTimestamp(record.last_finished_at),
		lastErrorMessage: record.last_error_message
	};
}

export function getJobRunsStoreErrorMessage(error, fallback = 'The requested job run change could not be completed.') {
	if (error instanceof Error && error.message) {
		return error.message;
	}

	return fallback;
}

export function listJobRunStatuses() {
	return [...JOB_RUN_STATUSES];
}

export async function startJobRun(input) {
	await ensureSchema();
	const sql = getSql();
	const jobKey = normalizeJobKey(input.jobKey);
	const jobName = normalizeJobName(input.jobName);
	const source = normalizeString(input.source) || 'system';
	const metadata = normalizeJsonValue(input.metadata);

	const [record] = await sql`
		INSERT INTO admin_job_runs (
			id,
			job_key,
			job_name,
			source,
			status,
			metadata
		)
		VALUES (
			${randomUUID()},
			${jobKey},
			${jobName},
			${source},
			'running',
			${metadata}
		)
		RETURNING *
	`;

	return normalizeJobRunRecord(record);
}

export async function finishJobRun(runId, input) {
	await ensureSchema();
	const sql = getSql();
	const normalizedRunId = normalizeString(runId);
	const status = normalizeJobStatus(input.status);
	const errorMessage = normalizeString(input.errorMessage) || null;
	const result = normalizeJsonValue(input.result);

	const [record] = await sql`
		UPDATE admin_job_runs
		SET status = ${status},
			finished_at = now(),
			duration_ms = GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - started_at)) * 1000)::integer),
			result = ${result},
			error_message = ${errorMessage},
			updated_at = now()
		WHERE id = ${normalizedRunId}
		RETURNING *
	`;

	return record ? normalizeJobRunRecord(record) : null;
}

export async function getRunningJobRun(jobKey) {
	await ensureSchema();
	const sql = getSql();
	const normalizedJobKey = normalizeJobKey(jobKey);
	const [record] = await sql`
		SELECT *
		FROM admin_job_runs
		WHERE job_key = ${normalizedJobKey}
			AND status = 'running'
		ORDER BY started_at DESC, created_at DESC
		LIMIT 1
	`;

	return record ? normalizeJobRunRecord(record) : null;
}

export async function listJobRunGroups(filters = {}) {
	await ensureSchema();
	const sql = getSql();
	const normalizedFilters = normalizeJobRunFilters(filters);
	const rows = await sql`
		SELECT grouped.job_key,
			grouped.job_name,
			grouped.total_runs,
			grouped.succeeded_runs,
			grouped.failed_runs,
			grouped.running_runs,
			latest.status AS last_status,
			latest.started_at AS last_started_at,
			latest.finished_at AS last_finished_at,
			latest.error_message AS last_error_message
		FROM (
			SELECT job_key,
				MAX(job_name) AS job_name,
				COUNT(*)::integer AS total_runs,
				COUNT(*) FILTER (WHERE status = 'succeeded')::integer AS succeeded_runs,
				COUNT(*) FILTER (WHERE status = 'failed')::integer AS failed_runs,
				COUNT(*) FILTER (WHERE status = 'running')::integer AS running_runs
			FROM admin_job_runs
			WHERE (${normalizedFilters.status}::text IS NULL OR status = ${normalizedFilters.status})
				AND (${normalizedFilters.dateFrom}::timestamptz IS NULL OR started_at >= ${normalizedFilters.dateFrom})
				AND (${normalizedFilters.dateTo}::timestamptz IS NULL OR started_at <= ${normalizedFilters.dateTo})
			GROUP BY job_key
		) AS grouped
		JOIN LATERAL (
			SELECT status,
				started_at,
				finished_at,
				error_message
			FROM admin_job_runs
			WHERE job_key = grouped.job_key
				AND (${normalizedFilters.status}::text IS NULL OR status = ${normalizedFilters.status})
				AND (${normalizedFilters.dateFrom}::timestamptz IS NULL OR started_at >= ${normalizedFilters.dateFrom})
				AND (${normalizedFilters.dateTo}::timestamptz IS NULL OR started_at <= ${normalizedFilters.dateTo})
			ORDER BY started_at DESC, created_at DESC
			LIMIT 1
		) AS latest ON true
		ORDER BY latest.started_at DESC, grouped.job_name ASC
	`;

	return rows.map(normalizeJobRunGroupRecord);
}

export async function listJobRuns(jobKey, options = {}) {
	await ensureSchema();
	const sql = getSql();
	const normalizedJobKey = normalizeJobKey(jobKey);
	const normalizedFilters = normalizeJobRunFilters(options);
	const normalizedLimit = Number.isInteger(options.limit) && options.limit > 0 ? options.limit : 50;
	const rows = await sql`
		SELECT *
		FROM admin_job_runs
		WHERE job_key = ${normalizedJobKey}
			AND (${normalizedFilters.status}::text IS NULL OR status = ${normalizedFilters.status})
			AND (${normalizedFilters.dateFrom}::timestamptz IS NULL OR started_at >= ${normalizedFilters.dateFrom})
			AND (${normalizedFilters.dateTo}::timestamptz IS NULL OR started_at <= ${normalizedFilters.dateTo})
		ORDER BY started_at DESC, created_at DESC
		LIMIT ${normalizedLimit}
	`;

	return rows.map(normalizeJobRunRecord);
}