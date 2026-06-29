// @ts-nocheck

import { randomUUID } from 'node:crypto';
import { env } from '$env/dynamic/private';
import postgres from 'postgres';
import { ensureAdminAccessSchema } from '$lib/server/admin-access-store';

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

			await sql`
				CREATE TABLE IF NOT EXISTS admin_project_notes (
					id text PRIMARY KEY,
					project_id text NOT NULL REFERENCES admin_projects(id) ON DELETE CASCADE,
					title text NOT NULL,
					body_markdown text NOT NULL DEFAULT '',
					is_favorite boolean NOT NULL DEFAULT false,
					created_by_user_id text REFERENCES admin_app_users(id) ON DELETE SET NULL,
					updated_by_user_id text REFERENCES admin_app_users(id) ON DELETE SET NULL,
					created_at timestamptz NOT NULL DEFAULT now(),
					updated_at timestamptz NOT NULL DEFAULT now(),
					last_activity_at timestamptz NOT NULL DEFAULT now()
				)
			`;

			await sql`
				CREATE TABLE IF NOT EXISTS admin_project_note_tags (
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
				CREATE TABLE IF NOT EXISTS admin_project_note_tag_links (
					note_id text NOT NULL REFERENCES admin_project_notes(id) ON DELETE CASCADE,
					tag_id text NOT NULL REFERENCES admin_project_note_tags(id) ON DELETE CASCADE,
					created_at timestamptz NOT NULL DEFAULT now(),
					PRIMARY KEY (note_id, tag_id)
				)
			`;

			await sql`CREATE INDEX IF NOT EXISTS admin_project_notes_project_idx ON admin_project_notes (project_id, is_favorite DESC, updated_at DESC)`;
			await sql`CREATE INDEX IF NOT EXISTS admin_project_note_tags_project_idx ON admin_project_note_tags (project_id, name)`;
			await sql`CREATE INDEX IF NOT EXISTS admin_project_note_tag_links_note_idx ON admin_project_note_tag_links (note_id)`;
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

function normalizeBoolean(value) {
	return value === true || value === 'true' || value === '1' || value === 1 || value === 'on';
}

function normalizeTimestamp(value) {
	if (!value) {
		return null;
	}

	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function buildTagKey(name) {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 64);
}

function normalizeNoteTags(input) {
	const source = Array.isArray(input) ? input : normalizeString(input).split(/[\n,]/g);
	const seenKeys = new Set();
	const tags = [];

	for (const item of source) {
		const name = normalizeString(item).replace(/\s+/g, ' ');

		if (!name) {
			continue;
		}

		const key = buildTagKey(name);

		if (!key || seenKeys.has(key)) {
			continue;
		}

		seenKeys.add(key);
		tags.push({ key, name });
	}

	return tags;
}

