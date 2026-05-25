import { randomUUID } from 'node:crypto';
import { env } from '$env/dynamic/private';
import postgres from 'postgres';

const ALERT_SEVERITIES = new Set(['info', 'warning', 'critical']);
const ALERT_STATUSES = new Set(['active', 'dismissed', 'resolved']);
const SEVERITY_RANK = {
	info: 1,
	warning: 2,
	critical: 3
};

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
				CREATE TABLE IF NOT EXISTS admin_alerts (
					id text PRIMARY KEY,
					dedupe_key text NOT NULL UNIQUE,
					source_type text NOT NULL,
					source_id text NOT NULL,
					title text NOT NULL,
					message text NOT NULL DEFAULT '',
					severity text NOT NULL DEFAULT 'info',
					status text NOT NULL DEFAULT 'active',
					trigger_at timestamptz,
					href text NOT NULL,
					resolved_at timestamptz,
					created_at timestamptz NOT NULL DEFAULT now(),
					updated_at timestamptz NOT NULL DEFAULT now(),
					CHECK (severity IN ('info', 'warning', 'critical')),
					CHECK (status IN ('active', 'dismissed', 'resolved'))
				)
			`;

			await sql`
				CREATE INDEX IF NOT EXISTS admin_alerts_status_trigger_idx
				ON admin_alerts (status, trigger_at, updated_at)
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

function normalizeSeverity(value) {
	const normalizedValue = normalizeString(value).toLowerCase() || 'info';

	if (!ALERT_SEVERITIES.has(normalizedValue)) {
		throw new Error('Alert severity is invalid.');
	}

	return normalizedValue;
}

function normalizeStatus(value) {
	const normalizedValue = normalizeString(value).toLowerCase() || 'active';

	if (!ALERT_STATUSES.has(normalizedValue)) {
		throw new Error('Alert status is invalid.');
	}

	return normalizedValue;
}

function normalizeTriggerAt(value) {
	const normalizedValue = normalizeString(value);

	if (!normalizedValue) {
		return null;
	}

	const date = new Date(normalizedValue);

	if (Number.isNaN(date.getTime())) {
		throw new Error('Alert trigger time is invalid.');
	}

	return date.toISOString();
}

function normalizeAlertRecord(alert) {
	return {
		id: alert.id,
		dedupeKey: alert.dedupe_key,
		sourceType: alert.source_type,
		sourceId: alert.source_id,
		title: alert.title,
		message: alert.message,
		severity: alert.severity,
		status: alert.status,
		triggerAt: normalizeTimestamp(alert.trigger_at),
		href: alert.href,
		resolvedAt: normalizeTimestamp(alert.resolved_at),
		createdAt: normalizeTimestamp(alert.created_at),
		updatedAt: normalizeTimestamp(alert.updated_at)
	};
}

function normalizeAlertInput(input) {
	const alert = {
		dedupeKey: normalizeString(input.dedupeKey),
		sourceType: normalizeString(input.sourceType),
		sourceId: normalizeString(input.sourceId),
		title: normalizeString(input.title),
		message: normalizeString(input.message),
		severity: normalizeSeverity(input.severity),
		status: normalizeStatus(input.status),
		triggerAt: normalizeTriggerAt(input.triggerAt),
		href: normalizeString(input.href)
	};

	if (!alert.dedupeKey) {
		throw new Error('Alert dedupe key is required.');
	}

	if (!alert.sourceType) {
		throw new Error('Alert source type is required.');
	}

	if (!alert.sourceId) {
		throw new Error('Alert source ID is required.');
	}

	if (!alert.title) {
		throw new Error('Alert title is required.');
	}

	if (!alert.href) {
		throw new Error('Alert href is required.');
	}

	return alert;
}

function getHighestSeverity(alerts) {
	return alerts.reduce((highestSeverity, alert) => {
		if (!highestSeverity) {
			return alert.severity;
		}

		return SEVERITY_RANK[alert.severity] > SEVERITY_RANK[highestSeverity]
			? alert.severity
			: highestSeverity;
	}, null);
}

