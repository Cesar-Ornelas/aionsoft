<script>
	import { fade, fly } from 'svelte/transition';

	let { data, form } = $props();
	let createDrawerOpen = $state(false);

	$effect(() => {
		if (form?.intent === 'create') {
			createDrawerOpen = true;
		}
	});

	function values() {
		return form?.intent === 'create' ? form.values ?? {} : {};
	}

	function errors() {
		return form?.errors ?? {};
	}

	function formatDate(value) {
		if (!value) {
			return 'Not set';
		}

		const date = value instanceof Date ? value : new Date(String(value).includes('T') ? value : `${value}T00:00:00`);
		return Number.isNaN(date.getTime()) ? 'Not set' : new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
	}

	function statusLabel(status) {
		if (status === 'on_hold') return 'On hold';
		return String(status ?? 'active').replace('_', ' ');
	}

	function statusClass(status) {
		if (status === 'completed') return 'bg-emerald-50 text-emerald-700';
		if (status === 'on_hold') return 'bg-amber-50 text-amber-700';
		if (status === 'canceled') return 'bg-rose-50 text-rose-700';
		if (status === 'planning') return 'bg-sky-50 text-sky-700';
		return 'bg-slate-100 text-slate-700';
	}

	function activeProjectCount() {
		return data.projects.filter((project) => !['completed', 'canceled'].includes(project.status)).length;
	}

	function closedProjectCount() {
		return data.projects.filter((project) => ['completed', 'canceled'].includes(project.status)).length;
	}

	function totalActiveTasks() {
		return data.projects.reduce((total, project) => total + (project.summary?.activeTasks ?? 0), 0);
	}
</script>