function stripMarkdown(value) {
	return normalizeString(value)
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/`([^`]+)`/g, '$1')
		.replace(/^#{1,6}\s+/gm, '')
		.replace(/[>*_~\-]+/g, ' ')
		.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
		.replace(/\s+/g, ' ')
		.trim();
}

function buildExcerpt(markdown) {
	const plainText = stripMarkdown(markdown);

	if (plainText.length <= 180) {
		return plainText;
	}

	return `${plainText.slice(0, 177)}...`;
}

function normalizeNoteRecord(record) {
	return {
		id: record.id,
		projectId: record.project_id,
		title: record.title,
		bodyMarkdown: record.body_markdown,
		isFavorite: Boolean(record.is_favorite),
		excerpt: buildExcerpt(record.body_markdown),
		createdByUserId: record.created_by_user_id,
		updatedByUserId: record.updated_by_user_id,
		createdAt: normalizeTimestamp(record.created_at),
		updatedAt: normalizeTimestamp(record.updated_at),
		lastActivityAt: normalizeTimestamp(record.last_activity_at),
		tags: []
	};
}

function hydrateNotes(noteRows, tagRows) {
	const notes = noteRows.map((row) => normalizeNoteRecord(row));
	const notesById = new Map(notes.map((note) => [note.id, note]));

	for (const row of tagRows) {
		const note = notesById.get(row.note_id);

		if (!note) {
			continue;
		}

		note.tags.push({
			id: row.tag_id,
			key: row.key,
			name: row.name
		});
	}

	return notes;
}

function matchesFilters(note, filters) {
	const query = normalizeString(filters.q).toLowerCase();
	const tag = normalizeString(filters.tag).toLowerCase();

	if (tag && !note.tags.some((item) => item.key === tag)) {
		return false;
	}

	if (!query) {
		return true;
	}

	const haystack = [note.title, note.bodyMarkdown, ...note.tags.map((item) => item.name)].join(' ').toLowerCase();
	return haystack.includes(query);
}

async function listNoteTagRows(executor, projectId) {
	return executor`
		SELECT link.note_id, tag.id AS tag_id, tag.key, tag.name
		FROM admin_project_note_tag_links AS link
		JOIN admin_project_note_tags AS tag ON tag.id = link.tag_id
		WHERE tag.project_id = ${projectId}
		ORDER BY tag.name ASC
	`;
}

async function getProjectNoteByIdWithExecutor(executor, projectId, noteId) {
	const noteRows = await executor`
		SELECT *
		FROM admin_project_notes
		WHERE project_id = ${projectId} AND id = ${noteId}
		LIMIT 1
	`;

	if (noteRows.length === 0) {
		return null;
	}

	const tagRows = await executor`
		SELECT link.note_id, tag.id AS tag_id, tag.key, tag.name
		FROM admin_project_note_tag_links AS link
		JOIN admin_project_note_tags AS tag ON tag.id = link.tag_id
		WHERE link.note_id = ${noteId}
		ORDER BY tag.name ASC
	`;

	return hydrateNotes(noteRows, tagRows)[0] ?? null;
}

async function syncProjectNoteTags(executor, projectId, noteId, tags) {
	await executor`DELETE FROM admin_project_note_tag_links WHERE note_id = ${noteId}`;

	for (const tag of tags) {
		const existingRows = await executor`
			SELECT id
			FROM admin_project_note_tags
			WHERE project_id = ${projectId} AND key = ${tag.key}
			LIMIT 1
		`;

		const tagId = existingRows[0]?.id ?? randomUUID();

		if (!existingRows[0]) {
			await executor`
				INSERT INTO admin_project_note_tags (id, project_id, key, name)
				VALUES (${tagId}, ${projectId}, ${tag.key}, ${tag.name})
			`;
		}

		await executor`
			INSERT INTO admin_project_note_tag_links (note_id, tag_id)
			VALUES (${noteId}, ${tagId})
		`;
	}
}

export async function listProjectNoteTags(projectId) {
	await ensureSchema();
	const sql = getSql();
const rows = await sql`
		SELECT id, key, name
		FROM admin_project_note_tags
		WHERE project_id = ${projectId}
		ORDER BY name ASC
	`;

	return rows.map((row) => ({ id: row.id, key: row.key, name: row.name }));
}

export async function listProjectNotes(projectId, filters = {}) {
	await ensureSchema();
	const sql = getSql();
	const noteRows = await sql`
		SELECT *
		FROM admin_project_notes
		WHERE project_id = ${projectId}
		ORDER BY is_favorite DESC, updated_at DESC
	`;

	if (noteRows.length === 0) {
		return [];
	}

	const tagRows = await listNoteTagRows(sql, projectId);
	return hydrateNotes(noteRows, tagRows).filter((note) => matchesFilters(note, filters));
}

export async function getProjectNoteById(projectId, noteId) {
	await ensureSchema();
	return getProjectNoteByIdWithExecutor(getSql(), projectId, noteId);
}

export async function createProjectNote(projectId, input) {
	await ensureSchema();
	const sql = getSql();
	const title = normalizeString(input.title);
	const bodyMarkdown = normalizeString(input.bodyMarkdown);
	const isFavorite = normalizeBoolean(input.isFavorite);
	const createdByUserId = normalizeNullableString(input.createdByUserId);
	const tags = normalizeNoteTags(input.tagsInput);

	if (!title) {
		throw new Error('Note title is required.');
	}

	if (!bodyMarkdown) {
		throw new Error('Note body is required.');
	}

	return sql.begin(async (tx) => {
		const noteId = randomUUID();

		await tx`
			INSERT INTO admin_project_notes (
				id,
				project_id,
				title,
				body_markdown,
				is_favorite,
				created_by_user_id,
				updated_by_user_id
			)
			VALUES (
				${noteId},
				${projectId},
				${title},
				${bodyMarkdown},
				${isFavorite},
				${createdByUserId},
				${createdByUserId}
			)
		`;

		await syncProjectNoteTags(tx, projectId, noteId, tags);
		await tx`UPDATE admin_projects SET updated_at = now() WHERE id = ${projectId}`;

		return getProjectNoteByIdWithExecutor(tx, projectId, noteId);
	});
}

export async function updateProjectNote(projectId, noteId, input) {
	await ensureSchema();
	const sql = getSql();
	const title = normalizeString(input.title);
	const bodyMarkdown = normalizeString(input.bodyMarkdown);
	const isFavorite = normalizeBoolean(input.isFavorite);
	const updatedByUserId = normalizeNullableString(input.updatedByUserId);
	const tags = normalizeNoteTags(input.tagsInput);

	if (!title) {
		throw new Error('Note title is required.');
	}

	if (!bodyMarkdown) {
		throw new Error('Note body is required.');
	}

	return sql.begin(async (tx) => {
		const updatedRows = await tx`
			UPDATE admin_project_notes
			SET
				title = ${title},
				body_markdown = ${bodyMarkdown},
				is_favorite = ${isFavorite},
				updated_by_user_id = ${updatedByUserId},
				updated_at = now(),
				last_activity_at = now()
			WHERE project_id = ${projectId} AND id = ${noteId}
			RETURNING id
		`;

		if (updatedRows.length === 0) {
			return null;
		}

		await syncProjectNoteTags(tx, projectId, noteId, tags);
		await tx`UPDATE admin_projects SET updated_at = now() WHERE id = ${projectId}`;

		return getProjectNoteByIdWithExecutor(tx, projectId, noteId);
	});
}

export async function toggleProjectNoteFavorite(projectId, noteId, input) {
	await ensureSchema();
	const sql = getSql();
	const isFavorite = normalizeBoolean(input.isFavorite);
	const updatedByUserId = normalizeNullableString(input.updatedByUserId);

	return sql.begin(async (tx) => {
		const updatedRows = await tx`
			UPDATE admin_project_notes
			SET
				is_favorite = ${isFavorite},
				updated_by_user_id = ${updatedByUserId},
				updated_at = now(),
				last_activity_at = now()
			WHERE project_id = ${projectId} AND id = ${noteId}
			RETURNING id
		`;

		if (updatedRows.length === 0) {
			return null;
		}

		await tx`UPDATE admin_projects SET updated_at = now() WHERE id = ${projectId}`;

		return getProjectNoteByIdWithExecutor(tx, projectId, noteId);
	});
}

export function getProjectNotesStoreErrorMessage(error, fallback = 'The project notes could not be saved.') {
	if (error instanceof Error) {
		return error.message;
	}

	return fallback;
}