import { fail, redirect } from '@sveltejs/kit';
import { createProjectBucket, getProjectById, getProjectsStoreErrorMessage, updateProject, updateProjectBucketColor } from '$lib/server/projects-store';
import { readProjectBucketInput, readProjectInput } from '$lib/server/project-form';

function getNotice(searchParams) {
	if (searchParams.get('updated') === '1') return 'The project was updated successfully.';
	if (searchParams.get('bucket') === 'created') return 'The list was created successfully.';
	if (searchParams.get('bucketColorUpdated') === '1') return 'The kanban glow color was updated successfully.';
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
			const existingProject = await getProjectById(params.projectId);

			if (!existingProject) {
				return fail(404, { intent: 'updateProject', message: 'Project not found.', values: input });
			}

			const project = await updateProject(params.projectId, {
				...input,
				audienceId: input.audienceId || existingProject.audienceId,
				createdByUserId: existingProject.createdByUserId
			});
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
	},
	updateBucketColor: async ({ params, request }) => {
		const formData = await request.formData();
		const bucketId = String(formData.get('bucketId') ?? '').trim();
		const color = String(formData.get('color') ?? '').trim();

		if (!bucketId || !color) {
			return fail(400, { intent: 'updateBucketColor', message: 'List and color are required.' });
		}

		try {
			const bucket = await updateProjectBucketColor(params.projectId, bucketId, color);

			if (!bucket) {
				return fail(404, { intent: 'updateBucketColor', message: 'List not found.' });
			}
		} catch (error) {
			return fail(500, { intent: 'updateBucketColor', message: getProjectsStoreErrorMessage(error) });
		}

		throw redirect(303, `/projects/${params.projectId}/settings?bucketColorUpdated=1`);
	}
};