<section class="space-y-5">
	<div class="flex justify-end">
		<button type="button" class="inline-flex h-10 items-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800" onclick={() => (createDrawerOpen = true)}>
			New client project
		</button>
	</div>

	{#if data.notice}
		<div class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{data.notice}</div>
	{/if}

	{#if form?.message}
		<div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{form.message}</div>
	{/if}

	{#if data.errorMessage}
		<div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{data.errorMessage}</div>
	{/if}

	<div class="grid gap-4 sm:grid-cols-3">
		<div class="rounded-[1.6rem] border border-slate-200 bg-white px-5 py-4 dark:border-white/10 dark:bg-slate-900/92">
			<p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Total Projects</p>
			<p class="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{data.projects.length}</p>
			<p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Every client engagement can live as its own project.</p>
		</div>
		<div class="rounded-[1.6rem] border border-slate-200 bg-white px-5 py-4 dark:border-white/10 dark:bg-slate-900/92">
			<p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Active Projects</p>
			<p class="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{activeProjectCount()}</p>
			<p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Planning, active, and on-hold work that is still in flight.</p>
		</div>
		<div class="rounded-[1.6rem] border border-slate-200 bg-white px-5 py-4 dark:border-white/10 dark:bg-slate-900/92">
			<p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Open Work</p>
			<p class="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{totalActiveTasks()}</p>
			<p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Active tasks across the client’s current project portfolio.</p>
		</div>
	</div>

	{#if closedProjectCount() > 0}
		<p class="text-sm text-slate-500 dark:text-slate-400">{closedProjectCount()} completed or canceled project{closedProjectCount() === 1 ? '' : 's'} remain in this history so new work does not have to reuse an old delivery plan.</p>
	{/if}

	<div class="overflow-hidden rounded-[1.9rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/92">
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
				<thead class="bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:bg-white/5 dark:text-slate-500">
					<tr>
						<th class="px-5 py-4">Project</th>
						<th class="px-5 py-4">Dates</th>
						<th class="px-5 py-4">Progress</th>
						<th class="px-5 py-4">Work</th>
						<th class="px-5 py-4">Status</th>
						<th class="px-5 py-4 text-right">Action</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100 dark:divide-white/5">
					{#if data.projects.length === 0}
						<tr><td colspan="6" class="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">No client projects exist yet. Create the first project for this client, then add new ones over time as each engagement is completed.</td></tr>
					{:else}
						{#each data.projects as project}
							<tr class="bg-white align-top dark:bg-slate-900/92">
								<td class="px-5 py-4">
									<a href={`/projects/${project.id}/overview`} class="font-semibold text-slate-950 transition hover:text-slate-700 hover:underline dark:text-white dark:hover:text-slate-300">{project.name}</a>
									<p class="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">{project.description || 'No description'}</p>
								</td>
								<td class="px-5 py-4 text-slate-600 dark:text-slate-400">{formatDate(project.startAt)} - {formatDate(project.dueAt)}</td>
								<td class="px-5 py-4">
									<div class="flex min-w-40 items-center gap-3">
										<div class="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"><div class="h-full rounded-full bg-sky-400" style={`width: ${project.summary.averageProgress}%`}></div></div>
										<span class="text-xs font-semibold text-slate-600 dark:text-slate-400">{project.summary.averageProgress}%</span>
									</div>
								</td>
								<td class="px-5 py-4 text-slate-600 dark:text-slate-400">{project.summary.activeTasks} active / {project.summary.totalTasks} total</td>
								<td class="px-5 py-4"><span class={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(project.status)} dark:bg-opacity-20 dark:text-white`}>{statusLabel(project.status)}</span></td>
								<td class="px-5 py-4 text-right"><a href={`/projects/${project.id}/overview`} class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white">Open</a></td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>

	{#if createDrawerOpen}
		<div class="fixed inset-0 z-50">
			<button type="button" class="absolute inset-0 bg-slate-950/35 backdrop-blur-[3px]" onclick={() => (createDrawerOpen = false)} aria-label="Close new client project drawer" in:fade={{ duration: 180 }} out:fade={{ duration: 140 }}></button>
			<div class="absolute inset-y-0 right-0 w-full bg-white shadow-[-24px_0_80px_-48px_rgba(15,23,42,0.55)] sm:max-w-2xl lg:w-[40vw] lg:max-w-none lg:min-w-[32rem]" in:fly={{ x: 96, duration: 220, opacity: 1 }} out:fly={{ x: 96, duration: 180, opacity: 1 }}>
				<section class="flex h-full flex-col bg-white">
					<div class="border-b border-slate-200 px-5 py-5 sm:px-6">
						<div class="flex items-start justify-between gap-4">
							<div>
								<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Client Projects</p>
								<h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Create client project</h2>
								<p class="mt-2 text-sm leading-6 text-slate-600">Create a distinct project for this client. Each project gets its own phases, tasks, progress, and completion state so future work can start fresh.</p>
							</div>
							<button type="button" class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700" onclick={() => (createDrawerOpen = false)}>Close</button>
						</div>
					</div>

					<form method="POST" action="?/create" class="flex min-h-0 flex-1 flex-col">
						<div class="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
							<input type="hidden" name="audienceId" value={data.client.id} />
							<div>
								<label for="name" class="block text-sm font-semibold text-slate-800">Project name</label>
								<input id="name" name="name" value={values().name ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-300" placeholder="Website relaunch" />
								{#if errors().name}<p class="mt-2 text-sm text-rose-600">{errors().name}</p>{/if}
							</div>
							<div>
								<label for="description" class="block text-sm font-semibold text-slate-800">Description</label>
								<textarea id="description" name="description" rows="4" class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-300">{values().description ?? ''}</textarea>
							</div>
							<div class="grid gap-5 sm:grid-cols-2">
								<div><label for="startAt" class="block text-sm font-semibold text-slate-800">Start</label><input id="startAt" name="startAt" type="date" value={values().startAt ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-300" /></div>
								<div><label for="dueAt" class="block text-sm font-semibold text-slate-800">Due</label><input id="dueAt" name="dueAt" type="date" value={values().dueAt ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-300" /></div>
							</div>
							<div>
								<label for="status" class="block text-sm font-semibold text-slate-800">Status</label>
								<select id="status" name="status" class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-300">
									<option value="planning" selected={values().status === 'planning'}>Planning</option>
									<option value="active" selected={(values().status ?? 'active') === 'active'}>Active</option>
									<option value="on_hold" selected={values().status === 'on_hold'}>On hold</option>
									<option value="completed" selected={values().status === 'completed'}>Completed</option>
								</select>
							</div>
						</div>
						<div class="flex justify-end gap-3 border-t border-slate-200 px-5 py-4 sm:px-6">
							<button type="button" class="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700" onclick={() => (createDrawerOpen = false)}>Cancel</button>
							<button class="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white">Create project</button>
						</div>
					</form>
				</section>
			</div>
		</div>
	{/if}
</section>
