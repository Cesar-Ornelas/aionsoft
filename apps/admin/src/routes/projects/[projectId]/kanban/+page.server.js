import { fail, redirect } from '@sveltejs/kit';
import { getProjectsStoreErrorMessage, moveProjectTask, updateProjectBucketColor } from '$lib/server/projects-store';

function getNotice(searchParams) {
	if (searchParams.get('moved') === '1') return 'The project task was moved successfully.';
	if (searchParams.get('bucketColorUpdated') === '1') return 'The bucket color was updated successfully.';
	return null;
}

export function load({ url }) {
	return {
		notice: getNotice(url.searchParams)
	};
}

export const actions = {
	moveTask: async ({ params, request }) => {
		const formData = await request.formData();
		const taskId = String(formData.get('taskId') ?? '').trim();
		const bucketId = String(formData.get('bucketId') ?? '').trim();
		const progressPercentage = String(formData.get('progressPercentage') ?? '').trim();
		const targetIndex = String(formData.get('targetIndex') ?? '').trim();

		if (!taskId || !bucketId) {
			return fail(400, { message: 'Task and list are required to move a project task.' });
		}

		try {
			await moveProjectTask(params.projectId, taskId, { bucketId, progressPercentage, targetIndex });
		} catch (error) {
			return fail(500, { message: getProjectsStoreErrorMessage(error) });
		}

		throw redirect(303, `/projects/${params.projectId}/kanban?moved=1`);
	},
	updateBucketColor: async ({ params, request }) => {
		const formData = await request.formData();
		const bucketId = String(formData.get('bucketId') ?? '').trim();
		const color = String(formData.get('color') ?? '').trim();

		if (!bucketId || !color) {
			return fail(400, { message: 'Bucket and color are required.' });
		}

		try {
			const bucket = await updateProjectBucketColor(params.projectId, bucketId, color);

			if (!bucket) {
				return fail(404, { message: 'Project bucket not found.' });
			}
		} catch (error) {
			return fail(500, { message: getProjectsStoreErrorMessage(error) });
		}

		throw redirect(303, `/projects/${params.projectId}/kanban?bucketColorUpdated=1`);
	}
};
