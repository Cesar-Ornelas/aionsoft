import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { executeAdminJob } from '$lib/server/admin-jobs';
import { getTasksStoreErrorMessage, reconcileTaskSystemTags } from '$lib/server/tasks-store';

function getMaintenanceSecret() {
	return String(env.TASK_MAINTENANCE_SECRET ?? '').trim();
}

function getAuthorizationState(request) {
	const expectedSecret = getMaintenanceSecret();

	if (!expectedSecret) {
		return { authorized: false, configured: false };
	}

	return {
		authorized: request.headers.get('authorization') === `Bearer ${expectedSecret}`,
		configured: true
	};
}

export async function POST({ request }) {
	const authorization = getAuthorizationState(request);

	if (!authorization.configured) {
		return json({ message: 'Task maintenance is not configured.' }, { status: 503 });
	}

	if (!authorization.authorized) {
		return json({ message: 'Unauthorized.' }, { status: 401 });
	}

	try {
		const { result } = await executeAdminJob('task-maintenance.reconcile-tags', {
			source: 'ofelia',
			metadata: {
				path: '/api/internal/task-maintenance/reconcile-tags'
			}
		});

		return json({
			ok: true,
			...result
		});
	} catch (error) {
		return json(
			{ message: getTasksStoreErrorMessage(error, 'Task maintenance could not be completed.') },
			{ status: 500 }
		);
	}
}