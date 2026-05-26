import { fail, redirect } from '@sveltejs/kit';
import { getLocalUserByLogtoUserId } from '$lib/server/admin-access-store';
import {
	createProjectTask,
	createProjectTaskComment,
	getProjectTaskById,
	getProjectsStoreErrorMessage,
	updateProjectTask
} from '$lib/server/projects-store';
import { buildProjectTaskFormValues, readProjectTaskInput } from '$lib/server/project-form';

function readFilter(searchParams, name) {
	return String(searchParams.get(name) ?? '').trim();
}

function getNotice(searchParams) {
	if (searchParams.get('created') === '1') return 'The project task was created successfully.';
	if (searchParams.get('updated') === '1') return 'The project task was updated successfully.';
	return null;
}

function buildReturnHref(params, formData, extraParams = {}) {
	const searchParams = new URLSearchParams();
	for (const key of ['q', 'bucket', 'status']) {
		const value = String(formData.get(`return${key[0].toUpperCase()}${key.slice(1)}`) ?? '').trim();
		if (value) searchParams.set(key, value);
	}
	for (const [key, value] of Object.entries(extraParams)) {
		searchParams.set(key, String(value));
	}
	const search = searchParams.toString();
	return `/projects/${params.projectId}/tasks${search ? `?${search}` : ''}`;
}

function matchesFilters(task, filters) {
	const haystack = [task.title, task.description, ...task.tags.map((tag) => tag.name), ...task.assignedUsers.map((user) => user.name)].join(' ').toLowerCase();
	if (filters.q && !haystack.includes(filters.q.toLowerCase())) return false;
	if (filters.bucket && task.bucketId !== filters.bucket) return false;
	if (filters.status && task.status !== filters.status) return false;
	return true;
}

export async function load({ parent, url }) {
	const { project } = await parent();
	const filters = {
		q: readFilter(url.searchParams, 'q'),
		bucket: readFilter(url.searchParams, 'bucket'),
		status: readFilter(url.searchParams, 'status')
	};
	const editTaskId = readFilter(url.searchParams, 'edit');
	const editTask = editTaskId ? await getProjectTaskById(project.id, editTaskId, { includeComments: true }) : null;
	const filteredTasks = project.tasks.filter((task) => matchesFilters(task, filters));

	return {
		filters,
		tasks: filteredTasks,
		editTask,
		notice: getNotice(url.searchParams),
		errorMessage: editTaskId && !editTask ? 'Project task not found.' : null
	};
}

export const actions = {
	create: async ({ locals, params, request }) => {
		const formData = await request.formData();
		const input = readProjectTaskInput(formData);

		if (!input.title) {
			return fail(400, { intent: 'create', errors: { title: 'Task title is required.' }, values: buildProjectTaskFormValues(input) });
		}

		try {
			const currentLocalUser = await getLocalUserByLogtoUserId(locals.user?.sub);
			await createProjectTask(params.projectId, { ...input, createdByUserId: currentLocalUser?.id });
		} catch (error) {
			return fail(500, { intent: 'create', message: getProjectsStoreErrorMessage(error), values: buildProjectTaskFormValues(input) });
		}

		throw redirect(303, buildReturnHref(params, formData, { created: 1 }));
	},
	edit: async ({ params, request }) => {
		const formData = await request.formData();
		const taskId = String(formData.get('taskId') ?? '').trim();
		const input = readProjectTaskInput(formData);

		if (!taskId) {
			return fail(400, { intent: 'edit', message: 'Task ID is required.', values: buildProjectTaskFormValues(input), taskId });
		}

		if (!input.title) {
			return fail(400, { intent: 'edit', errors: { title: 'Task title is required.' }, values: { ...buildProjectTaskFormValues(input), id: taskId }, taskId });
		}

		try {
			const task = await updateProjectTask(params.projectId, taskId, input);
			if (!task) return fail(404, { intent: 'edit', message: 'Project task not found.', values: buildProjectTaskFormValues(input), taskId });
		} catch (error) {
			return fail(500, { intent: 'edit', message: getProjectsStoreErrorMessage(error), values: { ...buildProjectTaskFormValues(input), id: taskId }, taskId });
		}

		throw redirect(303, buildReturnHref(params, formData, { updated: 1 }));
	},
	addComment: async ({ locals, params, request }) => {
		const formData = await request.formData();
		const taskId = String(formData.get('taskId') ?? '').trim();
		const commentBody = String(formData.get('commentBody') ?? '').trim();

		if (!taskId || !commentBody) {
			return fail(400, {
				intent: 'addComment',
				commentErrors: !commentBody ? { body: 'Project task comment is required.' } : {},
				commentMessage: !taskId ? 'Task ID is required.' : '',
				taskId,
				commentBody
			});
		}

		try {
			const currentLocalUser = await getLocalUserByLogtoUserId(locals.user?.sub);
			await createProjectTaskComment(params.projectId, taskId, { authorUserId: currentLocalUser?.id, body: commentBody });
		} catch (error) {
			return fail(500, { intent: 'addComment', commentMessage: getProjectsStoreErrorMessage(error), taskId, commentBody });
		}

		throw redirect(303, buildReturnHref(params, formData, { edit: taskId, section: 'comments' }));
	},
	updateProgress: async ({ params, request }) => {
		const formData = await request.formData();
		const taskId = String(formData.get('taskId') ?? '').trim();
		const existingTask = taskId ? await getProjectTaskById(params.projectId, taskId) : null;

		if (!existingTask) {
			return fail(404, { intent: 'updateProgress', message: 'Project task not found.', taskId });
		}

		try {
			const task = await updateProjectTask(params.projectId, taskId, {
				...existingTask,
				assignedUserIds: existingTask.assignedUsers.map((user) => user.id),
				tags: existingTask.tags.map((tag) => tag.name),
				progressPercentage: String(formData.get('progressPercentage') ?? existingTask.progressPercentage)
			});
			return { intent: 'updateProgress', taskId, task };
		} catch (error) {
			return fail(500, { intent: 'updateProgress', message: getProjectsStoreErrorMessage(error), taskId });
		}
	}
};
