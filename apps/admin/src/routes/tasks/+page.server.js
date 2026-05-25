import { error, fail, redirect } from '@sveltejs/kit';
import { getLocalUserByLogtoUserId, listLocalUsers } from '$lib/server/admin-access-store';
import { createTask, createTaskComment, getTaskById, listTasks, updateTask, getTasksStoreErrorMessage } from '$lib/server/tasks-store';
import { buildTaskFormValues, readTaskInput } from '$lib/server/task-form';
import { syncTaskAlerts } from '$lib/server/task-alerts';

function getNotice(searchParams) {
	if (searchParams.get('created') === '1') {
		return 'The task was created successfully.';
	}

	if (searchParams.get('updated') === '1') {
		return 'The task was updated successfully.';
	}

	if (searchParams.get('completed') === '1') {
		return 'The task was completed successfully.';
	}

	const bulkUpdatedCount = Number.parseInt(searchParams.get('bulk_updated') ?? '', 10);

	if (Number.isInteger(bulkUpdatedCount) && bulkUpdatedCount > 0) {
		return bulkUpdatedCount === 1
			? '1 task was updated successfully.'
			: `${bulkUpdatedCount} tasks were updated successfully.`;
	}

	return null;
}

function buildTaskUpdateInput(task, overrides = {}) {
	return {
		title: task.title,
		description: task.description,
		status: task.status,
		progressPercentage: String(task.progressPercentage ?? 0),
		dueAt: task.dueAt,
		dueTime: task.dueTime,
		hasDueTime: task.hasDueTime,
		notificationOffsetMinutes: task.notificationOffsetMinutes,
		recurrenceRule: task.recurrenceRule,
		assignedUserIds: task.assignedUsers.map((user) => user.id),
		tags: task.tags.map((tag) => tag.name),
		createdByUserId: task.createdByUserId,
		sourceIntegrationId: task.sourceIntegrationId,
		sourceType: task.sourceType,
		sourceLabel: task.sourceLabel,
		sourceExternalId: task.sourceExternalId,
		createdVia: task.createdVia,
		...overrides
	};
}

function buildReturnTasksHref(url, formData, params = {}) {
	const redirectUrl = new URL(url);
	const filters = [
		['q', String(formData.get('returnQ') ?? '').trim()],
		['status', String(formData.get('returnStatus') ?? '').trim()],
		['tag', String(formData.get('returnTag') ?? '').trim()],
		['assignee', String(formData.get('returnAssignee') ?? '').trim()],
		['edit', String(formData.get('returnEdit') ?? '').trim()],
		['section', String(formData.get('returnSection') ?? '').trim()]
	];

	redirectUrl.search = '';

	for (const [key, value] of filters) {
		if (value) {
			redirectUrl.searchParams.set(key, value);
		}
	}

	for (const [key, value] of Object.entries(params)) {
		redirectUrl.searchParams.set(key, String(value));
	}

	const search = redirectUrl.searchParams.toString();
	return `${redirectUrl.pathname}${search ? `?${search}` : ''}`;
}

function matchesFilters(task, filters) {
	const searchHaystack = [
		task.title,
		task.description,
		...task.tags.map((tag) => tag.name),
		...task.assignedUsers.map((user) => user.name),
		...task.assignedUsers.map((user) => user.email)
	]
		.join(' ')
		.toLowerCase();

	if (filters.q && !searchHaystack.includes(filters.q)) {
		return false;
	}

	if (filters.status && task.status !== filters.status) {
		return false;
	}

	if (filters.tag && !task.tags.some((tag) => tag.key === filters.tag)) {
		return false;
	}

	if (filters.assignee && !task.assignedUsers.some((user) => user.id === filters.assignee)) {
		return false;
	}

	return true;
}

export async function load({ url }) {
	const filters = {
		q: String(url.searchParams.get('q') ?? '').trim().toLowerCase(),
		status: String(url.searchParams.get('status') ?? '').trim(),
		tag: String(url.searchParams.get('tag') ?? '').trim().toLowerCase(),
		assignee: String(url.searchParams.get('assignee') ?? '').trim()
	};
	const editTaskId = String(url.searchParams.get('edit') ?? '').trim();

	try {
		const [tasks, users, editTask] = await Promise.all([
			listTasks(),
			listLocalUsers(),
			editTaskId ? getTaskById(editTaskId, { includeComments: true }) : Promise.resolve(null)
		]);
		const normalizedTasks = tasks.filter(Boolean);
		const availableTags = [...new Map(normalizedTasks.flatMap((task) => task.tags).map((tag) => [tag.key, tag])).values()];
		const availableAssignees = [
			...new Map(normalizedTasks.flatMap((task) => task.assignedUsers).map((user) => [user.id, user])).values()
		];
		const editErrorMessage = editTaskId && !editTask ? 'Task not found.' : null;

		return {
			tasks: normalizedTasks.filter((task) => matchesFilters(task, filters)),
			users,
			editTask,
			availableTags,
			availableAssignees,
			filters,
			notice: getNotice(url.searchParams),
			errorMessage: editErrorMessage
		};
	} catch (caughtError) {
		return {
			tasks: [],
			users: [],
			editTask: null,
			availableTags: [],
			availableAssignees: [],
			filters,
			notice: null,
			errorMessage: getTasksStoreErrorMessage(caughtError)
		};
	}
}

