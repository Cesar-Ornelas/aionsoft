import { fail, redirect } from '@sveltejs/kit';
import { getLocalUserByLogtoUserId } from '$lib/server/admin-access-store';
import {
	createProjectMilestone,
	createProjectPhase,
	createProjectTask,
	getProjectsStoreErrorMessage
} from '$lib/server/projects-store';
import { buildProjectTaskFormValues, readProjectMilestoneInput, readProjectPhaseInput, readProjectTaskInput } from '$lib/server/project-form';

function getNotice(searchParams) {
	if (searchParams.get('phase') === 'created') return 'The phase was created successfully.';
	if (searchParams.get('milestone') === 'created') return 'The milestone was created successfully.';
	if (searchParams.get('task') === 'created') return 'The project task was created successfully.';
	return null;
}

export function load({ url }) {
	return {
		notice: getNotice(url.searchParams)
	};
}

export const actions = {
	createPhase: async ({ params, request }) => {
		const formData = await request.formData();
		const input = readProjectPhaseInput(formData);

		if (!input.name) {
			return fail(400, { intent: 'createPhase', message: 'Phase name is required.', values: input });
		}

		try {
			await createProjectPhase(params.projectId, input);
		} catch (error) {
			return fail(500, { intent: 'createPhase', message: getProjectsStoreErrorMessage(error), values: input });
		}

		throw redirect(303, `/projects/${params.projectId}/plan?phase=created`);
	},
	createMilestone: async ({ params, request }) => {
		const formData = await request.formData();
		const input = readProjectMilestoneInput(formData);

		if (!input.name || !input.phaseId) {
			return fail(400, { intent: 'createMilestone', message: 'Milestone name and phase are required.', values: input });
		}

		try {
			await createProjectMilestone(params.projectId, input);
		} catch (error) {
			return fail(500, { intent: 'createMilestone', message: getProjectsStoreErrorMessage(error), values: input });
		}

		throw redirect(303, `/projects/${params.projectId}/plan?milestone=created`);
	},
	createTask: async ({ locals, params, request }) => {
		const formData = await request.formData();
		const input = readProjectTaskInput(formData);

		if (!input.title) {
			return fail(400, {
				intent: 'createTask',
				errors: { title: 'Task title is required.' },
				values: buildProjectTaskFormValues(input)
			});
		}

		try {
			const currentLocalUser = await getLocalUserByLogtoUserId(locals.user?.sub);
			await createProjectTask(params.projectId, {
				...input,
				createdByUserId: currentLocalUser?.id
			});
		} catch (error) {
			return fail(500, {
				intent: 'createTask',
				message: getProjectsStoreErrorMessage(error),
				values: buildProjectTaskFormValues(input)
			});
		}

		throw redirect(303, `/projects/${params.projectId}/plan?task=created`);
	}
};
