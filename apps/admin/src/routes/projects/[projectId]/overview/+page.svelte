<script>
	let { data } = $props();

	function dashboard() {
		return data.dashboard ?? {
			summary: { totalTasks: 0, activeTasks: 0, completedTasks: 0, overdueTasks: 0, averageProgress: 0 },
			bucketCounts: [],
			phaseSummaries: [],
			recentActivity: [],
			upcomingTasks: []
		};
	}

	function formatDate(value) {
		if (!value) return 'Not set';
		const date = value instanceof Date ? value : new Date(String(value).includes('T') ? value : `${value}T00:00:00`);
		return Number.isNaN(date.getTime()) ? 'Not set' : new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
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
</script>

<section class="space-y-5">
	<header class="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Project Overview</p>
			<h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Delivery dashboard</h1>
			<p class="mt-2 max-w-3xl text-sm leading-7 text-slate-600">Track project progress across phases, task lists, milestones, due dates, and recent project task activity.</p>
		</div>
		<a href={`/projects/${data.dashboard?.project?.id ?? ''}/tasks?new=1`} class="inline-flex h-10 items-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800">Add task</a>
	</header>

	{#if data.notice}<div class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{data.notice}</div>{/if}
	{#if data.errorMessage}<div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{data.errorMessage}</div>{/if}

	<section class="overflow-hidden rounded-[1.9rem] border border-slate-200 bg-[linear-gradient(135deg,#f8fafc,#ffffff_56%,#eff6ff)] p-6">
		<div class="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
			<div>
				<div class="flex flex-wrap gap-2">
					<span class="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-100">{dashboard().summary.activeTasks} active tasks</span>
					<span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">{dashboard().summary.completedTasks} completed</span>
					<span class="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-100">{dashboard().summary.overdueTasks} overdue</span>
				</div>
				<h2 class="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{dashboard().summary.averageProgress}% overall completion</h2>
				<p class="mt-3 max-w-2xl text-sm leading-7 text-slate-600">Progress is derived from project-local tasks, so this dashboard can grow into deeper project planning without changing the simple task list.</p>
			</div>
			<div class="rounded-[1.6rem] border border-slate-200 bg-white/90 p-5">
				<div class="flex items-center justify-between text-sm text-slate-600"><span>Completion</span><strong class="text-slate-950">{dashboard().summary.averageProgress}%</strong></div>
				<div class="mt-4 h-3 overflow-hidden rounded-full bg-slate-200"><div class="h-full rounded-full bg-sky-400" style={`width: ${dashboard().summary.averageProgress}%`}></div></div>
				<div class="mt-5 grid grid-cols-2 gap-3 text-sm">
					<div class="rounded-2xl bg-slate-50 px-4 py-3"><p class="text-xs uppercase tracking-[0.2em] text-slate-400">Phases</p><p class="mt-2 text-lg font-semibold text-slate-950">{dashboard().summary.phaseCount}</p></div>
					<div class="rounded-2xl bg-slate-50 px-4 py-3"><p class="text-xs uppercase tracking-[0.2em] text-slate-400">Milestones</p><p class="mt-2 text-lg font-semibold text-slate-950">{dashboard().summary.milestoneCount}</p></div>
				</div>
			</div>
		</div>
	</section>

	<section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<article class="rounded-[1.7rem] border border-slate-200 bg-white p-5"><p class="text-sm text-slate-500">Total tasks</p><strong class="mt-3 block text-4xl font-semibold text-slate-950">{dashboard().summary.totalTasks}</strong></article>
		<article class="rounded-[1.7rem] border border-slate-200 bg-white p-5"><p class="text-sm text-slate-500">Active</p><strong class="mt-3 block text-4xl font-semibold text-sky-600">{dashboard().summary.activeTasks}</strong></article>
		<article class="rounded-[1.7rem] border border-slate-200 bg-white p-5"><p class="text-sm text-slate-500">Completed</p><strong class="mt-3 block text-4xl font-semibold text-emerald-600">{dashboard().summary.completedTasks}</strong></article>
		<article class="rounded-[1.7rem] border border-slate-200 bg-white p-5"><p class="text-sm text-slate-500">Overdue</p><strong class="mt-3 block text-4xl font-semibold text-rose-600">{dashboard().summary.overdueTasks}</strong></article>
	</section>

	<section class="grid gap-5 xl:grid-cols-2">
		<article class="rounded-[1.9rem] border border-slate-200 bg-white p-5">
			<h2 class="text-lg font-semibold text-slate-950">Phase progress</h2>
			<div class="mt-5 space-y-4">
				{#each dashboard().phaseSummaries as phase}
					<div>
						<div class="mb-2 flex justify-between text-sm"><span class="font-medium text-slate-700">{phase.name}</span><span class="text-slate-500">{phase.completedTasks}/{phase.taskCount}</span></div>
						<div class="h-3 overflow-hidden rounded-full bg-slate-200"><div class="h-full rounded-full bg-sky-400" style={`width: ${phase.progressPercentage}%`}></div></div>
					</div>
				{/each}
			</div>
		</article>

		<article class="rounded-[1.9rem] border border-slate-200 bg-white p-5">
			<h2 class="text-lg font-semibold text-slate-950">List mix</h2>
			<div class="mt-5 space-y-3">
				{#each dashboard().bucketCounts as bucket}
					<div class="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm"><span class="font-medium text-slate-700">{bucket.name}</span><span class="font-semibold text-slate-950">{bucket.count}</span></div>
				{/each}
			</div>
		</article>
	</section>

	<section class="grid gap-5 xl:grid-cols-2">
		<article class="rounded-[1.9rem] border border-slate-200 bg-white">
			<div class="border-b border-slate-200 px-5 py-4"><h2 class="text-lg font-semibold text-slate-950">Upcoming tasks</h2></div>
			<div class="divide-y divide-slate-100">
				{#if dashboard().upcomingTasks.length === 0}<div class="px-5 py-8 text-sm text-slate-500">No upcoming dated tasks.</div>{/if}
				{#each dashboard().upcomingTasks as task}
					<div class="px-5 py-4"><div class="flex items-start justify-between gap-3"><div><p class="font-semibold text-slate-950">{task.title}</p><p class="mt-1 text-sm text-slate-500">Due {formatDate(task.dueAt)}</p></div><span class={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(task.status)}`}>{statusLabel(task.status)}</span></div></div>
				{/each}
			</div>
		</article>

		<article class="rounded-[1.9rem] border border-slate-200 bg-white">
			<div class="border-b border-slate-200 px-5 py-4"><h2 class="text-lg font-semibold text-slate-950">Recent activity</h2></div>
			<div class="divide-y divide-slate-100">
				{#if dashboard().recentActivity.length === 0}<div class="px-5 py-8 text-sm text-slate-500">No project task activity yet.</div>{/if}
				{#each dashboard().recentActivity as task}
					<div class="px-5 py-4"><div class="flex items-start justify-between gap-3"><div><p class="font-semibold text-slate-950">{task.title}</p><p class="mt-1 text-sm text-slate-500">{task.progressPercentage}% complete</p></div><span class={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(task.status)}`}>{statusLabel(task.status)}</span></div></div>
				{/each}
			</div>
		</article>
	</section>
</section>
