import { json } from '@sveltejs/kit';
import { requireApiIntegration, ApiTokenAuthError, getApiAuthErrorMessage } from '$lib/server/api-token-auth';
import { createTask, getTaskBySourceReference, getTasksStoreErrorMessage } from '$lib/server/tasks-store';
import { syncTaskAlerts } from '$lib/server/task-alerts';

function normalizeString(value) {
	return String(value ?? '').trim();
}

function readAssignedUserIds(value) {
	if (!Array.isArray(value)) {
		return [];
	}

	return value.map((item) => normalizeString(item)).filter(Boolean);
}

function readTags(value) {
	if (Array.isArray(value)) {
		return value.map((item) => normalizeString(item)).filter(Boolean);
	}

	return normalizeString(value);
}

function buildTaskInput(payload, integration) {
	return {
		title: normalizeString(payload.title),
		description: normalizeString(payload.description),
		status: normalizeString(payload.status) || 'open',
		dueAt: normalizeString(payload.dueAt),
		notificationOffsetMinutes: normalizeString(payload.notificationOffsetMinutes),
		recurrenceRule: normalizeString(payload.recurrenceRule) || 'none',
		assignedUserIds: readAssignedUserIds(payload.assignedUserIds),
		tags: readTags(payload.tags),
		createdByUserId: integration.actorUserId,
		sourceIntegrationId: integration.id,
		sourceType: normalizeString(payload.sourceType) || integration.kind,
		sourceLabel: normalizeString(payload.sourceLabel) || integration.name,
		sourceExternalId: normalizeString(payload.sourceExternalId),
		createdVia: 'api'
	};
}

function validateTaskInput(input) {
	const errors = {};

	if (!input.title) {
		errors.title = 'Task title is required.';
	}

	if (!input.dueAt) {
		errors.dueAt = 'Task due date is required.';
	}

	if (!input.sourceExternalId) {
		errors.sourceExternalId = 'An external source reference is required.';
	}

	return errors;
}

export async function POST({ request }) {
	let integration;

	try {
		integration = await requireApiIntegration(request, 'tasks:create');
	} catch (error) {
		return json(
			{
				message: getApiAuthErrorMessage(error)
			},
			{
				status: error instanceof ApiTokenAuthError ? error.status : 401
			}
		);
	}

	let payload;

	try {
		payload = await request.json();
	} catch {
		return json(
			{
				message: 'The request body must be valid JSON.'
			},
			{ status: 400 }
		);
	}

	const input = buildTaskInput(payload, integration);
	const errors = validateTaskInput(input);

	if (Object.keys(errors).length > 0) {
		return json(
			{
				message: 'The task request is invalid.',
				errors
			},
			{ status: 400 }
		);
	}

	try {
		const existingTask = await getTaskBySourceReference(integration.id, input.sourceExternalId);

		if (existingTask) {
			return json({ task: existingTask, created: false }, { status: 200 });
		}

		const task = await createTask(input);
		await syncTaskAlerts(task);

		return json({ task, created: true }, { status: 201 });
	} catch (error) {
		return json(
			{
				message: getTasksStoreErrorMessage(error)
			},
			{ status: 400 }
		);
	}
}