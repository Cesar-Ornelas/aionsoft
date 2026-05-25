import { error, fail, redirect } from '@sveltejs/kit';
import { getTaskById, listTasks, updateTask, getTasksStoreErrorMessage } from '$lib/server/tasks-store';
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

	return null;
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

	try {
		const tasks = (await listTasks()).filter(Boolean);
		const availableTags = [...new Map(tasks.flatMap((task) => task.tags).map((tag) => [tag.key, tag])).values()];
		const availableAssignees = [
			...new Map(tasks.flatMap((task) => task.assignedUsers).map((user) => [user.id, user])).values()
		];

		return {
			tasks: tasks.filter((task) => matchesFilters(task, filters)),
			availableTags,
			availableAssignees,
			filters,
			notice: getNotice(url.searchParams)
		};
	} catch (caughtError) {
		return {
			tasks: [],
			availableTags: [],
			availableAssignees: [],
			filters,
			notice: null,
			errorMessage: getTasksStoreErrorMessage(caughtError)
		};
	}
}

export const actions = {
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

			const updatedTask = await updateTask(taskId, {
				title: task.title,
				description: task.description,
				status: 'completed',
				dueAt: task.dueAt,
				notificationOffsetMinutes: task.notificationOffsetMinutes,
				recurrenceRule: task.recurrenceRule,
				assignedUserIds: task.assignedUsers.map((user) => user.id),
				tags: task.tags.map((tag) => tag.name),
				createdByUserId: task.createdByUserId,
				sourceIntegrationId: task.sourceIntegrationId,
				sourceType: task.sourceType,
				sourceLabel: task.sourceLabel,
				sourceExternalId: task.sourceExternalId,
				createdVia: task.createdVia
			});

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
	}
};