import { fail, redirect } from '@sveltejs/kit';
import { createProjectBucket, getProjectsStoreErrorMessage, updateProject } from '$lib/server/projects-store';
import { readProjectBucketInput, readProjectInput } from '$lib/server/project-form';

function getNotice(searchParams) {
	if (searchParams.get('updated') === '1') return 'The project was updated successfully.';
	if (searchParams.get('bucket') === 'created') return 'The list was created successfully.';
	return null;
}

export function load({ url }) {
	return { notice: getNotice(url.searchParams) };
}

export const actions = {
	updateProject: async ({ params, request }) => {
		const formData = await request.formData();
		const input = readProjectInput(formData);

		if (!input.name) {
			return fail(400, { intent: 'updateProject', message: 'Project name is required.', values: input });
		}

		try {
			const project = await updateProject(params.projectId, input);
			if (!project) return fail(404, { intent: 'updateProject', message: 'Project not found.', values: input });
		} catch (error) {
			return fail(500, { intent: 'updateProject', message: getProjectsStoreErrorMessage(error), values: input });
		}

		throw redirect(303, `/projects/${params.projectId}/settings?updated=1`);
	},
	createBucket: async ({ params, request }) => {
		const formData = await request.formData();
		const input = readProjectBucketInput(formData);

		if (!input.name) {
			return fail(400, { intent: 'createBucket', message: 'List name is required.', values: input });
		}

		try {
			await createProjectBucket(params.projectId, input);
		} catch (error) {
			return fail(500, { intent: 'createBucket', message: getProjectsStoreErrorMessage(error), values: input });
		}

		throw redirect(303, `/projects/${params.projectId}/settings?bucket=created`);
	}
};
