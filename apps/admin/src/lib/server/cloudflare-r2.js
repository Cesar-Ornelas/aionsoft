// @ts-nocheck

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '$env/dynamic/private';

const REQUIRED_ENV_VARS = [
	'CLOUDFLARE_R2_BUCKET_NAME',
	'CLOUDFLARE_R2_ENDPOINT',
	'CLOUDFLARE_R2_ACCESS_KEY_ID',
	'CLOUDFLARE_R2_SECRET_ACCESS_KEY'
];

let client;

function normalizeString(value) {
	return String(value ?? '').trim();
}

function readEnv(name) {
	return normalizeString(env[name]);
}

function normalizeEndpoint(value) {
	const normalizedValue = normalizeString(value);

	if (!normalizedValue) {
		return '';
	}

	let parsedUrl;

	try {
		parsedUrl = new URL(normalizedValue);
	} catch {
		throw new Error('CLOUDFLARE_R2_ENDPOINT must be a valid URL.');
	}

	parsedUrl.pathname = '';
	parsedUrl.search = '';
	parsedUrl.hash = '';

	return parsedUrl.toString().replace(/\/$/, '');
}

export function getClientR2EnvironmentState() {
	const values = Object.fromEntries(REQUIRED_ENV_VARS.map((name) => [name, readEnv(name)]));
	const missingVars = REQUIRED_ENV_VARS.filter((name) => !values[name]);
	const endpoint = values.CLOUDFLARE_R2_ENDPOINT ? normalizeEndpoint(values.CLOUDFLARE_R2_ENDPOINT) : null;

	return {
		configured: missingVars.length === 0,
		missingVars,
		bucketName: values.CLOUDFLARE_R2_BUCKET_NAME || null,
		endpoint
	};
}

function getRequiredEnv(name) {
	const value = readEnv(name);

	if (!value) {
		throw new Error(`Missing required admin storage env var: ${name}`);
	}

	return name === 'CLOUDFLARE_R2_ENDPOINT' ? normalizeEndpoint(value) : value;
}

function getClient() {
	if (!client) {
		client = new S3Client({
			region: 'auto',
			endpoint: getRequiredEnv('CLOUDFLARE_R2_ENDPOINT'),
			credentials: {
				accessKeyId: getRequiredEnv('CLOUDFLARE_R2_ACCESS_KEY_ID'),
				secretAccessKey: getRequiredEnv('CLOUDFLARE_R2_SECRET_ACCESS_KEY')
			},
			forcePathStyle: true
		});
	}

	return client;
}

export function getClientR2BucketName() {
	return getRequiredEnv('CLOUDFLARE_R2_BUCKET_NAME');
}

export function buildClientStorageBasePrefix(clientId) {
	const normalizedClientId = normalizeString(clientId);

	if (!normalizedClientId) {
		throw new Error('Client reference is required to build an R2 prefix.');
	}

	return `clients/${normalizedClientId}/`;
}

export function buildCompanyStorageBasePrefix() {
	return 'company/';
}

export function buildClientStorageDirectoryPrefix(clientId, directoryPath) {
	const normalizedPath = normalizeString(directoryPath).replace(/^\/+|\/+$/g, '');
	return `${buildClientStorageBasePrefix(clientId)}${normalizedPath}/`;
}

export function buildCompanyStorageDirectoryPrefix(directoryPath) {
	const normalizedPath = normalizeString(directoryPath).replace(/^\/+|\/+$/g, '');
	return `${buildCompanyStorageBasePrefix()}${normalizedPath}/`;
}

function buildSentinelKey(prefix) {
	return `${prefix}.keep`;
}

export async function ensureClientR2Prefix(prefix) {
	const normalizedPrefix = normalizeString(prefix);

	if (!normalizedPrefix.endsWith('/')) {
		throw new Error('R2 prefixes must end with a trailing slash.');
	}

	await getClient().send(new PutObjectCommand({
		Bucket: getClientR2BucketName(),
		Key: buildSentinelKey(normalizedPrefix),
		Body: '',
		ContentType: 'text/plain'
	}));

	return {
		bucketName: getClientR2BucketName(),
		prefix: normalizedPrefix,
		sentinelKey: buildSentinelKey(normalizedPrefix)
	};
}