import { fail, redirect } from '@sveltejs/kit';
import { getLocalUserByLogtoUserId } from '$lib/server/admin-access-store';
import { readProjectInput } from '$lib/server/project-form';
import { createProject, getProjectsStoreErrorMessage, listProjectsByAudienceId } from '$lib/server/projects-store';

function getNotice(searchParams) {
	if (searchParams.get('created') === '1') {
		return 'The client project was created successfully.';
	}

	return null;
}

function buildValues(input) {
	return {
		name: input.name ?? '',
		description: input.description ?? '',
		status: input.status ?? 'active',
		startAt: input.startAt ?? '',
		dueAt: input.dueAt ?? '',
		audienceId: input.audienceId ?? ''
	};
}

export async function load({ params, url, parent }) {
	const parentData = await parent();

	try {
		return {
			client: parentData.client,
			projects: await listProjectsByAudienceId(params.clientId),
			notice: getNotice(url.searchParams)
		};
	} catch (caughtError) {
		return {
			client: parentData.client,
			projects: [],
			notice: null,
			errorMessage: getProjectsStoreErrorMessage(caughtError, 'The client projects view could not be loaded.')
		};
	}
}

export const actions = {
	create: async ({ locals, params, request, url }) => {
		const formData = await request.formData();
		const input = readProjectInput(formData);
		const errors = {};

		if (!input.name) {
			errors.name = 'Project name is required.';
		}

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				intent: 'create',
				errors,
				values: buildValues({ ...input, audienceId: params.clientId })
			});
		}

		try {
			const currentLocalUser = await getLocalUserByLogtoUserId(locals.user?.sub);
			await createProject({
				...input,
				audienceId: params.clientId,
				createdByUserId: currentLocalUser?.id
			});
		} catch (caughtError) {
			return fail(caughtError?.status ?? 500, {
				intent: 'create',
				message: getProjectsStoreErrorMessage(caughtError),
				values: buildValues({ ...input, audienceId: params.clientId })
			});
		}

		throw redirect(303, `${url.pathname}?created=1`);
	}
};