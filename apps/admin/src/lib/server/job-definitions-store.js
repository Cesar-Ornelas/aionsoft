import { randomUUID } from 'node:crypto';
import { env } from '$env/dynamic/private';
import postgres from 'postgres';

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
				CREATE TABLE IF NOT EXISTS admin_job_definitions (
					id text PRIMARY KEY,
					job_key text NOT NULL UNIQUE,
					label_name text NOT NULL UNIQUE,
					job_name text NOT NULL,
					description text NOT NULL DEFAULT '',
					schedule text NOT NULL,
					container_name text NOT NULL,
					command text NOT NULL,
					no_overlap boolean NOT NULL DEFAULT true,
					created_at timestamptz NOT NULL DEFAULT now(),
					updated_at timestamptz NOT NULL DEFAULT now()
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

function normalizeLabelName(value, fallbackJobKey = '') {
	const sourceValue = normalizeString(value) || normalizeString(fallbackJobKey);
	const normalizedValue = sourceValue
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

	if (!normalizedValue) {
		throw new Error('Label name is required.');
	}

	return normalizedValue;
}

function normalizeBoolean(value, fallback = true) {
	if (value === true || value === 'true' || value === 'on' || value === '1') {
		return true;
	}

	if (value === false || value === 'false' || value === '0') {
		return false;
	}

	return fallback;
}

function normalizeSchedule(value) {
	const normalizedValue = normalizeString(value);

	if (!normalizedValue) {
		throw new Error('Job schedule is required.');
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

function normalizeCommand(value) {
	const normalizedValue = normalizeString(value);

	if (!normalizedValue) {
		throw new Error('Job command is required.');
	}

	return normalizedValue;
}

function normalizeContainerName(value) {
	const normalizedValue = normalizeString(value);

	if (!normalizedValue) {
		throw new Error('Container name is required.');
	}

	return normalizedValue;
}

function normalizeJobDefinitionInput(input) {
	const jobKey = normalizeJobKey(input.jobKey);

	return {
		jobKey,
		labelName: normalizeLabelName(input.labelName, jobKey),
		jobName: normalizeJobName(input.jobName),
		description: normalizeString(input.description),
		schedule: normalizeSchedule(input.schedule),
		containerName: normalizeContainerName(input.containerName),
		command: normalizeCommand(input.command),
		noOverlap: normalizeBoolean(input.noOverlap, true)
	};
}

function normalizeJobDefinitionRecord(record) {
	return {
		id: record.id,
		jobKey: record.job_key,
		labelName: record.label_name,
		jobName: record.job_name,
		description: record.description,
		schedule: record.schedule,
		containerName: record.container_name,
		command: record.command,
		noOverlap: Boolean(record.no_overlap),
		createdAt: normalizeTimestamp(record.created_at),
		updatedAt: normalizeTimestamp(record.updated_at)
	};
}

export function buildOfeliaLabelsSnippet(definition) {
	return [
		`ofelia.job-exec.${definition.labelName}.schedule: ${JSON.stringify(definition.schedule)}`,
		`ofelia.job-exec.${definition.labelName}.no-overlap: ${JSON.stringify(String(Boolean(definition.noOverlap)))}`,
		`ofelia.job-exec.${definition.labelName}.container: ${definition.containerName}`,
		`ofelia.job-exec.${definition.labelName}.command: ${definition.command}`
	].join('\n');
}

export function getJobDefinitionsStoreErrorMessage(error, fallback = 'The requested job definition change could not be completed.') {
	if (error?.code === '23505') {
		return 'A job definition with the same key or label name already exists.';
	}

	if (error instanceof Error && error.message) {
		return error.message;
	}

	return fallback;
}

export async function listJobDefinitions() {
	await ensureSchema();
	const sql = getSql();
	const rows = await sql`
		SELECT *
		FROM admin_job_definitions
		ORDER BY job_name ASC, created_at DESC
	`;

	return rows.map(normalizeJobDefinitionRecord);
}

export async function upsertJobDefinition(input) {
	await ensureSchema();
	const sql = getSql();
	const definition = normalizeJobDefinitionInput(input);

	const [row] = await sql`
		INSERT INTO admin_job_definitions (
			id,
			job_key,
			label_name,
			job_name,
			description,
			schedule,
			container_name,
			command,
			no_overlap
		)
		VALUES (
			${randomUUID()},
			${definition.jobKey},
			${definition.labelName},
			${definition.jobName},
			${definition.description},
			${definition.schedule},
			${definition.containerName},
			${definition.command},
			${definition.noOverlap}
		)
		ON CONFLICT (job_key)
		DO UPDATE SET
			label_name = EXCLUDED.label_name,
			job_name = EXCLUDED.job_name,
			description = EXCLUDED.description,
			schedule = EXCLUDED.schedule,
			container_name = EXCLUDED.container_name,
			command = EXCLUDED.command,
			no_overlap = EXCLUDED.no_overlap,
			updated_at = now()
		RETURNING *
	`;

	return normalizeJobDefinitionRecord(row);
}

export async function saveJobDefinition(input, options = {}) {
	await ensureSchema();
	const sql = getSql();
	const definition = normalizeJobDefinitionInput(input);
	const currentJobKey = normalizeString(options.currentJobKey).toLowerCase();

	if (!currentJobKey || currentJobKey === definition.jobKey) {
		return upsertJobDefinition(definition);
	}

	const [row] = await sql`
		UPDATE admin_job_definitions
		SET
			job_key = ${definition.jobKey},
			label_name = ${definition.labelName},
			job_name = ${definition.jobName},
			description = ${definition.description},
			schedule = ${definition.schedule},
			container_name = ${definition.containerName},
			command = ${definition.command},
			no_overlap = ${definition.noOverlap},
			updated_at = now()
		WHERE job_key = ${currentJobKey}
		RETURNING *
	`;

	if (!row) {
		throw new Error('Job definition not found.');
	}

	return normalizeJobDefinitionRecord(row);
}

export async function deleteJobDefinition(jobKey) {
	await ensureSchema();
	const sql = getSql();
	const normalizedJobKey = normalizeJobKey(jobKey);

	const [row] = await sql`
		DELETE FROM admin_job_definitions
		WHERE job_key = ${normalizedJobKey}
		RETURNING *
	`;

	if (!row) {
		throw new Error('Job definition not found.');
	}

	return normalizeJobDefinitionRecord(row);
}