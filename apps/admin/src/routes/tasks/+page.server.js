import { error, fail, redirect } from '@sveltejs/kit';
import { getLocalUserByLogtoUserId, listLocalUsers } from '$lib/server/admin-access-store';
import { listClients } from '$lib/server/clients-store';
import { createTask, createTaskComment, getTaskById, listInternalTasks, updateTask, getTasksStoreErrorMessage } from '$lib/server/tasks-store';
import { buildTaskFormValues, readTaskInput } from '$lib/server/task-form';
import { syncTaskAlerts } from '$lib/server/task-alerts';

const TERMINAL_STATUSES = new Set(['completed', 'canceled']);
const ACTIVE_STATUSES = new Set(['open', 'in_progress', 'on_hold', 'deferred']);

function isSameDay(leftDate, rightDate) {
	return leftDate.getFullYear() === rightDate.getFullYear()
		&& leftDate.getMonth() === rightDate.getMonth()
		&& leftDate.getDate() === rightDate.getDate();
}

function getDaysUntil(date, now) {
	const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	return Math.round((startOfDate.getTime() - startOfToday.getTime()) / 86_400_000);
}

function getTaskTimestamp(task, field) {
	const value = task?.[field];
	const date = value ? new Date(value) : null;
	return date && !Number.isNaN(date.getTime()) ? date : null;
}

function isTerminalTask(task) {
	return TERMINAL_STATUSES.has(task.status);
}

function isActiveTask(task) {
	return ACTIVE_STATUSES.has(task.status);
}

function isOverdueTask(task, now) {
	if (isTerminalTask(task)) {
		return false;
	}

	const dueAt = getTaskTimestamp(task, 'dueAt');
	return dueAt ? getDaysUntil(dueAt, now) < 0 : false;
}

function isDueThisWeek(task, now) {
	if (isTerminalTask(task)) {
		return false;
	}

	const dueAt = getTaskTimestamp(task, 'dueAt');

	if (!dueAt) {
		return false;
	}

	const dayOffset = getDaysUntil(dueAt, now);
	return dayOffset >= 0 && dayOffset <= 6;
}

function isCompletedThisMonth(task, now) {
	if (task.status !== 'completed') {
		return false;
	}

	const completedAt = getTaskTimestamp(task, 'updatedAt') ?? getTaskTimestamp(task, 'lastActivityAt');
	return completedAt
		? completedAt.getMonth() === now.getMonth() && completedAt.getFullYear() === now.getFullYear()
		: false;
}

function countTasksUpdatedToday(tasks, now) {
	return tasks.filter((task) => {
		const activityAt = getTaskTimestamp(task, 'lastActivityAt') ?? getTaskTimestamp(task, 'updatedAt');
		return activityAt ? isSameDay(activityAt, now) : false;
	}).length;
}

function buildDueForecast(tasks, now) {
	const buckets = [
		{ key: 'overdue', label: 'Overdue', count: 0 },
		{ key: 'today', label: 'Today', count: 0 },
		{ key: 'soon', label: '2-3 days', count: 0 },
		{ key: 'thisWeek', label: 'This week', count: 0 },
		{ key: 'nextWeek', label: 'Next week', count: 0 },
		{ key: 'later', label: 'Later', count: 0 }
	];

	for (const task of tasks) {
		if (isTerminalTask(task)) {
			continue;
		}

		const dueAt = getTaskTimestamp(task, 'dueAt');

		if (!dueAt) {
			continue;
		}

		const dayOffset = getDaysUntil(dueAt, now);

		if (dayOffset < 0) {
			buckets[0].count += 1;
		} else if (dayOffset === 0) {
			buckets[1].count += 1;
		} else if (dayOffset <= 3) {
			buckets[2].count += 1;
		} else if (dayOffset <= 6) {
			buckets[3].count += 1;
		} else if (dayOffset <= 13) {
			buckets[4].count += 1;
		} else {
			buckets[5].count += 1;
		}
	}

	const maxCount = Math.max(1, ...buckets.map((bucket) => bucket.count));

	return buckets.map((bucket) => ({
		...bucket,
		percentage: Math.max(bucket.count > 0 ? Math.round((bucket.count / maxCount) * 100) : 0, bucket.count > 0 ? 16 : 0)
	}));
}

function buildStatusMix(tasks) {
	const buckets = [
		{ key: 'in_progress', label: 'In progress', count: 0 },
		{ key: 'open', label: 'Open', count: 0 },
		{ key: 'on_hold', label: 'On hold', count: 0 },
		{ key: 'deferred', label: 'Deferred', count: 0 },
		{ key: 'completed', label: 'Completed', count: 0 }
	];

	for (const task of tasks) {
		const bucket = buckets.find((entry) => entry.key === task.status);

		if (bucket) {
			bucket.count += 1;
		}
	}

	const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);

	return {
		total,
		buckets: buckets.filter((bucket) => bucket.count > 0).map((bucket) => ({
			...bucket,
			percentage: total > 0 ? Math.round((bucket.count / total) * 100) : 0
		}))
	};
}

