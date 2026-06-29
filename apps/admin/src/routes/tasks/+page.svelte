<script>
	let { data } = $props();

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

	function formatHeaderDate(value = new Date()) {
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric'
		}).format(value);
	}

	function dashboard() {
		return data.dashboard ?? {
			summary: {
				openTasksCount: 0,
				overdueCount: 0,
				customerScopedCount: 0,
				completedThisMonthCount: 0,
				dueThisWeekCount: 0,
				waitingCount: 0,
				updatesTodayCount: 0,
				criticalCount: 0,
				filteredCount: 0,
				totalCount: 0
			},
			dueForecast: [],
			statusMix: { total: 0, buckets: [] },
			clientWorkload: [],
			attentionNeeded: [],
			throughput: [],
			recentActivity: []
		};
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

	function dueForecastBarClass(key) {
		if (key === 'overdue') {
			return 'bg-rose-400';
		}

		if (key === 'today') {
			return 'bg-amber-400';
		}

		if (key === 'soon') {
			return 'bg-orange-400';
		}

		if (key === 'thisWeek') {
			return 'bg-sky-400';
		}

		if (key === 'nextWeek') {
			return 'bg-blue-400';
		}

		return 'bg-violet-400';
	}

	function attentionToneClasses(tone) {
		if (tone === 'rose') {
			return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200';
		}

		if (tone === 'amber') {
			return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200';
		}

		if (tone === 'sky') {
			return 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200';
		}

		return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200';
	}

	function workloadBarClass(index) {
		const classes = ['bg-rose-400', 'bg-sky-400', 'bg-amber-400', 'bg-violet-400'];
		return classes[index] ?? 'bg-slate-400';
	}

	function statusMixBarClass(key) {
		if (key === 'in_progress') {
			return 'bg-sky-400';
		}

		if (key === 'open') {
			return 'bg-slate-400';
		}

		if (key === 'on_hold') {
			return 'bg-amber-400';
		}

		if (key === 'deferred') {
			return 'bg-violet-400';
		}

		return 'bg-emerald-400';
	}
</script>

<section class="space-y-5">
	<header class="border-b border-slate-200/80 pb-5 dark:border-white/10">
		<div>
			<p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Tasks</p>
			<h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">Task dashboard</h1>
			<p class="mt-2 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-400">
				Use the dashboard to track workload and risk, then switch to View for the operational task list, filters, bulk actions, and drawer flows.
			</p>
		</div>
	</header>

	<section class="overflow-hidden rounded-[1.9rem] border border-slate-200 bg-[linear-gradient(135deg,#fff7f7,#ffffff_58%,#f8fafc)] shadow-[0_24px_60px_-48px_rgba(15,23,42,0.75)] dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(69,10,10,0.32),rgba(15,23,42,0.98)_58%,rgba(30,41,59,0.94))] dark:shadow-[0_24px_60px_-48px_rgba(2,6,23,0.95)]">
		<div class="grid gap-6 p-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] xl:p-7">
			<div>
				<div class="mb-4 flex flex-wrap gap-2">
					<span class="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
						{dashboard().summary.dueThisWeekCount} tasks due this week
					</span>
					<span class="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
						{dashboard().summary.waitingCount} on hold or deferred
					</span>
					<span class="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-200">
						{dashboard().summary.updatesTodayCount} updates today
					</span>
					<span class="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
						{dashboard().summary.criticalCount} critical open tasks
					</span>
				</div>
				<h2 class="max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
					Track work across clients without losing delivery visibility.
				</h2>
				<p class="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-400">
					Use due-date, client audience, status, progress, and recent activity signals to spot risk early and decide when to jump into the detailed task view.
				</p>
			</div>

			<div class="rounded-[1.7rem] border border-slate-200 bg-white/90 p-5 dark:border-white/10 dark:bg-slate-950/55">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-semibold text-slate-950 dark:text-white">Today's focus</p>
						<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatHeaderDate()}</p>
					</div>
					<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-white/8 dark:text-slate-300">
						{dashboard().summary.filteredCount} in current scope
					</span>
				</div>

				<div class="mt-4 space-y-3">
					<div class="rounded-[1.4rem] border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
						<div class="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
							<span>Overdue tasks</span>
							<span class="text-base font-semibold text-rose-600">{dashboard().summary.overdueCount}</span>
						</div>
						<div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
							<div class="h-full rounded-full bg-rose-400" style={`width: ${Math.min(100, dashboard().summary.totalCount > 0 ? Math.round((dashboard().summary.overdueCount / dashboard().summary.totalCount) * 100) : 0)}%`}></div>
						</div>
					</div>

					<div class="rounded-[1.4rem] border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
						<div class="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
							<span>Audience-bound work</span>
							<span class="text-base font-semibold text-sky-600">{dashboard().summary.customerScopedCount}</span>
						</div>
						<div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
							<div class="h-full rounded-full bg-sky-400" style={`width: ${Math.min(100, dashboard().summary.totalCount > 0 ? Math.round((dashboard().summary.customerScopedCount / dashboard().summary.totalCount) * 100) : 0)}%`}></div>
						</div>
					</div>

					<div class="rounded-[1.4rem] border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
						<div class="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
							<span>Completed this month</span>
							<span class="text-base font-semibold text-emerald-600">{dashboard().summary.completedThisMonthCount}</span>
						</div>
						<div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
							<div class="h-full rounded-full bg-emerald-400" style={`width: ${Math.min(100, dashboard().summary.totalCount > 0 ? Math.round((dashboard().summary.completedThisMonthCount / dashboard().summary.totalCount) * 100) : 0)}%`}></div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<article class="rounded-[1.7rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900/92">
			<p class="text-sm text-slate-500 dark:text-slate-400">Open tasks</p>
			<div class="mt-3 flex items-end justify-between gap-3">
				<strong class="text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">{dashboard().summary.openTasksCount}</strong>
				<span class="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-500/12 dark:text-sky-200">{dashboard().summary.filteredCount} filtered</span>
			</div>
		</article>

		<article class="rounded-[1.7rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900/92">
			<p class="text-sm text-slate-500 dark:text-slate-400">Overdue</p>
			<div class="mt-3 flex items-end justify-between gap-3">
				<strong class="text-4xl font-semibold tracking-tight text-rose-600">{dashboard().summary.overdueCount}</strong>
				<span class="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/12 dark:text-rose-200">Needs action</span>
			</div>
		</article>

		<article class="rounded-[1.7rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900/92">
			<p class="text-sm text-slate-500 dark:text-slate-400">Client-facing work</p>
			<div class="mt-3 flex items-end justify-between gap-3">
				<strong class="text-4xl font-semibold tracking-tight text-sky-600">{dashboard().summary.customerScopedCount}</strong>
				<span class="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-500/12 dark:text-sky-200">Audience set</span>
			</div>
		</article>

		<article class="rounded-[1.7rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900/92">
			<p class="text-sm text-slate-500 dark:text-slate-400">Completed this month</p>
			<div class="mt-3 flex items-end justify-between gap-3">
				<strong class="text-4xl font-semibold tracking-tight text-emerald-600">{dashboard().summary.completedThisMonthCount}</strong>
				<span class="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-200">Closed work</span>
			</div>
		</article>
	</section>

	<section class="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
		<article class="rounded-[1.9rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900/92">
			<div class="mb-5 flex items-center justify-between gap-3">
				<div>
					<h3 class="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">Due date forecast</h3>
					<p class="text-sm text-slate-500 dark:text-slate-400">Active tasks grouped by upcoming due window</p>
				</div>
				<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-white/8 dark:text-slate-300">{dashboard().summary.totalCount} total tasks</span>
			</div>
			<div class="flex h-72 items-end gap-3 rounded-[1.6rem] border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
				{#each dashboard().dueForecast as bucket}
					<div class="flex flex-1 flex-col items-center gap-2">
						<div class={`w-full rounded-t-[1rem] ${dueForecastBarClass(bucket.key)}`} style={`height: ${bucket.percentage}%`}></div>
						<div class="text-center">
							<p class="text-xs font-semibold text-slate-700 dark:text-slate-300">{bucket.count}</p>
							<p class="text-xs text-slate-400 dark:text-slate-500">{bucket.label}</p>
						</div>
					</div>
				{/each}
			</div>
		</article>

		<article class="rounded-[1.9rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900/92">
			<h3 class="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">Status mix</h3>
			<p class="mb-5 text-sm text-slate-500 dark:text-slate-400">Current workload across task states</p>
			<div class="rounded-[1.6rem] border border-slate-200 bg-slate-50/70 p-5 dark:border-white/10 dark:bg-white/5">
				<p class="text-sm font-medium text-slate-500 dark:text-slate-400">Tracked tasks</p>
				<p class="mt-2 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">{dashboard().statusMix.total}</p>
				<div class="mt-5 space-y-4">
					{#each dashboard().statusMix.buckets as bucket}
						<div>
							<div class="mb-2 flex justify-between text-sm">
								<span class="text-slate-700 dark:text-slate-300">{bucket.label}</span>
								<span class="font-semibold text-slate-950 dark:text-white">{bucket.count}</span>
							</div>
							<div class="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
								<div class={`h-full rounded-full ${statusMixBarClass(bucket.key)}`} style={`width: ${bucket.percentage}%`}></div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</article>
	</section>

	<section class="grid gap-4 xl:grid-cols-3">
		<article class="rounded-[1.9rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900/92">
			<h3 class="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">Client workload</h3>
			<p class="mb-5 text-sm text-slate-500 dark:text-slate-400">Open tasks grouped by audience</p>
			<div class="space-y-4">
				{#if dashboard().clientWorkload.length === 0}
					<p class="text-sm text-slate-500 dark:text-slate-400">No active workload is available yet.</p>
				{:else}
					{#each dashboard().clientWorkload as workload, index}
						<div>
							<div class="mb-2 flex justify-between text-sm">
								<span class="text-slate-700 dark:text-slate-300">{workload.label}</span>
								<span class="font-semibold text-slate-950 dark:text-white">{workload.count}</span>
							</div>
							<div class="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
								<div class={`h-full rounded-full ${workloadBarClass(index)}`} style={`width: ${workload.percentage}%`}></div>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</article>

		<article class="rounded-[1.9rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900/92">
			<h3 class="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">Attention needed</h3>
			<p class="mb-5 text-sm text-slate-500 dark:text-slate-400">Signals that deserve a quick follow-up</p>
			<div class="space-y-3">
				{#each dashboard().attentionNeeded as item}
					<div class={`rounded-[1.3rem] border p-4 ${attentionToneClasses(item.tone)}`}>
						<div class="flex items-center justify-between gap-3 text-sm">
							<span>{item.label}</span>
							<strong class="text-base">{item.count}</strong>
						</div>
					</div>
				{/each}
			</div>
		</article>

		<article class="rounded-[1.9rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900/92">
			<h3 class="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">Weekly throughput</h3>
			<p class="mb-5 text-sm text-slate-500 dark:text-slate-400">Created versus completed this week</p>
			<div class="space-y-4">
				{#each dashboard().throughput as day}
					<div class="grid grid-cols-[3rem_1fr] items-center gap-3">
						<span class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{day.label}</span>
						<div class="space-y-1">
							<div class="flex gap-1">
								<div class="h-3 rounded bg-emerald-400" style={`width: ${day.completedPercentage}%`}></div>
								<div class="h-3 rounded bg-slate-200 dark:bg-white/10" style={`width: ${Math.max(0, 100 - day.completedPercentage)}%`}></div>
							</div>
							<div class="flex gap-1">
								<div class="h-3 rounded bg-slate-400" style={`width: ${day.createdPercentage}%`}></div>
								<div class="h-3 rounded bg-slate-200 dark:bg-white/10" style={`width: ${Math.max(0, 100 - day.createdPercentage)}%`}></div>
							</div>
							<div class="flex justify-between text-[11px] text-slate-400 dark:text-slate-500">
								<span>Done {day.completedCount}</span>
								<span>Created {day.createdCount}</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</article>
	</section>

	<section class="rounded-[1.9rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/92">
		<div class="border-b border-slate-200/80 px-6 py-5 dark:border-white/10">
			<h3 class="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">Recent activity</h3>
			<p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Most recently touched tasks in the current filtered view.</p>
		</div>

		<div class="divide-y divide-slate-100 dark:divide-white/5">
			{#if dashboard().recentActivity.length === 0}
				<div class="px-6 py-10 text-sm text-slate-500 dark:text-slate-400">No recent task activity matches the current filters.</div>
			{:else}
				{#each dashboard().recentActivity as task}
					<div class="px-6 py-5">
						<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
							<div class="min-w-0">
								<div class="flex flex-wrap items-center gap-2">
									<p class="font-semibold text-slate-950 dark:text-white">{task.title}</p>
									<span class={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityBadgeClass(task.priority)}`}>{priorityLabel(task.priority)}</span>
									<span class={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(task.status)}`}>{statusLabel(task.status)}</span>
								</div>
								<p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{task.audienceLabel} · {task.progressPercentage}% complete</p>
							</div>

							<div class="sm:text-right">
								<p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Last activity</p>
								<p class="mt-2 text-sm text-slate-600 dark:text-slate-400">{formatDate(task.activityAt)}</p>
							</div>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</section>
</section>