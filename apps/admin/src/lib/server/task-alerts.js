import {
	registerAlert,
	resolveAlertByDedupeKey,
	resolveAlertsBySource
} from '$lib/server/alerts-store';

function buildTaskEditHref(taskId) {
	return `/tasks/${taskId}/edit`;
}

function buildReminderTriggerAt(task) {
	if (task.notificationOffsetMinutes == null) {
		return null;
	}

	const dueAt = new Date(task.dueAt).getTime();
	return new Date(dueAt - task.notificationOffsetMinutes * 60_000).toISOString();
}

export async function syncTaskAlerts(task) {
	if (task.status === 'completed') {
		await resolveAlertsBySource('task', task.id);
		return;
	}

	const href = buildTaskEditHref(task.id);
	const dueSeverity = new Date(task.dueAt).getTime() <= Date.now() ? 'critical' : 'warning';

	await registerAlert({
		dedupeKey: `task:${task.id}:due`,
		sourceType: 'task',
		sourceId: task.id,
		title: `Task due: ${task.title}`,
		message: task.description || 'A task is approaching its due time.',
		severity: dueSeverity,
		status: 'active',
		triggerAt: task.dueAt,
		href
	});

	const reminderTriggerAt = buildReminderTriggerAt(task);

	if (!reminderTriggerAt) {
		await resolveAlertByDedupeKey(`task:${task.id}:reminder`);
		return;
	}

	await registerAlert({
		dedupeKey: `task:${task.id}:reminder`,
		sourceType: 'task',
		sourceId: task.id,
		title: `Task reminder: ${task.title}`,
		message: task.description || 'A task reminder is scheduled before the due time.',
		severity: 'info',
		status: 'active',
		triggerAt: reminderTriggerAt,
		href
	});
}