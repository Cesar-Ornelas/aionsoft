import { json } from '@sveltejs/kit';
import { requireApiIntegration, getApiIntegrationTaskReadScope, ApiTokenAuthError, getApiAuthErrorMessage } from '$lib/server/api-token-auth';
import { createTask, getTaskBySourceReference, getTasksStoreErrorMessage, listTasksForIntegrationScope } from '$lib/server/tasks-store';
import { syncTaskAlerts } from '$lib/server/task-alerts';

function normalizeString(value) {
	return String(value ?? '').trim();
}

function normalizeTagKey(value) {
	return normalizeString(value)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
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
		priority: normalizeString(payload.priority) || 'normal',
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

function getAuthErrorResponse(error) {
	return json(
		{
			message: getApiAuthErrorMessage(error)
		},
		{
			status: error instanceof ApiTokenAuthError ? error.status : 401
		}
	);
}

export async function GET({ request, url }) {
	let integration;

	try {
		integration = await requireApiIntegration(request, 'tasks:read');
	} catch (error) {
		return getAuthErrorResponse(error);
	}

	const baseScope = getApiIntegrationTaskReadScope(integration);
	const requestedTagKey = normalizeTagKey(url.searchParams.get('tag'));
	let allowedTagKeys = baseScope.allowedTagKeys;

	if (requestedTagKey) {
		if (baseScope.allowedTagKeys.length > 0 && !baseScope.allowedTagKeys.includes(requestedTagKey)) {
			return json({ tasks: [], count: 0 }, { status: 200 });
		}

		allowedTagKeys = [requestedTagKey];
	}

	try {
		const tasks = await listTasksForIntegrationScope(
			{
				sourceIntegrationId: baseScope.sourceIntegrationId,
				allowedTagKeys
			},
			{
				status: normalizeString(url.searchParams.get('status')).toLowerCase(),
				sourceExternalId: normalizeString(url.searchParams.get('sourceExternalId')),
				limit: normalizeString(url.searchParams.get('limit'))
			}
		);

		return json({ tasks, count: tasks.length }, { status: 200 });
	} catch (error) {
		return json(
			{
				message: getTasksStoreErrorMessage(error, 'The tasks could not be loaded.')
			},
			{ status: 400 }
		);
	}
}

export async function POST({ request }) {
	let integration;

	try {
		integration = await requireApiIntegration(request, 'tasks:create');
	} catch (error) {
		return getAuthErrorResponse(error);
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