export function getAlertsStoreErrorMessage(error, fallback = 'The requested alert change could not be completed.') {
	if (error?.code === '23505') {
		return 'An alert with the same dedupe key already exists.';
	}

	if (error instanceof Error && error.message) {
		return error.message;
	}

	return fallback;
}

export async function registerAlert(input) {
	await ensureSchema();
	const sql = getSql();
	const alert = normalizeAlertInput({
		...input,
		status: input.status ?? 'active',
		severity: input.severity ?? 'info'
	});
	const resolvedAt = alert.status === 'resolved' ? new Date().toISOString() : null;
    const [persistedAlert] = await sql`
		INSERT INTO admin_alerts (
			id,
			dedupe_key,
			source_type,
			source_id,
			title,
			message,
			severity,
			status,
			trigger_at,
			href,
			resolved_at
		)
		VALUES (
			${randomUUID()},
			${alert.dedupeKey},
			${alert.sourceType},
			${alert.sourceId},
			${alert.title},
			${alert.message},
			${alert.severity},
			${alert.status},
			${alert.triggerAt},
			${alert.href},
			${resolvedAt}
		)
		ON CONFLICT (dedupe_key)
		DO UPDATE SET
			source_type = EXCLUDED.source_type,
			source_id = EXCLUDED.source_id,
			title = EXCLUDED.title,
			message = EXCLUDED.message,
			severity = EXCLUDED.severity,
			status = EXCLUDED.status,
			trigger_at = EXCLUDED.trigger_at,
			href = EXCLUDED.href,
			resolved_at = EXCLUDED.resolved_at,
			updated_at = now()
		RETURNING *
	`;

	return normalizeAlertRecord(persistedAlert);
}

export async function resolveAlertsBySource(sourceType, sourceId) {
	await ensureSchema();
	const sql = getSql();
	const alerts = await sql`
		UPDATE admin_alerts
		SET status = 'resolved',
			resolved_at = now(),
			updated_at = now()
		WHERE source_type = ${normalizeString(sourceType)}
			AND source_id = ${normalizeString(sourceId)}
			AND status <> 'resolved'
		RETURNING *
	`;

	return alerts.map(normalizeAlertRecord);
}

export async function dismissAlert(alertId) {
	await ensureSchema();
	const sql = getSql();
	const [alert] = await sql`
		UPDATE admin_alerts
		SET status = 'dismissed',
			updated_at = now()
		WHERE id = ${alertId}
		RETURNING *
	`;

	return alert ? normalizeAlertRecord(alert) : null;
}

export async function resolveAlertByDedupeKey(dedupeKey) {
	await ensureSchema();
	const sql = getSql();
	const [alert] = await sql`
		UPDATE admin_alerts
		SET status = 'resolved',
			resolved_at = now(),
			updated_at = now()
		WHERE dedupe_key = ${normalizeString(dedupeKey)}
		RETURNING *
	`;

	return alert ? normalizeAlertRecord(alert) : null;
}

export async function listActiveAlerts(limit = 8) {
	await ensureSchema();
	const sql = getSql();
	const alerts = await sql`
		SELECT *
		FROM admin_alerts
		WHERE status = 'active'
		ORDER BY trigger_at ASC NULLS LAST, updated_at DESC
		LIMIT ${limit}
	`;

	return alerts.map(normalizeAlertRecord);
}

export async function getAlertsSummary(limit = 8) {
	await ensureSchema();
	const sql = getSql();
	const [counts] = await sql`
		SELECT COUNT(*)::int AS active_count
		FROM admin_alerts
		WHERE status = 'active'
	`;
	const alerts = await listActiveAlerts(limit);

	return {
		alerts,
		activeCount: counts.active_count,
		highestSeverity: getHighestSeverity(alerts)
	};
}