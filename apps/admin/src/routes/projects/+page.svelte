<script>
	import { fade, fly } from 'svelte/transition';

	let { data, form } = $props();

	let actionsOpen = $state(false);
	let createDrawerOpen = $state(false);
	let importDialogOpen = $state(false);

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

	function openImportDialog() {
		actionsOpen = false;
		importDialogOpen = true;
	}
</script>

<section class="space-y-5">
	<header class="flex flex-col gap-4 border-b border-slate-200/80 pb-5 dark:border-white/10 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Projects</p>
			<h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">Complex project delivery</h1>
			<p class="mt-2 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-400">
				Track phases, milestones, project tasks, lists, comments, and progress without changing the simple task workspace.
			</p>
		</div>

		<div class="flex flex-wrap items-center gap-3">
			<div class="relative">
				<button type="button" class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white" onclick={() => (actionsOpen = !actionsOpen)} aria-haspopup="menu" aria-expanded={actionsOpen} aria-label="Project actions" title="Project actions">
					<svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true"><path d="M5 10a1.25 1.25 0 1 0 0 .001V10Zm5 0a1.25 1.25 0 1 0 0 .001V10Zm5 0a1.25 1.25 0 1 0 0 .001V10Z" fill="currentColor" /></svg>
				</button>

				{#if actionsOpen}
					<button type="button" class="fixed inset-0 z-10" onclick={() => (actionsOpen = false)} aria-label="Close actions menu"></button>
					<div class="absolute right-0 top-[calc(100%+0.6rem)] z-20 w-52 rounded-[1.3rem] border border-slate-200 bg-white p-2 shadow-[0_32px_80px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-950/5 dark:border-white/10 dark:bg-slate-900 dark:ring-white/10 dark:shadow-[0_32px_80px_-32px_rgba(2,6,23,0.85)]">
						<a href="/projects/export" class="flex items-center gap-3 rounded-[1rem] px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-white" onclick={() => (actionsOpen = false)}>
							<svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true"><path d="M10 3.75v8.5m0 0 3-3m-3 3-3-3M4.75 13.75v.5A1.75 1.75 0 0 0 6.5 16h7a1.75 1.75 0 0 0 1.75-1.75v-.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
							<span>Export JSON</span>
						</a>
						<button type="button" class="flex w-full items-center gap-3 rounded-[1rem] px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-white" onclick={openImportDialog}>
							<svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true"><path d="M10 12.25v-8.5m0 0 3 3m-3-3-3 3m-2.25 7v.5A1.75 1.75 0 0 0 6.5 16h7a1.75 1.75 0 0 0 1.75-1.75v-.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
							<span>Import JSON</span>
						</button>
					</div>
				{/if}
			</div>

			<button type="button" class="inline-flex h-10 items-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800" onclick={() => (createDrawerOpen = true)}>
				New project
			</button>
		</div>
	</header>

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
				<tbody class="divide-y divide-slate-100 dark:divide-white/10">
					{#if data.projects.length === 0}
						<tr><td colspan="6" class="px-5 py-10 text-center text-sm text-slate-500">No projects have been created yet.</td></tr>
					{:else}
						{#each data.projects as project}
							<tr class="bg-white align-top dark:bg-transparent">
								<td class="px-5 py-4">
									<a href={`/projects/${project.id}/overview`} class="font-semibold text-slate-950 transition hover:text-slate-700 hover:underline dark:text-white dark:hover:text-slate-200">{project.name}</a>
									<p class="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">{project.description || 'No description'}</p>
								</td>
								<td class="px-5 py-4 text-slate-600 dark:text-slate-400">{formatDate(project.startAt)} - {formatDate(project.dueAt)}</td>
								<td class="px-5 py-4">
									<div class="flex min-w-40 items-center gap-3">
										<div class="h-2 flex-1 overflow-hidden rounded-full bg-slate-200"><div class="h-full rounded-full bg-sky-400" style={`width: ${project.summary.averageProgress}%`}></div></div>
										<span class="text-xs font-semibold text-slate-600 dark:text-slate-300">{project.summary.averageProgress}%</span>
									</div>
								</td>
								<td class="px-5 py-4 text-slate-600 dark:text-slate-400">{project.summary.activeTasks} active / {project.summary.totalTasks} total</td>
								<td class="px-5 py-4"><span class={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(project.status)}`}>{statusLabel(project.status)}</span></td>
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
			<button type="button" class="absolute inset-0 bg-slate-950/35 backdrop-blur-[3px]" onclick={() => (createDrawerOpen = false)} aria-label="Close new project drawer" in:fade={{ duration: 180 }} out:fade={{ duration: 140 }}></button>
			<div class="absolute inset-y-0 right-0 w-full bg-white shadow-[-24px_0_80px_-48px_rgba(15,23,42,0.55)] dark:bg-slate-950 dark:shadow-[-24px_0_80px_-48px_rgba(2,6,23,0.85)] sm:max-w-2xl lg:w-[40vw] lg:max-w-none lg:min-w-[32rem]" in:fly={{ x: 96, duration: 220, opacity: 1 }} out:fly={{ x: 96, duration: 180, opacity: 1 }}>
				<section class="flex h-full flex-col bg-white dark:bg-slate-950">
					<div class="border-b border-slate-200 px-5 py-5 dark:border-white/10 sm:px-6">
						<div class="flex items-start justify-between gap-4">
							<div>
								<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Projects</p>
								<h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Create project</h2>
								<p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">New projects start with default phases and task lists so planning can begin immediately.</p>
							</div>
							<button type="button" class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-white/10 dark:text-slate-200" onclick={() => (createDrawerOpen = false)}>Close</button>
						</div>
					</div>

					<form method="POST" action="?/create" class="flex min-h-0 flex-1 flex-col">
						<div class="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
							<div>
								<label for="name" class="block text-sm font-semibold text-slate-800 dark:text-slate-200">Project name</label>
								<input id="name" name="name" value={values().name ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-sky-500/50" placeholder="Website relaunch" />
								{#if errors().name}<p class="mt-2 text-sm text-rose-600">{errors().name}</p>{/if}
							</div>
							<div>
								<label for="description" class="block text-sm font-semibold text-slate-800 dark:text-slate-200">Description</label>
								<textarea id="description" name="description" rows="4" class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-sky-500/50">{values().description ?? ''}</textarea>
							</div>
							<div class="grid gap-5 sm:grid-cols-2">
								<div><label for="startAt" class="block text-sm font-semibold text-slate-800 dark:text-slate-200">Start</label><input id="startAt" name="startAt" type="date" value={values().startAt ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-sky-500/50" /></div>
								<div><label for="dueAt" class="block text-sm font-semibold text-slate-800 dark:text-slate-200">Due</label><input id="dueAt" name="dueAt" type="date" value={values().dueAt ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-sky-500/50" /></div>
							</div>
							<div>
								<label for="status" class="block text-sm font-semibold text-slate-800 dark:text-slate-200">Status</label>
								<select id="status" name="status" class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-sky-500/50">
									<option value="planning" selected={values().status === 'planning'}>Planning</option>
									<option value="active" selected={(values().status ?? 'active') === 'active'}>Active</option>
									<option value="on_hold" selected={values().status === 'on_hold'}>On hold</option>
									<option value="completed" selected={values().status === 'completed'}>Completed</option>
								</select>
							</div>
						</div>
						<div class="flex justify-end gap-3 border-t border-slate-200 px-5 py-4 dark:border-white/10 sm:px-6">
							<button type="button" class="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:border-white/10 dark:text-slate-200" onclick={() => (createDrawerOpen = false)}>Cancel</button>
							<button class="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white">Create project</button>
						</div>
					</form>
				</section>
			</div>
		</div>
	{/if}

	{#if importDialogOpen}
		<div class="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6">
			<button type="button" class="absolute inset-0 bg-slate-950/30 backdrop-blur-[2px]" onclick={() => (importDialogOpen = false)} aria-label="Close import dialog"></button>
			<div class="relative z-10 w-full max-w-xl rounded-[1.8rem] border border-white/80 bg-white p-6 shadow-[0_32px_80px_-42px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_32px_80px_-42px_rgba(2,6,23,0.85)] sm:p-7">
				<div class="border-b border-slate-200/80 pb-4 dark:border-white/10">
					<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Import</p>
					<h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Import projects JSON</h2>
					<p class="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-400">Imported projects are added as new records with their internal relationships preserved.</p>
				</div>
				<form method="POST" action="?/import" enctype="multipart/form-data" class="mt-5 space-y-5">
					<input type="file" name="file" accept="application/json,.json" class="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-slate-950 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:file:bg-white dark:file:text-slate-950" />
					<div class="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200">This import is additive and creates new project IDs.</div>
					<div class="flex justify-end gap-3"><button type="button" class="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:border-white/10 dark:text-slate-200" onclick={() => (importDialogOpen = false)}>Cancel</button><button class="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">Import projects</button></div>
				</form>
			</div>
		</div>
	{/if}
</section>