function buildClientWorkload(tasks, clients) {
	const clientNamesById = new Map(clients.map((client) => [client.id, client.companyName]));
	const workload = new Map();

	for (const task of tasks) {
		if (!isActiveTask(task)) {
			continue;
		}

		const clientKey = task.audienceId || 'internal';
		const current = workload.get(clientKey) ?? {
			key: clientKey,
			label: task.audienceId ? clientNamesById.get(task.audienceId) ?? 'Unknown client' : 'Internal',
			count: 0
		};

		current.count += 1;
		workload.set(clientKey, current);
	}

	const entries = [...workload.values()].sort((left, right) => right.count - left.count).slice(0, 4);
	const maxCount = Math.max(1, ...entries.map((entry) => entry.count));

	return entries.map((entry) => ({
		...entry,
		percentage: Math.round((entry.count / maxCount) * 100)
	}));
}

function buildAttentionNeeded(tasks, now) {
	const overdue = tasks.filter((task) => isOverdueTask(task, now)).length;
	const critical = tasks.filter((task) => task.priority === 'critical' && !isTerminalTask(task)).length;
	const stale = tasks.filter((task) => task.tags.some((tag) => tag.key === 'stale')).length;
	const waiting = tasks.filter((task) => task.status === 'on_hold' || task.status === 'deferred').length;
	const highPriorityDueSoon = tasks.filter((task) => {
		if (isTerminalTask(task)) {
			return false;
		}

		const dueAt = getTaskTimestamp(task, 'dueAt');

		if (!dueAt) {
			return false;
		}

		const dayOffset = getDaysUntil(dueAt, now);
		return dayOffset >= 0 && dayOffset <= 7 && (task.priority === 'high' || task.priority === 'critical');
	}).length;

	return [
		{ key: 'overdue', label: 'Overdue tasks', count: overdue, tone: 'rose' },
		{ key: 'critical', label: 'Critical open tasks', count: critical, tone: 'rose' },
		{ key: 'dueSoon', label: 'High priority due this week', count: highPriorityDueSoon, tone: 'amber' },
		{ key: 'waiting', label: 'On hold or deferred', count: waiting, tone: 'sky' },
		{ key: 'stale', label: 'Stale tasks', count: stale, tone: 'emerald' }
	];
}

function buildThroughput(tasks, now) {
	const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const dayOfWeek = today.getDay();
	const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
	const monday = new Date(today);
	monday.setDate(today.getDate() + mondayOffset);

	return days.map((label, index) => {
		const dayStart = new Date(monday);
		dayStart.setDate(monday.getDate() + index);
		const dayEnd = new Date(dayStart);
		dayEnd.setDate(dayStart.getDate() + 1);

		const createdCount = tasks.filter((task) => {
			const createdAt = getTaskTimestamp(task, 'createdAt');
			return createdAt ? createdAt >= dayStart && createdAt < dayEnd : false;
		}).length;

		const completedCount = tasks.filter((task) => {
			if (task.status !== 'completed') {
				return false;
			}

			const completedAt = getTaskTimestamp(task, 'updatedAt') ?? getTaskTimestamp(task, 'lastActivityAt');
			return completedAt ? completedAt >= dayStart && completedAt < dayEnd : false;
		}).length;

		const maxCount = Math.max(createdCount, completedCount, 1);

		return {
			label,
			createdCount,
			completedCount,
			createdPercentage: Math.round((createdCount / maxCount) * 100),
			completedPercentage: Math.round((completedCount / maxCount) * 100)
		};
	});
}

function buildRecentActivity(tasks, clients) {
	const clientNamesById = new Map(clients.map((client) => [client.id, client.companyName]));

	return tasks
		.filter((task) => getTaskTimestamp(task, 'lastActivityAt') ?? getTaskTimestamp(task, 'updatedAt'))
		.sort((left, right) => {
			const leftDate = getTaskTimestamp(left, 'lastActivityAt') ?? getTaskTimestamp(left, 'updatedAt');
			const rightDate = getTaskTimestamp(right, 'lastActivityAt') ?? getTaskTimestamp(right, 'updatedAt');
			return (rightDate?.getTime() ?? 0) - (leftDate?.getTime() ?? 0);
		})
		.slice(0, 5)
		.map((task) => ({
			id: task.id,
			title: task.title,
			status: task.status,
			priority: task.priority,
			activityAt: task.lastActivityAt ?? task.updatedAt,
			audienceLabel: task.audienceId ? clientNamesById.get(task.audienceId) ?? 'Unknown client' : 'Internal',
			progressPercentage: task.progressPercentage
		}));
}

