import { error, fail, redirect } from '@sveltejs/kit';
import { getLocalUserByLogtoUserId, listLocalUsers } from '$lib/server/admin-access-store';
import { buildTaskFormValues, readTaskInput } from '$lib/server/task-form';
import { syncTaskAlerts } from '$lib/server/task-alerts';
import { createTask, createTaskComment, getTaskById, getTasksStoreErrorMessage, listTasksByAudienceId, updateTask } from '$lib/server/tasks-store';

function getNotice(searchParams) {
	if (searchParams.get('created') === '1') {
		return 'The client task was created successfully.';
	}

	if (searchParams.get('updated') === '1') {
		return 'The client task was updated successfully.';
	}

	return null;
}

function buildReturnHref(url, params = {}) {
	const redirectUrl = new URL(url);
	redirectUrl.search = '';

	for (const [key, value] of Object.entries(params)) {
		redirectUrl.searchParams.set(key, String(value));
	}

	const search = redirectUrl.searchParams.toString();
	return `${redirectUrl.pathname}${search ? `?${search}` : ''}`;
}

function ensureClientTask(task, clientId) {
	if (!task || task.audienceId !== clientId) {
		throw error(404, 'Task not found.');
	}

	return task;
}

export async function load({ params, url, parent }) {
	const parentData = await parent();
	const editTaskId = String(url.searchParams.get('edit') ?? '').trim();

	try {
		const [tasks, users, editTask] = await Promise.all([
			listTasksByAudienceId(params.clientId),
			listLocalUsers(),
			editTaskId ? getTaskById(editTaskId, { includeComments: true }) : Promise.resolve(null)
		]);

		return {
			client: parentData.client,
			tasks: tasks.filter(Boolean),
			users,
			editTask: editTask?.audienceId === params.clientId ? editTask : null,
			notice: getNotice(url.searchParams),
			errorMessage: editTaskId && editTask?.audienceId !== params.clientId ? 'Task not found.' : null
		};
	} catch (caughtError) {
		return {
			client: parentData.client,
			tasks: [],
			users: [],
			editTask: null,
			notice: null,
			errorMessage: getTasksStoreErrorMessage(caughtError)
		};
	}
}

export const actions = {
	create: async ({ locals, params, request, url }) => {
		const formData = await request.formData();
		const input = readTaskInput(formData);
		const errors = {};

		if (!input.title) {
			errors.title = 'Task title is required.';
		}

		if (!input.dueDate) {
			errors.dueDate = 'Task due date is required.';
		}

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				intent: 'create',
				errors,
				values: buildTaskFormValues({ ...input, audienceId: params.clientId })
			});
		}

		try {
			const currentLocalUser = await getLocalUserByLogtoUserId(locals.user?.sub);

			if (!currentLocalUser) {
				throw error(403, 'No local admin user mapping was found for the current account.');
			}

			const task = await createTask({
				...input,
				audienceId: params.clientId,
				createdByUserId: currentLocalUser.id
			});

			await syncTaskAlerts(task);
		} catch (caughtError) {
			return fail(caughtError?.status ?? 500, {
				intent: 'create',
				message: getTasksStoreErrorMessage(caughtError),
				values: buildTaskFormValues({ ...input, audienceId: params.clientId })
			});
		}

		throw redirect(303, buildReturnHref(url, { created: 1 }));
	},
	edit: async ({ params, request, url }) => {
		const formData = await request.formData();
		const taskId = String(formData.get('taskId') ?? '').trim();
		const input = readTaskInput(formData);
		const errors = {};

		if (!taskId) {
			return fail(400, {
				intent: 'edit',
				message: 'Task ID is required to update a task.',
				values: buildTaskFormValues({ ...input, audienceId: params.clientId }),
				taskId
			});
		}

		if (!input.title) {
			errors.title = 'Task title is required.';
		}

		if (!input.dueDate) {
			errors.dueDate = 'Task due date is required.';
		}

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				intent: 'edit',
				errors,
				values: {
					...buildTaskFormValues({ ...input, audienceId: params.clientId }),
					id: taskId
				},
				taskId
			});
		}

		try {
			const existingTask = ensureClientTask(await getTaskById(taskId), params.clientId);
			const task = await updateTask(taskId, {
				...input,
				audienceId: params.clientId,
				createdByUserId: existingTask.createdByUserId,
				sourceIntegrationId: existingTask.sourceIntegrationId,
				sourceType: existingTask.sourceType,
				sourceLabel: existingTask.sourceLabel,
				sourceExternalId: existingTask.sourceExternalId,
				createdVia: existingTask.createdVia
			});

			if (!task) {
				throw error(404, 'Task not found.');
			}

			await syncTaskAlerts(task);
		} catch (caughtError) {
			return fail(caughtError?.status ?? 500, {
				intent: 'edit',
				message: getTasksStoreErrorMessage(caughtError),
				values: {
					...buildTaskFormValues({ ...input, audienceId: params.clientId }),
					id: taskId
				},
				taskId
			});
		}

		throw redirect(303, buildReturnHref(url, { updated: 1 }));
	},
	addComment: async ({ locals, params, request, url }) => {
		const formData = await request.formData();
		const taskId = String(formData.get('taskId') ?? '').trim();
		const commentBody = String(formData.get('commentBody') ?? '').trim();

		if (!taskId) {
			return fail(400, {
				intent: 'addComment',
				commentMessage: 'Task ID is required to add a comment.',
				taskId,
				commentBody
			});
		}

		if (!commentBody) {
			return fail(400, {
				intent: 'addComment',
				commentErrors: {
					body: 'Task comment is required.'
				},
				taskId,
				commentBody
			});
		}

		try {
			ensureClientTask(await getTaskById(taskId), params.clientId);
			const currentLocalUser = await getLocalUserByLogtoUserId(locals.user?.sub);

			if (!currentLocalUser) {
				throw error(403, 'No local admin user mapping was found for the current account.');
			}

			await createTaskComment(taskId, {
				authorUserId: currentLocalUser.id,
				body: commentBody
			});
		} catch (caughtError) {
			return fail(caughtError?.status ?? 500, {
				intent: 'addComment',
				commentMessage: getTasksStoreErrorMessage(caughtError),
				taskId,
				commentBody
			});
		}

		throw redirect(303, buildReturnHref(url, { edit: taskId, section: 'comments' }));
	}
};