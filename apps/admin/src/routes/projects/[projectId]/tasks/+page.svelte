<script>
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { fade, fly } from 'svelte/transition';
	import ProjectTaskForm from '$lib/components/ProjectTaskForm.svelte';

	let { data, form } = $props();
	let progressOverrides = $state({});

	function formatDate(value) {
		if (!value) return 'Not set';
		const date = value instanceof Date ? value : new Date(String(value).includes('T') ? value : `${value}T00:00:00`);
		return Number.isNaN(date.getTime()) ? 'Not set' : new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
	}

	function drawerOpen() {
		return page.url.searchParams.get('new') === '1' || Boolean(editTaskId()) || form?.intent === 'create' || form?.intent === 'edit' || form?.intent === 'addComment';
	}

	function editTaskId() {
		return String(form?.taskId ?? page.url.searchParams.get('edit') ?? '').trim();
	}

	function drawerMode() {
		return editTaskId() || form?.intent === 'edit' || form?.intent === 'addComment' ? 'edit' : 'create';
	}

	function drawerAction() {
		return drawerMode() === 'edit' ? '?/edit' : '?/create';
	}

	function createHref() {
		const url = new URL(page.url);
		url.searchParams.set('new', '1');
		url.searchParams.delete('edit');
		url.searchParams.delete('section');
		return `${url.pathname}?${url.searchParams.toString()}`;
	}

	function editHref(taskId) {
		const url = new URL(page.url);
		url.searchParams.delete('new');
		url.searchParams.set('edit', taskId);
		url.searchParams.delete('section');
		return `${url.pathname}?${url.searchParams.toString()}`;
	}

	function closeHref() {
		const url = new URL(page.url);
		url.searchParams.delete('new');
		url.searchParams.delete('edit');
		url.searchParams.delete('section');
		const search = url.searchParams.toString();
		return `${url.pathname}${search ? `?${search}` : ''}`;
	}

	function currentDrawerSection() {
		if (form?.intent === 'addComment') return 'comments';
		return page.url.searchParams.get('section') === 'comments' ? 'comments' : 'general';
	}

	function editTask() {
		if (form?.intent === 'edit' && form.values) return { ...(data.editTask ?? {}), ...form.values, id: form.taskId ?? form.values.id ?? data.editTask?.id };
		return data.editTask;
	}

	function bucketName(bucketId) {
		return data.project.buckets.find((bucket) => bucket.id === bucketId)?.name ?? 'No list';
	}

	function phaseName(phaseId) {
		return data.project.phases.find((phase) => phase.id === phaseId)?.name ?? 'No phase';
	}

	function statusLabel(status) {
		if (status === 'in_progress') return 'In progress';
		if (status === 'on_hold') return 'On hold';
		return String(status ?? 'open').replace('_', ' ');
	}

	function statusClass(status) {
		if (status === 'completed') return 'bg-emerald-50 text-emerald-700';
		if (status === 'canceled') return 'bg-rose-50 text-rose-700';
		if (status === 'in_progress') return 'bg-sky-50 text-sky-700';
		if (status === 'on_hold' || status === 'deferred') return 'bg-amber-50 text-amber-700';
		return 'bg-slate-100 text-slate-700';
	}

	function taskView(task) {
		return { ...task, ...(progressOverrides[task.id] ?? {}) };
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

	function submitProgressUpdate(event) {
		event.currentTarget.form?.requestSubmit();
	}
</script>

<section class="space-y-5">
	<header class="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
		<div><p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Project Tasks</p><h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Task list</h1><p class="mt-2 max-w-3xl text-sm leading-7 text-slate-600">Filter, edit, comment, and update progress on project-local tasks.</p></div>
		<a href={createHref()} class="inline-flex h-10 items-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800">Add task</a>
	</header>

	<form method="GET" class="grid gap-4 rounded-[1.7rem] border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2 xl:grid-cols-[1fr_14rem_14rem_auto] xl:items-end">
		<div><label class="block text-sm font-medium text-slate-700" for="q">Search</label><input id="q" name="q" value={data.filters.q} class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-400" placeholder="Search project tasks" /></div>
		<div><label class="block text-sm font-medium text-slate-700" for="bucket">List</label><select id="bucket" name="bucket" class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-400"><option value="">All lists</option>{#each data.project.buckets as bucket}<option value={bucket.id} selected={data.filters.bucket === bucket.id}>{bucket.name}</option>{/each}</select></div>
		<div><label class="block text-sm font-medium text-slate-700" for="status">Status</label><select id="status" name="status" class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-400"><option value="">All statuses</option><option value="open" selected={data.filters.status === 'open'}>Open</option><option value="in_progress" selected={data.filters.status === 'in_progress'}>In progress</option><option value="on_hold" selected={data.filters.status === 'on_hold'}>On hold</option><option value="deferred" selected={data.filters.status === 'deferred'}>Deferred</option><option value="completed" selected={data.filters.status === 'completed'}>Completed</option><option value="canceled" selected={data.filters.status === 'canceled'}>Canceled</option></select></div>
		<div class="flex gap-3"><button class="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white">Filter</button><a href={`/projects/${data.project.id}/tasks`} class="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Reset</a></div>
	</form>

	{#if data.notice}<div class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{data.notice}</div>{/if}
	{#if data.errorMessage || form?.message}<div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{data.errorMessage || form?.message}</div>{/if}

	<div class="overflow-hidden rounded-[1.9rem] border border-slate-200 bg-white">
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-slate-200 text-sm">
				<thead class="bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400"><tr><th class="px-5 py-4">Task</th><th class="px-5 py-4">Phase</th><th class="px-5 py-4">List</th><th class="px-5 py-4">Due</th><th class="px-5 py-4">Progress</th><th class="px-5 py-4">Status</th><th class="px-5 py-4 text-right">Action</th></tr></thead>
				<tbody class="divide-y divide-slate-100">
					{#if data.tasks.length === 0}<tr><td colspan="7" class="px-5 py-10 text-center text-sm text-slate-500">No project tasks match the current filters.</td></tr>{/if}
					{#each data.tasks as task}
						{@const currentTask = taskView(task)}
						<tr class="align-top"><td class="px-5 py-4"><p class="font-semibold text-slate-950">{task.title}</p><p class="mt-1 max-w-md text-sm text-slate-500">{task.description || 'No description'}</p></td><td class="px-5 py-4 text-slate-600">{phaseName(task.phaseId)}</td><td class="px-5 py-4 text-slate-600">{bucketName(task.bucketId)}</td><td class="px-5 py-4 text-slate-600">{formatDate(task.dueAt)}</td><td class="px-5 py-4"><form method="POST" action="?/updateProgress" use:enhance={enhanceProgressUpdate} class="flex min-w-36 items-center gap-3"><input type="hidden" name="taskId" value={task.id} /><input name="progressPercentage" type="range" min="0" max="100" step="1" value={currentTask.progressPercentage} disabled={currentTask.status === 'completed'} onchange={submitProgressUpdate} class="w-full accent-slate-950 disabled:cursor-not-allowed disabled:opacity-60" /><span class="min-w-11 text-right text-xs font-semibold">{currentTask.progressPercentage}%</span></form></td><td class="px-5 py-4"><span class={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(currentTask.status)}`}>{statusLabel(currentTask.status)}</span></td><td class="px-5 py-4 text-right"><a href={editHref(task.id)} class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950">Edit</a></td></tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	{#if drawerOpen()}
		<div class="fixed inset-0 z-50">
			<a href={closeHref()} class="absolute inset-0 bg-slate-950/35 backdrop-blur-[3px]" aria-label="Close project task drawer" in:fade={{ duration: 180 }} out:fade={{ duration: 140 }}></a>
			<div class="absolute inset-y-0 right-0 w-full bg-white shadow-[-24px_0_80px_-48px_rgba(15,23,42,0.55)] sm:max-w-2xl lg:w-[40vw] lg:max-w-none lg:min-w-[32rem]" in:fly={{ x: 96, duration: 220, opacity: 1 }} out:fly={{ x: 96, duration: 180, opacity: 1 }}>
				<ProjectTaskForm {form} project={data.project} task={editTask()} users={data.users} mode={drawerMode()} formAction={drawerAction()} commentAction="?/addComment" initialSection={currentDrawerSection()} backHref={closeHref()} />
			</div>
		</div>
	{/if}
</section>