export const actions = {
	create: async ({ locals, request }) => {
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
				values: buildTaskFormValues(input)
			});
		}

		let currentLocalUser;

		try {
			currentLocalUser = await getLocalUserByLogtoUserId(locals.user?.sub);

			if (!currentLocalUser) {
				throw error(403, 'No local admin user mapping was found for the current account.');
			}

			const task = await createTask({
				...input,
				createdByUserId: currentLocalUser.id
			});

			await syncTaskAlerts(task);
		} catch (caughtError) {
			return fail(caughtError?.status ?? 500, {
				intent: 'create',
				message: getTasksStoreErrorMessage(caughtError),
				values: buildTaskFormValues(input)
			});
		}

		throw redirect(303, '/tasks?created=1');
	},
	edit: async ({ request, url }) => {
		const formData = await request.formData();
		const taskId = String(formData.get('taskId') ?? '').trim();
		const input = readTaskInput(formData);
		const errors = {};

		if (!taskId) {
			return fail(400, {
				intent: 'edit',
				message: 'Task ID is required to update a task.',
				values: buildTaskFormValues(input),
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
					...buildTaskFormValues(input),
					id: taskId
				},
				taskId
			});
		}

		let existingTask;

		try {
			existingTask = await getTaskById(taskId);

			if (!existingTask) {
				throw error(404, 'Task not found.');
			}

			const task = await updateTask(taskId, {
				...input,
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
					...buildTaskFormValues(input),
					id: taskId
				},
				taskId
			});
		}

		throw redirect(303, buildReturnTasksHref(url, formData, { updated: 1 }));
	},
	addComment: async ({ locals, request, url }) => {
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

		let currentLocalUser;

		try {
			currentLocalUser = await getLocalUserByLogtoUserId(locals.user?.sub);

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

		throw redirect(303, buildReturnTasksHref(url, formData, { edit: taskId, section: 'comments' }));
	},
	updateProgress: async ({ request, url }) => {
		const formData = await request.formData();
		const taskId = String(formData.get('taskId') ?? '').trim();
		const progressPercentage = String(formData.get('progressPercentage') ?? '').trim();

		if (!taskId) {
			return fail(400, {
				message: 'Task ID is required to update progress.'
			});
		}

		if (!progressPercentage) {
			return fail(400, {
				message: 'Task progress is required.'
			});
		}

		let task;

		try {
			task = await getTaskById(taskId);

			if (!task) {
				throw error(404, 'Task not found.');
			}

			const updatedTask = await updateTask(
				taskId,
				buildTaskUpdateInput(task, {
					progressPercentage
				})
			);

			if (!updatedTask) {
				throw error(404, 'Task not found.');
			}

			await syncTaskAlerts(updatedTask);

			return {
				intent: 'updateProgress',
				taskId,
				task: updatedTask
			};
		} catch (caughtError) {
			return fail(caughtError?.status ?? 500, {
				intent: 'updateProgress',
				taskId,
				message: getTasksStoreErrorMessage(caughtError)
			});
		}
	},
	complete: async ({ request }) => {
		const formData = await request.formData();
		const taskId = String(formData.get('taskId') ?? '').trim();

		if (!taskId) {
			return fail(400, {
				message: 'Task ID is required to complete a task.'
			});
		}

		let task;

		try {
			task = await getTaskById(taskId);

			if (!task) {
				throw error(404, 'Task not found.');
			}

			const updatedTask = await updateTask(taskId, buildTaskUpdateInput(task, {
				status: 'completed',
				progressPercentage: '100',
			}));

			if (!updatedTask) {
				throw error(404, 'Task not found.');
			}

			await syncTaskAlerts(updatedTask);
		} catch (caughtError) {
			return fail(caughtError?.status ?? 500, {
				message: getTasksStoreErrorMessage(caughtError)
			});
		}

		throw redirect(303, '/tasks?completed=1');
	},
	bulkUpdate: async ({ request, url }) => {
		const formData = await request.formData();
		const taskIds = formData.getAll('taskIds').map((value) => String(value).trim()).filter(Boolean);
		const status = String(formData.get('status') ?? '').trim();
		const progressPercentage = String(formData.get('progressPercentage') ?? '').trim();

		if (taskIds.length === 0) {
			return fail(400, {
				intent: 'bulkUpdate',
				message: 'Select at least one task to update.',
				values: {
					taskIds,
					status,
					progressPercentage
				}
			});
		}

		if (!status && !progressPercentage) {
			return fail(400, {
				intent: 'bulkUpdate',
				message: 'Choose a new status, a new progress value, or both.',
				values: {
					taskIds,
					status,
					progressPercentage
				}
			});
		}

		try {
			const tasks = await Promise.all(taskIds.map((taskId) => getTaskById(taskId)));

			if (tasks.some((task) => !task)) {
				throw error(404, 'One or more selected tasks could not be found.');
			}

			const updatedTasks = await Promise.all(
				tasks.map((task) =>
					updateTask(
						task.id,
						buildTaskUpdateInput(task, {
							...(status ? { status } : {}),
							...(progressPercentage ? { progressPercentage } : {})
						})
					)
				)
			);

			await Promise.all(updatedTasks.map((task) => syncTaskAlerts(task)));
		} catch (caughtError) {
			return fail(caughtError?.status ?? 500, {
				intent: 'bulkUpdate',
				message: getTasksStoreErrorMessage(caughtError),
				values: {
					taskIds,
					status,
					progressPercentage
				}
			});
		}

		throw redirect(303, buildReturnTasksHref(url, formData, { bulk_updated: taskIds.length }));
	}
};