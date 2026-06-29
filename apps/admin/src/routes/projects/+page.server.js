import { fail, redirect } from '@sveltejs/kit';
import { getLocalUserByLogtoUserId } from '$lib/server/admin-access-store';
import {
	createProject,
	getProjectsStoreErrorMessage,
	importProjectsSnapshot,
	listInternalProjects
} from '$lib/server/projects-store';

function readTrimmedString(formData, name) {
	return String(formData.get(name) ?? '').trim();
}

function getNotice(searchParams) {
	if (searchParams.get('created') === '1') {
		return 'The project was created successfully.';
	}

	const importedCount = Number(searchParams.get('imported') ?? '0');

	if (importedCount > 0) {
		return `${importedCount} ${importedCount === 1 ? 'project was' : 'projects were'} imported successfully.`;
	}

	return null;
}

function buildValues(input) {
	return {
		name: input.name ?? '',
		description: input.description ?? '',
		status: input.status ?? 'active',
		startAt: input.startAt ?? '',
		dueAt: input.dueAt ?? ''
	};
}

export async function load({ url }) {
	try {
		return {
			projects: await listInternalProjects(),
			notice: getNotice(url.searchParams)
		};
	} catch (error) {
		return {
			projects: [],
			notice: null,
			errorMessage: getProjectsStoreErrorMessage(error, 'The projects view could not be loaded.')
		};
	}
}

export const actions = {
	create: async ({ locals, request }) => {
		const formData = await request.formData();
		const input = {
			name: readTrimmedString(formData, 'name'),
			description: readTrimmedString(formData, 'description'),
			status: readTrimmedString(formData, 'status') || 'active',
			startAt: readTrimmedString(formData, 'startAt'),
			dueAt: readTrimmedString(formData, 'dueAt')
		};
		const errors = {};

		if (!input.name) {
			errors.name = 'Project name is required.';
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
			const project = await createProject({
				...input,
				createdByUserId: currentLocalUser?.id
			});

			throw redirect(303, `/projects/${project.id}/overview?created=1`);
		} catch (error) {
			if (error?.status === 303) {
				throw error;
			}

			return fail(error?.status ?? 500, {
				intent: 'create',
				message: getProjectsStoreErrorMessage(error),
				values: buildValues(input)
			});
		}
	},
	import: async ({ locals, request }) => {
		const formData = await request.formData();
		const file = formData.get('file');

		if (!(file instanceof File) || file.size === 0) {
			return fail(400, {
				message: 'Choose a project JSON export file to import.'
			});
		}

		let snapshot;

		try {
			snapshot = JSON.parse(await file.text());
		} catch {
			return fail(400, {
				message: 'The selected file is not valid JSON.'
			});
		}

		try {
			const currentLocalUser = await getLocalUserByLogtoUserId(locals.user?.sub);
			const result = await importProjectsSnapshot(snapshot, {
				createdByUserId: currentLocalUser?.id
			});
			throw redirect(303, `/projects?imported=${result.importedCount}`);
		} catch (error) {
			if (error?.status === 303) {
				throw error;
			}

			return fail(error?.status ?? 500, {
				message: getProjectsStoreErrorMessage(error, 'The project export could not be imported.')
			});
		}
	}
};
