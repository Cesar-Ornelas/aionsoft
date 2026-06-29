import { fail, redirect } from '@sveltejs/kit';
import { getLocalUserByLogtoUserId } from '$lib/server/admin-access-store';
import {
	createProjectNote,
	getProjectNoteById,
	getProjectNotesStoreErrorMessage,
	listProjectNotes,
	listProjectNoteTags,
	toggleProjectNoteFavorite,
	updateProjectNote
} from '$lib/server/project-notes-store';

function readFilter(searchParams, name) {
	return String(searchParams.get(name) ?? '').trim();
}

function readBoolean(formData, name) {
	return ['true', '1', 'on'].includes(String(formData.get(name) ?? '').trim().toLowerCase());
}

function readNoteInput(formData) {
	return {
		title: String(formData.get('title') ?? '').trim(),
		bodyMarkdown: String(formData.get('bodyMarkdown') ?? ''),
		tagsInput: String(formData.get('tagsInput') ?? '').trim(),
		isFavorite: readBoolean(formData, 'isFavorite')
	};
}

function buildValues(input) {
	return {
		title: input.title ?? '',
		bodyMarkdown: input.bodyMarkdown ?? '',
		tagsInput: input.tagsInput ?? '',
		isFavorite: Boolean(input.isFavorite)
	};
}

function getNotice(searchParams) {
	if (searchParams.get('created') === '1') return 'The note was created successfully.';
	if (searchParams.get('updated') === '1') return 'The note was updated successfully.';
	if (searchParams.get('favorited') === '1') return 'The note was pinned successfully.';
	if (searchParams.get('unfavorited') === '1') return 'The note was unpinned successfully.';
	return null;
}

function buildReturnHref(params, formData, extraParams = {}) {
	const searchParams = new URLSearchParams();
	const returnQ = String(formData.get('returnQ') ?? '').trim();
	const returnTag = String(formData.get('returnTag') ?? '').trim();

	if (returnQ) {
		searchParams.set('q', returnQ);
	}

	if (returnTag) {
		searchParams.set('tag', returnTag);
	}

	for (const [key, value] of Object.entries(extraParams)) {
		searchParams.set(key, String(value));
	}

	const search = searchParams.toString();
	return `/projects/${params.projectId}/notes${search ? `?${search}` : ''}`;
}

export async function load({ parent, params, url }) {
	const { project } = await parent();
	const filters = {
		q: readFilter(url.searchParams, 'q'),
		tag: readFilter(url.searchParams, 'tag')
	};
	const noteId = readFilter(url.searchParams, 'note');

	try {
		const [notes, availableTags, editNote] = await Promise.all([
			listProjectNotes(params.projectId, filters),
			listProjectNoteTags(params.projectId),
			noteId ? getProjectNoteById(params.projectId, noteId) : Promise.resolve(null)
		]);

		return {
			project,
			notes,
			availableTags,
			editNote,
			filters,
			notice: getNotice(url.searchParams),
			errorMessage: noteId && !editNote ? 'Note not found.' : null
		};
	} catch (error) {
		return {
			project,
			notes: [],
			availableTags: [],
			editNote: null,
			filters,
			notice: null,
			errorMessage: getProjectNotesStoreErrorMessage(error, 'The project notes could not be loaded.')
		};
	}
}

export const actions = {
	create: async ({ locals, params, request }) => {
		const formData = await request.formData();
		const input = readNoteInput(formData);
		const errors = {};

		if (!input.title) {
			errors.title = 'Note title is required.';
		}

		if (!String(input.bodyMarkdown ?? '').trim()) {
			errors.bodyMarkdown = 'Note body is required.';
		}

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				intent: 'create',
				errors,
				values: buildValues(input)
			});
		}

		try {
			const currentLocalUser = await getLocalUserByLogtoUserId(locals.user?.sub);
			await createProjectNote(params.projectId, {
				...input,
				createdByUserId: currentLocalUser?.id
			});
		} catch (error) {
			return fail(500, {
				intent: 'create',
				message: getProjectNotesStoreErrorMessage(error),
				values: buildValues(input)
			});
		}

		throw redirect(303, buildReturnHref(params, formData, { created: 1 }));
	},
	update: async ({ locals, params, request }) => {
		const formData = await request.formData();
		const noteId = String(formData.get('noteId') ?? '').trim();
		const input = readNoteInput(formData);
		const errors = {};

		if (!noteId) {
			return fail(400, {
				intent: 'update',
				message: 'Note ID is required.',
				values: buildValues(input),
				noteId
			});
		}

		if (!input.title) {
			errors.title = 'Note title is required.';
		}

		if (!String(input.bodyMarkdown ?? '').trim()) {
			errors.bodyMarkdown = 'Note body is required.';
		}

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				intent: 'update',
				errors,
				values: buildValues(input),
				noteId
			});
		}

		try {
			const currentLocalUser = await getLocalUserByLogtoUserId(locals.user?.sub);
			const note = await updateProjectNote(params.projectId, noteId, {
				...input,
				updatedByUserId: currentLocalUser?.id
			});

			if (!note) {
				return fail(404, {
					intent: 'update',
					message: 'Note not found.',
					values: buildValues(input),
					noteId
				});
			}
		} catch (error) {
			return fail(500, {
				intent: 'update',
				message: getProjectNotesStoreErrorMessage(error),
				values: buildValues(input),
				noteId
			});
		}

		throw redirect(303, buildReturnHref(params, formData, { updated: 1 }));
	},
	toggleFavorite: async ({ locals, params, request }) => {
		const formData = await request.formData();
		const noteId = String(formData.get('noteId') ?? '').trim();
		const isFavorite = readBoolean(formData, 'isFavorite');

		if (!noteId) {
			return fail(400, { message: 'Note ID is required.' });
		}

		try {
			const currentLocalUser = await getLocalUserByLogtoUserId(locals.user?.sub);
			const note = await toggleProjectNoteFavorite(params.projectId, noteId, {
				isFavorite,
				updatedByUserId: currentLocalUser?.id
			});

			if (!note) {
				return fail(404, { message: 'Note not found.' });
			}
		} catch (error) {
			return fail(500, { message: getProjectNotesStoreErrorMessage(error) });
		}

		throw redirect(303, buildReturnHref(params, formData, isFavorite ? { favorited: 1 } : { unfavorited: 1 }));
	}
};