function buildDashboard(normalizedTasks, filteredTasks, clients, now = new Date()) {
	const scopedTasks = filteredTasks;
	const openTasksCount = scopedTasks.filter((task) => isActiveTask(task)).length;
	const overdueCount = scopedTasks.filter((task) => isOverdueTask(task, now)).length;
	const customerScopedCount = scopedTasks.filter((task) => task.audienceId && isActiveTask(task)).length;
	const completedThisMonthCount = scopedTasks.filter((task) => isCompletedThisMonth(task, now)).length;
	const dueThisWeekCount = scopedTasks.filter((task) => isDueThisWeek(task, now)).length;
	const waitingCount = scopedTasks.filter((task) => task.status === 'on_hold' || task.status === 'deferred').length;
	const updatesTodayCount = countTasksUpdatedToday(scopedTasks, now);
	const criticalCount = scopedTasks.filter((task) => task.priority === 'critical' && !isTerminalTask(task)).length;

	return {
		summary: {
			openTasksCount,
			overdueCount,
			customerScopedCount,
			completedThisMonthCount,
			dueThisWeekCount,
			waitingCount,
			updatesTodayCount,
			criticalCount,
			filteredCount: filteredTasks.length,
			totalCount: normalizedTasks.length
		},
		dueForecast: buildDueForecast(scopedTasks, now),
		statusMix: buildStatusMix(scopedTasks),
		clientWorkload: buildClientWorkload(scopedTasks, clients),
		attentionNeeded: buildAttentionNeeded(scopedTasks, now),
		throughput: buildThroughput(scopedTasks, now),
		recentActivity: buildRecentActivity(scopedTasks, clients)
	};
}

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
		priority: task.priority,
		progressPercentage: String(task.progressPercentage ?? 0),
		dueAt: task.dueAt,
		dueTime: task.dueTime,
		hasDueTime: task.hasDueTime,
		notificationOffsetMinutes: task.notificationOffsetMinutes,
		recurrenceRule: task.recurrenceRule,
		assignedUserIds: task.assignedUsers.map((user) => user.id),
		tags: task.tags.map((tag) => tag.name),
		createdByUserId: task.createdByUserId,
		audienceId: task.audienceId,
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
		['priority', String(formData.get('returnPriority') ?? '').trim()],
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

	if (filters.priority && task.priority !== filters.priority) {
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
		priority: String(url.searchParams.get('priority') ?? '').trim(),
		tag: String(url.searchParams.get('tag') ?? '').trim().toLowerCase(),
		assignee: String(url.searchParams.get('assignee') ?? '').trim()
	};
	const editTaskId = String(url.searchParams.get('edit') ?? '').trim();

	try {
		const [tasks, users, clients, editTask] = await Promise.all([
			listInternalTasks(),
			listLocalUsers(),
			listClients(),
			editTaskId ? getTaskById(editTaskId, { includeComments: true }) : Promise.resolve(null)
		]);
		const normalizedTasks = tasks.filter(Boolean);
		const normalizedEditTask = editTask?.audienceId ? null : editTask;
		const availableTags = [...new Map(normalizedTasks.flatMap((task) => task.tags).map((tag) => [tag.key, tag])).values()];
		const availableAssignees = [
			...new Map(normalizedTasks.flatMap((task) => task.assignedUsers).map((user) => [user.id, user])).values()
		];
		const filteredTasks = normalizedTasks.filter((task) => matchesFilters(task, filters));
		const editErrorMessage = editTaskId && !normalizedEditTask ? 'Task not found.' : null;

		return {
			tasks: filteredTasks,
			users,
			clients,
			editTask: normalizedEditTask,
			availableTags,
			availableAssignees,
			dashboard: buildDashboard(normalizedTasks, filteredTasks, clients),
			filters,
			notice: getNotice(url.searchParams),
			errorMessage: editErrorMessage
		};
	} catch (caughtError) {
		return {
			tasks: [],
			users: [],
			clients: [],
			editTask: null,
			availableTags: [],
			availableAssignees: [],
			dashboard: buildDashboard([], [], []),
			filters,
			notice: null,
			errorMessage: getTasksStoreErrorMessage(caughtError)
		};
	}
}

export const actions = {
	create: async ({ locals, request, url }) => {
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

		throw redirect(303, buildReturnTasksHref(url, formData, { created: 1 }));
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
				audienceId: input.audienceId,
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
	complete: async ({ request, url }) => {
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

		throw redirect(303, buildReturnTasksHref(url, formData, { completed: 1 }));
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