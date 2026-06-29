<script>
	import TaskForm from '$lib/components/TaskForm.svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { fade, fly } from 'svelte/transition';

	let { data, form } = $props();
	const bulkFormValues = $derived(form?.intent === 'bulkUpdate' ? form.values ?? {} : {});
	const editFormValues = $derived(form?.intent === 'edit' ? form.values ?? {} : {});
	let openTaskActionsId = $state(null);
	let openTaskActionsTop = $state(0);
	let openTaskActionsLeft = $state(0);
	let bulkUpdateOpen = $state(false);
	let selectedBulkTaskIds = $state([]);
	let progressOverrides = $state({});

	$effect(() => {
		if (form?.intent === 'bulkUpdate') {
			bulkUpdateOpen = true;
			selectedBulkTaskIds = Array.isArray(form?.values?.taskIds) ? [...form.values.taskIds] : [];
		}
	});

	function formatDate(value, hasDueTime = true) {
		if (!value) {
			return 'Not available';
		}

		return new Intl.DateTimeFormat(
			'en-US',
			hasDueTime
				? {
					dateStyle: 'medium',
					timeStyle: 'short'
				}
				: {
					dateStyle: 'medium'
				}
		).format(new Date(value));
	}

	function createDrawerOpen() {
		return page.url.searchParams.get('new') === '1' || form?.intent === 'create';
	}

	function createDrawerHref(open) {
		const url = new URL(page.url);

		if (open) {
			url.searchParams.set('new', '1');
			url.searchParams.delete('edit');
			url.searchParams.delete('section');
		} else {
			url.searchParams.delete('new');
		}

		const search = url.searchParams.toString();
		return `${url.pathname}${search ? `?${search}` : ''}`;
	}

	function editTaskId() {
		return String(form?.taskId ?? page.url.searchParams.get('edit') ?? '').trim();
	}

	function editDrawerOpen() {
		return Boolean(editTaskId()) || form?.intent === 'edit';
	}

	function editDrawerHref(taskId) {
		const url = new URL(page.url);
		url.searchParams.delete('new');
		url.searchParams.set('edit', taskId);
		url.searchParams.delete('section');
		const search = url.searchParams.toString();
		return `${url.pathname}${search ? `?${search}` : ''}`;
	}

	function closeDrawerHref() {
		const url = new URL(page.url);
		url.searchParams.delete('new');
		url.searchParams.delete('edit');
		url.searchParams.delete('section');
		const search = url.searchParams.toString();
		return `${url.pathname}${search ? `?${search}` : ''}`;
	}

	function currentDrawerSection() {
		if (form?.intent === 'addComment') {
			return 'comments';
		}

		return String(page.url.searchParams.get('section') ?? 'general').trim() === 'comments' ? 'comments' : 'general';
	}

	function editTask() {
		if (form?.intent === 'edit' && Object.keys(editFormValues).length > 0) {
			return {
				...(data.editTask ?? {}),
				...editFormValues,
				id: form?.taskId ?? editFormValues.id ?? data.editTask?.id ?? ''
			};
		}

		return data.editTask;
	}

	function drawerTitle() {
		return editDrawerOpen() ? 'Close edit task drawer' : 'Close new task drawer';
	}

	function drawerAction() {
		return editDrawerOpen() ? '?/edit' : '?/create';
	}

	function statusBadgeClass(status) {
		if (status === 'completed') {
			return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-200';
		}

		if (status === 'in_progress') {
			return 'bg-sky-50 text-sky-700 dark:bg-sky-500/12 dark:text-sky-200';
		}

		if (status === 'canceled') {
			return 'bg-rose-50 text-rose-700 dark:bg-rose-500/12 dark:text-rose-200';
		}

		if (status === 'deferred') {
			return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/12 dark:text-indigo-200';
		}

		if (status === 'on_hold') {
			return 'bg-slate-100 text-slate-700 dark:bg-white/8 dark:text-slate-300';
		}

		return 'bg-amber-50 text-amber-700 dark:bg-amber-500/12 dark:text-amber-200';
	}

	function bulkStatusValue() {
		return String(bulkFormValues.status ?? '');
	}

	function bulkProgressValue() {
		return String(bulkFormValues.progressPercentage ?? '');
	}

	function canOpenBulkUpdate() {
		return selectedBulkTaskIds.length > 1;
	}

	function statusLabel(status) {
		if (status === 'on_hold') {
			return 'On hold';
		}

		if (status === 'deferred') {
			return 'Deferred';
		}

		if (status === 'in_progress') {
			return 'In progress';
		}

		if (status === 'canceled') {
			return 'Canceled';
		}

		if (status === 'completed') {
			return 'Completed';
		}

		return 'Open';
	}

	function priorityBadgeClass(priority) {
		if (priority === 'critical') {
			return 'bg-rose-50 text-rose-700 dark:bg-rose-500/12 dark:text-rose-200';
		}

		if (priority === 'high') {
			return 'bg-amber-50 text-amber-700 dark:bg-amber-500/12 dark:text-amber-200';
		}

		if (priority === 'low') {
			return 'bg-slate-100 text-slate-600 dark:bg-white/8 dark:text-slate-300';
		}

		return 'bg-sky-50 text-sky-700 dark:bg-sky-500/12 dark:text-sky-200';
	}

	function priorityLabel(priority) {
		if (priority === 'critical') {
			return 'Critical';
		}

		if (priority === 'high') {
			return 'High';
		}

		if (priority === 'low') {
			return 'Low';
		}

		return 'Normal';
	}

	function submitProgressUpdate(event) {
		event.currentTarget.form?.requestSubmit();
	}

	function getTaskView(task) {
		return {
			...task,
			...(progressOverrides[task.id] ?? {})
		};
	}

	function enhanceProgressUpdate() {
		return async ({ result, update }) => {
			if (result.type === 'success' && result.data?.intent === 'updateProgress' && result.data?.task) {
				progressOverrides = {
					...progressOverrides,
					[result.data.taskId]: {
						progressPercentage: result.data.task.progressPercentage,
						status: result.data.task.status
					}
				};
				return;
			}

			await update({ reset: false, invalidateAll: false });
		};
	}

	function toggleTaskActions(event, taskId) {
		if (openTaskActionsId === taskId) {
			closeTaskActions();
			return;
		}

		const trigger = event.currentTarget;
		const rect = trigger.getBoundingClientRect();
		const menuWidth = 176;
		const viewportPadding = 12;

		openTaskActionsId = taskId;
		openTaskActionsTop = rect.bottom + 10;
		openTaskActionsLeft = Math.min(
			window.innerWidth - menuWidth - viewportPadding,
			Math.max(viewportPadding, rect.right - menuWidth)
		);
	}

	function closeTaskActions() {
		openTaskActionsId = null;
		openTaskActionsTop = 0;
		openTaskActionsLeft = 0;
	}

	function toggleBulkUpdate() {
		if (!canOpenBulkUpdate()) {
			return;
		}

		bulkUpdateOpen = !bulkUpdateOpen;
	}

	function closeBulkUpdate() {
		bulkUpdateOpen = false;
	}
