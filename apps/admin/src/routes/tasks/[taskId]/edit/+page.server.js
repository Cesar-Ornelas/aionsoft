import { error, fail, redirect } from '@sveltejs/kit';
import { listLocalUsers } from '$lib/server/admin-access-store';
import { getTaskById, getTasksStoreErrorMessage, updateTask } from '$lib/server/tasks-store';
import { syncTaskAlerts } from '$lib/server/task-alerts';

function readTrimmedString(formData, name) {
	return String(formData.get(name) ?? '').trim();
}

function readTaskInput(formData) {
	return {
		title: readTrimmedString(formData, 'title'),
		description: readTrimmedString(formData, 'description'),
		status: readTrimmedString(formData, 'status') || 'open',
		dueAt: readTrimmedString(formData, 'dueAt'),
		notificationOffsetMinutes: readTrimmedString(formData, 'notificationOffsetMinutes'),
		recurrenceRule: readTrimmedString(formData, 'recurrenceRule') || 'none',
		assignedUserIds: formData.getAll('assignedUserIds').map((value) => String(value).trim()).filter(Boolean),
		tags: readTrimmedString(formData, 'tags')
	};
}

function buildTaskFormValues(input) {
	return {
		...input,
		tagsInput: input.tags
	};
}

export async function load({ params }) {
	try {
		const [task, users] = await Promise.all([getTaskById(params.taskId), listLocalUsers()]);

		if (!task) {
			throw error(404, 'Task not found.');
		}

		return {
			task,
			users
		};
	} catch (caughtError) {
		throw error(caughtError?.status ?? 500, getTasksStoreErrorMessage(caughtError));
	}
}

export const actions = {
	default: async ({ params, request }) => {
		const formData = await request.formData();
		const input = readTaskInput(formData);
		const errors = {};

		if (!input.title) {
			errors.title = 'Task title is required.';
		}

		if (!input.dueAt) {
			errors.dueAt = 'Task due date is required.';
		}

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				errors,
				values: buildTaskFormValues(input)
			});
		}

		let existingTask;

		try {
			existingTask = await getTaskById(params.taskId);

			if (!existingTask) {
				throw error(404, 'Task not found.');
			}

			const task = await updateTask(params.taskId, {
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
				message: getTasksStoreErrorMessage(caughtError),
				values: buildTaskFormValues(input)
			});
		}

		throw redirect(303, '/tasks?updated=1');
	}
};