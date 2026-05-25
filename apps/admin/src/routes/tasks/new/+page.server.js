import { error, fail, redirect } from '@sveltejs/kit';
import { getLocalUserByLogtoUserId, listLocalUsers } from '$lib/server/admin-access-store';
import { createTask, getTasksStoreErrorMessage } from '$lib/server/tasks-store';
import { buildTaskFormValues, readTaskInput } from '$lib/server/task-form';
import { syncTaskAlerts } from '$lib/server/task-alerts';

export async function load() {
	return {
		users: await listLocalUsers()
	};
}

export const actions = {
	default: async ({ locals, request }) => {
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
				message: getTasksStoreErrorMessage(caughtError),
				values: buildTaskFormValues(input)
			});
		}

		throw redirect(303, '/tasks?created=1');
	}
};