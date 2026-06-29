<script>
	import TaskForm from '$lib/components/TaskForm.svelte';
	import { page } from '$app/state';
	import { fade, fly } from 'svelte/transition';

	let { data, form } = $props();

	function formatDate(value, hasDueTime = true) {
		if (!value) {
			return 'Not available';
		}

		return new Intl.DateTimeFormat(
			'en-US',
			hasDueTime
				? { dateStyle: 'medium', timeStyle: 'short' }
				: { dateStyle: 'medium' }
		).format(new Date(value));
	}

	function createDrawerOpen() {
		return page.url.searchParams.get('new') === '1' || form?.intent === 'create';
	}

	function editTaskId() {
		return String(form?.taskId ?? page.url.searchParams.get('edit') ?? '').trim();
	}

	function editDrawerOpen() {
		return Boolean(editTaskId()) || form?.intent === 'edit' || form?.intent === 'addComment';
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
		if (form?.intent === 'edit' && form?.values) {
			return {
				...(data.editTask ?? {}),
				...form.values,
				id: form.taskId ?? form.values.id ?? data.editTask?.id ?? ''
			};
		}

		return data.editTask;
	}

	function drawerAction() {
		return editDrawerOpen() ? '?/edit' : '?/create';
	}

	function statusBadgeClass(status) {
		if (status === 'completed') return 'bg-emerald-50 text-emerald-700';
		if (status === 'in_progress') return 'bg-sky-50 text-sky-700';
		if (status === 'canceled') return 'bg-rose-50 text-rose-700';
		if (status === 'deferred') return 'bg-indigo-50 text-indigo-700';
		if (status === 'on_hold') return 'bg-slate-100 text-slate-700';
		return 'bg-amber-50 text-amber-700';
	}

	function priorityBadgeClass(priority) {
		if (priority === 'critical') return 'bg-rose-50 text-rose-700';
		if (priority === 'high') return 'bg-amber-50 text-amber-700';
		if (priority === 'low') return 'bg-slate-100 text-slate-600';
		return 'bg-sky-50 text-sky-700';
	}

	function priorityLabel(priority) {
		if (priority === 'critical') return 'Critical';
		if (priority === 'high') return 'High';
		if (priority === 'low') return 'Low';
		return 'Normal';
	}

	function statusLabel(status) {
		if (status === 'in_progress') return 'In progress';
		if (status === 'on_hold') return 'On hold';
		if (status === 'deferred') return 'Deferred';
		return String(status ?? 'open').replace('_', ' ');
	}
</script>

<section class="space-y-5">
	<div class="flex justify-end">
		<a href={createDrawerHref(true)} class="inline-flex h-10 items-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800">
			New client task
		</a>
	</div>

	{#if data.notice}
		<div class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{data.notice}</div>
	{/if}

	{#if data.errorMessage}
		<div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{data.errorMessage}</div>
	{/if}

	<div class="overflow-hidden rounded-[1.9rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/92">
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
				<thead class="bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:bg-white/5 dark:text-slate-500">
					<tr>
						<th class="px-5 py-4">Task</th>
						<th class="px-5 py-4">Due</th>
						<th class="px-5 py-4">Progress</th>
						<th class="px-5 py-4">Priority</th>
						<th class="px-5 py-4">Status</th>
						<th class="px-5 py-4 text-right">Action</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100 dark:divide-white/5">
					{#if data.tasks.length === 0}
						<tr><td colspan="6" class="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">No client tasks have been created yet.</td></tr>
					{:else}
						{#each data.tasks as task}
							<tr class="bg-white align-top dark:bg-slate-900/92">
								<td class="px-5 py-4">
									<p class="font-semibold text-slate-950 dark:text-white">{task.title}</p>
									<p class="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">{task.description || 'No description'}</p>
								</td>
								<td class="px-5 py-4 text-slate-600 dark:text-slate-400">{formatDate(task.dueAt, task.hasDueTime)}</td>
								<td class="px-5 py-4">
									<div class="flex min-w-40 items-center gap-3">
										<div class="h-2 flex-1 overflow-hidden rounded-full bg-slate-200"><div class="h-full rounded-full bg-sky-400" style={`width: ${task.progressPercentage}%`}></div></div>
										<span class="text-xs font-semibold text-slate-600 dark:text-slate-400">{task.progressPercentage}%</span>
									</div>
								</td>
								<td class="px-5 py-4"><span class={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityBadgeClass(task.priority)} dark:bg-opacity-20 dark:text-white`}>{priorityLabel(task.priority)}</span></td>
								<td class="px-5 py-4"><span class={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(task.status)} dark:bg-opacity-20 dark:text-white`}>{statusLabel(task.status)}</span></td>
								<td class="px-5 py-4 text-right"><a href={editDrawerHref(task.id)} class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white">Edit</a></td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>

	{#if createDrawerOpen() || editDrawerOpen()}
		<div class="fixed inset-0 z-50">
			<a href={closeDrawerHref()} class="absolute inset-0 bg-slate-950/35 backdrop-blur-[3px]" aria-label="Close task drawer" in:fade={{ duration: 180 }} out:fade={{ duration: 140 }}></a>
			<div class="absolute inset-y-0 right-0 w-full bg-white shadow-[-24px_0_80px_-48px_rgba(15,23,42,0.55)] sm:max-w-2xl lg:w-[40vw] lg:max-w-none lg:min-w-[32rem]" in:fly={{ x: 96, duration: 220, opacity: 1 }} out:fly={{ x: 96, duration: 180, opacity: 1 }}>
				<section class="flex h-full flex-col bg-white">
					<div class="border-b border-slate-200 px-5 py-5 sm:px-6">
						<div class="flex items-start justify-between gap-4">
							<div>
								<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Client Tasks</p>
								<h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{editDrawerOpen() ? 'Edit client task' : 'Create client task'}</h2>
							</div>
							<a href={closeDrawerHref()} class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Close</a>
						</div>
					</div>

					<TaskForm
						{form}
						task={editTask()}
						users={data.users}
						mode={editDrawerOpen() ? 'edit' : 'create'}
						surface="drawer"
						formAction={drawerAction()}
						commentAction="?/addComment"
						initialSection={currentDrawerSection()}
						backHref={closeDrawerHref()}
						backLabel="Close"
						lockedAudienceId={data.client.id}
						lockedAudienceLabel={data.client.companyName}
					/>
				</section>
			</div>
		</div>
	{/if}
</section>
