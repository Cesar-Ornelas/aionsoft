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
				CREATE TABLE IF NOT EXISTS admin_monitoring_sites (
					id text PRIMARY KEY,
					name text NOT NULL,
					url text NOT NULL UNIQUE,
					description text NOT NULL DEFAULT '',
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

function normalizeTimestamp(value) {
	return value?.toISOString?.() ?? value;
}

function normalizeSite(site) {
	return {
		id: site.id,
		name: site.name,
		url: site.url,
		description: site.description,
		createdAt: normalizeTimestamp(site.created_at),
		updatedAt: normalizeTimestamp(site.updated_at)
	};
}

function normalizeString(value) {
	return String(value ?? '').trim();
}

function normalizeUrl(value) {
	const normalizedValue = normalizeString(value);

	if (!normalizedValue) {
		throw new Error('Site URL is required.');
	}

	let parsedUrl;

	try {
		parsedUrl = new URL(normalizedValue);
	} catch {
		throw new Error('Enter a valid URL including http:// or https://.');
	}

	if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
		throw new Error('Only http:// and https:// URLs are supported.');
	}

	parsedUrl.hash = '';

	return parsedUrl.toString();
}

function normalizeSiteInput(input) {
	const site = {
		name: normalizeString(input.name),
		url: normalizeUrl(input.url),
		description: normalizeString(input.description)
	};

	if (!site.name) {
		throw new Error('Site name is required.');
	}

	return site;
}

export function getMonitoringStoreErrorMessage(error, fallback = 'The requested monitoring change could not be completed.') {
	if (error?.code === '23505') {
		return 'A site with the same URL already exists.';
	}

	if (error instanceof Error && error.message) {
		return error.message;
	}

	return fallback;
}

export async function listMonitoringSites() {
	await ensureSchema();
	const sql = getSql();
	const sites = await sql`
		SELECT *
		FROM admin_monitoring_sites
		ORDER BY name ASC, created_at ASC
	`;

	return sites.map(normalizeSite);
}

export async function getMonitoringSiteById(siteId) {
	await ensureSchema();
	const sql = getSql();
	const [site] = await sql`
		SELECT *
		FROM admin_monitoring_sites
		WHERE id = ${siteId}
		LIMIT 1
	`;

	return site ? normalizeSite(site) : null;
}

export async function createMonitoringSite(input) {
	await ensureSchema();
	const sql = getSql();
	const site = normalizeSiteInput(input);
	const [createdSite] = await sql`
		INSERT INTO admin_monitoring_sites (id, name, url, description)
		VALUES (
			${randomUUID()},
			${site.name},
			${site.url},
			${site.description}
		)
		RETURNING *
	`;

	return normalizeSite(createdSite);
}

export async function updateMonitoringSite(siteId, input) {
	await ensureSchema();
	const sql = getSql();
	const site = normalizeSiteInput(input);
	const [updatedSite] = await sql`
		UPDATE admin_monitoring_sites
		SET name = ${site.name},
			url = ${site.url},
			description = ${site.description},
			updated_at = now()
		WHERE id = ${siteId}
		RETURNING *
	`;

	return updatedSite ? normalizeSite(updatedSite) : null;
}