</script>

<section class="space-y-5">
	<header class="flex flex-col gap-4 border-b border-slate-200/80 pb-5 dark:border-white/10 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Tasks</p>
			<h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">Task view</h1>
			<p class="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-400">
				Use the current table and filters for day-to-day task operations. Return to Dashboard for workload and risk summaries.
			</p>
		</div>

		<div class="flex items-center gap-3">
			<div class="relative">
				<button
					type="button"
					class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/10 dark:bg-slate-900/92 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white"
					onclick={toggleBulkUpdate}
					disabled={!canOpenBulkUpdate()}
					aria-haspopup="dialog"
					aria-expanded={bulkUpdateOpen}
					aria-label="Bulk update tasks"
					title={canOpenBulkUpdate() ? 'Bulk update selected tasks' : 'Select at least two tasks to bulk update'}
				>
					<svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
						<path d="M4 5.75h12M4 10h12M4 14.25h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
						<path d="M14.5 13.25 16 14.75l2-2.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</button>

				{#if bulkUpdateOpen}
					<div class="absolute right-0 top-[calc(100%+0.75rem)] z-20 w-[22rem] rounded-[1.7rem] border border-slate-200 bg-white p-4 shadow-[0_32px_80px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-950/5 dark:border-white/10 dark:bg-slate-900 dark:ring-white/10 dark:shadow-[0_32px_80px_-32px_rgba(2,6,23,0.85)] sm:p-5">
						<form id="tasks-bulk-update-form" method="POST" action="?/bulkUpdate" class="space-y-4">
							<input type="hidden" name="returnQ" value={data.filters.q ?? ''} />
							<input type="hidden" name="returnStatus" value={data.filters.status ?? ''} />
							<input type="hidden" name="returnPriority" value={data.filters.priority ?? ''} />
							<input type="hidden" name="returnTag" value={data.filters.tag ?? ''} />
							<input type="hidden" name="returnAssignee" value={data.filters.assignee ?? ''} />

							<div>
								<p class="text-sm font-semibold text-slate-950 dark:text-white">Bulk update tasks</p>
								<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Apply changes to {selectedBulkTaskIds.length} selected tasks.</p>
							</div>

							<div>
								<label class="block text-sm font-medium text-slate-700 dark:text-slate-300" for="bulk-status">Status</label>
								<select id="bulk-status" name="status" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-teal-400 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-teal-500/40 dark:focus:bg-white/10">
									<option value="" selected={bulkStatusValue() === ''}>Keep current status</option>
									<option value="open" selected={bulkStatusValue() === 'open'}>Open</option>
									<option value="in_progress" selected={bulkStatusValue() === 'in_progress'}>In progress</option>
									<option value="on_hold" selected={bulkStatusValue() === 'on_hold'}>On hold</option>
									<option value="deferred" selected={bulkStatusValue() === 'deferred'}>Deferred</option>
									<option value="canceled" selected={bulkStatusValue() === 'canceled'}>Canceled</option>
									<option value="completed" selected={bulkStatusValue() === 'completed'}>Completed</option>
								</select>
							</div>

							<div>
								<label class="block text-sm font-medium text-slate-700 dark:text-slate-300" for="bulk-progressPercentage">Progress</label>
								<input id="bulk-progressPercentage" name="progressPercentage" type="number" min="0" max="100" step="1" value={bulkProgressValue()} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-teal-400 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-teal-500/40 dark:focus:bg-white/10" placeholder="Keep current" />
							</div>

							<div class="flex justify-end gap-3">
								<button type="button" class="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white" onclick={closeBulkUpdate}>Cancel</button>
								<button class="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">Update selected</button>
							</div>
						</form>
					</div>
				{/if}
			</div>
		</div>
	</header>

	<form method="GET" class="grid gap-4 rounded-[1.7rem] border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(0,0.7fr))_auto] sm:p-5">
		<div>
			<label class="block text-sm font-medium text-slate-700 dark:text-slate-300" for="q">Search</label>
			<input id="q" name="q" value={data.filters.q ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-teal-400 dark:border-white/10 dark:bg-slate-900/92 dark:text-slate-100 dark:focus:border-teal-500/40" placeholder="Search titles, assignees, tags" />
		</div>

		<div>
			<label class="block text-sm font-medium text-slate-700 dark:text-slate-300" for="status">Status</label>
			<select id="status" name="status" class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-teal-400 dark:border-white/10 dark:bg-slate-900/92 dark:text-slate-100 dark:focus:border-teal-500/40">
				<option value="">All statuses</option>
				<option value="open" selected={data.filters.status === 'open'}>Open</option>
				<option value="in_progress" selected={data.filters.status === 'in_progress'}>In progress</option>
				<option value="on_hold" selected={data.filters.status === 'on_hold'}>On hold</option>
				<option value="deferred" selected={data.filters.status === 'deferred'}>Deferred</option>
				<option value="canceled" selected={data.filters.status === 'canceled'}>Canceled</option>
				<option value="completed" selected={data.filters.status === 'completed'}>Completed</option>
			</select>
		</div>

		<div>
			<label class="block text-sm font-medium text-slate-700 dark:text-slate-300" for="priority">Priority</label>
			<select id="priority" name="priority" class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-teal-400 dark:border-white/10 dark:bg-slate-900/92 dark:text-slate-100 dark:focus:border-teal-500/40">
				<option value="">All priorities</option>
				<option value="critical" selected={data.filters.priority === 'critical'}>Critical</option>
				<option value="high" selected={data.filters.priority === 'high'}>High</option>
				<option value="normal" selected={data.filters.priority === 'normal'}>Normal</option>
				<option value="low" selected={data.filters.priority === 'low'}>Low</option>
			</select>
		</div>

		<div>
			<label class="block text-sm font-medium text-slate-700 dark:text-slate-300" for="tag">Tag</label>
			<select id="tag" name="tag" class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-teal-400 dark:border-white/10 dark:bg-slate-900/92 dark:text-slate-100 dark:focus:border-teal-500/40">
				<option value="">All tags</option>
				{#each data.availableTags as tag}
					<option value={tag.key} selected={data.filters.tag === tag.key}>{tag.name}</option>
				{/each}
			</select>
		</div>

		<div>
			<label class="block text-sm font-medium text-slate-700 dark:text-slate-300" for="assignee">Assignee</label>
			<select id="assignee" name="assignee" class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-teal-400 dark:border-white/10 dark:bg-slate-900/92 dark:text-slate-100 dark:focus:border-teal-500/40">
				<option value="">All assignees</option>
				{#each data.availableAssignees as assignee}
					<option value={assignee.id} selected={data.filters.assignee === assignee.id}>{assignee.name}</option>
				{/each}
			</select>
		</div>

		<div class="flex items-end gap-3">
			<button class="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">Filter</button>
			<a href="/tasks/view" class="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white">Reset</a>
		</div>
	</form>

	{#if bulkUpdateOpen}
		<button type="button" class="fixed inset-0 z-10" onclick={closeBulkUpdate} aria-label="Close bulk update panel"></button>
	{/if}

	{#if openTaskActionsId}
		<button type="button" class="fixed inset-0 z-10" onclick={closeTaskActions} aria-label="Close task actions menu"></button>

		<div class="fixed z-20 w-44 rounded-[1.3rem] border border-slate-200 bg-white p-2 text-left shadow-[0_32px_80px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-950/5 dark:border-white/10 dark:bg-slate-900 dark:ring-white/10 dark:shadow-[0_32px_80px_-32px_rgba(2,6,23,0.85)]" style={`top: ${openTaskActionsTop}px; left: ${openTaskActionsLeft}px;`}>
			<a
				href={editDrawerHref(openTaskActionsId)}
				class="flex items-center gap-3 rounded-[1rem] px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-white"
				onclick={closeTaskActions}
			>
				<svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
					<path d="M4.75 13.5V15.25H6.5l7.22-7.22-1.75-1.75L4.75 13.5Zm10.44-6.28a1.24 1.24 0 0 0 0-1.75l-.66-.66a1.24 1.24 0 0 0-1.75 0l-.74.74 1.75 1.75.74-.08Z" fill="currentColor" />
				</svg>
				<span>Edit task</span>
			</a>

			{#if data.tasks.find((task) => task.id === openTaskActionsId)?.status !== 'completed'}
				<form method="POST" action="?/complete">
					<input type="hidden" name="taskId" value={openTaskActionsId} />
					<input type="hidden" name="returnQ" value={data.filters.q ?? ''} />
					<input type="hidden" name="returnStatus" value={data.filters.status ?? ''} />
					<input type="hidden" name="returnPriority" value={data.filters.priority ?? ''} />
					<input type="hidden" name="returnTag" value={data.filters.tag ?? ''} />
					<input type="hidden" name="returnAssignee" value={data.filters.assignee ?? ''} />
					<button onclick={closeTaskActions} class="flex w-full items-center gap-3 rounded-[1rem] px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-white">
						<svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
							<path d="M4.75 10.5 8 13.75l7.25-7.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
						<span>Complete task</span>
					</button>
				</form>
			{/if}
		</div>
	{/if}

	<div class="overflow-hidden rounded-[1.9rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/92">
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
				<thead class="bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:bg-white/5 dark:text-slate-500">
					<tr>
						<th class="px-5 py-4">Select</th>
						<th class="px-5 py-4">Task</th>
						<th class="px-5 py-4">Due</th>
						<th class="px-5 py-4">Priority</th>
						<th class="px-5 py-4">Progress</th>
						<th class="px-5 py-4">Repeat</th>
						<th class="px-5 py-4">Assignees</th>
						<th class="px-5 py-4">Tags</th>
						<th class="px-5 py-4">Status</th>
						<th class="px-5 py-4 text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100 dark:divide-white/5">
					{#if data.tasks.length === 0}
						<tr>
							<td colspan="10" class="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
								No tasks match the current filters.
							</td>
						</tr>
					{:else}
						{#each data.tasks as task}
							{@const currentTask = getTaskView(task)}
							<tr class="bg-white dark:bg-slate-900/92">
								<td class="px-5 py-4 align-top">
									<input
										type="checkbox"
										bind:group={selectedBulkTaskIds}
										name="taskIds"
										value={task.id}
										form="tasks-bulk-update-form"
										class="mt-1 h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-300 dark:border-white/15 dark:bg-slate-900"
									/>
								</td>
								<td class="px-5 py-4 align-top">
										<p class="font-semibold text-slate-950 dark:text-white">{task.title}</p>
										<p class="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">{task.description || 'No description'}</p>
								</td>
									<td class="px-5 py-4 align-top text-slate-600 dark:text-slate-400">{formatDate(currentTask.dueAt, currentTask.hasDueTime)}</td>
								<td class="px-5 py-4 align-top">
									<span class={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityBadgeClass(currentTask.priority)}`}>
										{priorityLabel(currentTask.priority)}
									</span>
								</td>
								<td class="px-5 py-4 align-top text-slate-600 dark:text-slate-400">
									<form method="POST" action="?/updateProgress" use:enhance={enhanceProgressUpdate} class="flex min-w-36 items-center gap-3">
										<input type="hidden" name="taskId" value={task.id} />
										<input type="hidden" name="returnQ" value={data.filters.q ?? ''} />
										<input type="hidden" name="returnStatus" value={data.filters.status ?? ''} />
										<input type="hidden" name="returnPriority" value={data.filters.priority ?? ''} />
										<input type="hidden" name="returnTag" value={data.filters.tag ?? ''} />
										<input type="hidden" name="returnAssignee" value={data.filters.assignee ?? ''} />
										<input
											name="progressPercentage"
											type="range"
											min="0"
											max="100"
											step="1"
											value={currentTask.progressPercentage}
											disabled={currentTask.status === 'completed'}
											onchange={submitProgressUpdate}
											class="w-full accent-slate-950 disabled:cursor-not-allowed disabled:opacity-60 dark:accent-slate-100"
										/>
										<span class="min-w-11 text-right text-xs font-semibold">{currentTask.progressPercentage}%</span>
									</form>
								</td>
								<td class="px-5 py-4 align-top text-slate-600 dark:text-slate-400">{currentTask.recurrenceRule}</td>
								<td class="px-5 py-4 align-top text-slate-600 dark:text-slate-400">
									{#if currentTask.assignedUsers.length === 0}
										No assignees
									{:else}
										{currentTask.assignedUsers.map((user) => user.name).join(', ')}
									{/if}
								</td>
								<td class="px-5 py-4 align-top text-slate-600 dark:text-slate-400">
									{#if currentTask.tags.length === 0}
										No tags
									{:else}
										<div class="flex flex-wrap gap-2">
											{#each currentTask.tags as tag}
												<span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-white/8 dark:text-slate-300">{tag.name}</span>
											{/each}
										</div>
									{/if}
								</td>
								<td class="px-5 py-4 align-top">
									<span class={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(currentTask.status)}`}>
										{statusLabel(currentTask.status)}
									</span>
								</td>
								<td class="px-5 py-4 text-right align-top">
									<div class="relative flex justify-end">
										<button
											type="button"
											class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white"
											onclick={(event) => toggleTaskActions(event, task.id)}
											aria-haspopup="menu"
											aria-expanded={openTaskActionsId === task.id}
											aria-label="Task actions"
											title="Task actions"
										>
											<svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
												<path d="M10 4.25a1.25 1.25 0 1 0 0 .001V4.25Zm0 4.5a1.25 1.25 0 1 0 0 .001V8.75Zm0 4.5a1.25 1.25 0 1 0 0 .001v-.001Z" fill="currentColor" />
											</svg>
										</button>
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>

	{#if createDrawerOpen() || editDrawerOpen()}
		<div class="fixed inset-0 z-50">
			<a
				href={closeDrawerHref()}
				class="absolute inset-0 bg-slate-950/35 backdrop-blur-[3px]"
				aria-label={drawerTitle()}
				in:fade={{ duration: 180 }}
				out:fade={{ duration: 140 }}
			></a>

			<div
				class="absolute inset-y-0 right-0 w-full bg-white shadow-[-24px_0_80px_-48px_rgba(15,23,42,0.55)] dark:bg-slate-950 dark:shadow-[-24px_0_80px_-48px_rgba(2,6,23,0.85)] sm:max-w-2xl lg:w-[40vw] lg:max-w-none lg:min-w-[32rem]"
				in:fly={{ x: 96, duration: 220, opacity: 1 }}
				out:fly={{ x: 96, duration: 180, opacity: 1 }}
			>
				<TaskForm
					{form}
					task={editTask()}
					users={data.users}
					clients={data.clients}
					mode={editDrawerOpen() ? 'edit' : 'create'}
					surface="drawer"
					formAction={drawerAction()}
					commentAction="?/addComment"
					initialSection={currentDrawerSection()}
					hiddenFields={[
						{ name: 'returnQ', value: data.filters.q ?? '' },
						{ name: 'returnStatus', value: data.filters.status ?? '' },
						{ name: 'returnPriority', value: data.filters.priority ?? '' },
						{ name: 'returnTag', value: data.filters.tag ?? '' },
						{ name: 'returnAssignee', value: data.filters.assignee ?? '' },
						{ name: 'returnEdit', value: editTask()?.id ?? '' },
						{ name: 'returnSection', value: currentDrawerSection() }
					]}
					backHref={closeDrawerHref()}
					backLabel="Close"
				/>
			</div>
		</div>
	{/if}
</section>