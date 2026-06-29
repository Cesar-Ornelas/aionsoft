<script>
	let { data } = $props();

	function formatDate(value) {
		if (!value) {
			return 'Not available';
		}

		return new Intl.DateTimeFormat('en-US', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(value));
	}
</script>

<section class="space-y-6">
	<header class="flex flex-col gap-4 border-b border-slate-200/80 pb-5 dark:border-white/10 lg:flex-row lg:items-end lg:justify-between">
		<div>
			<p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Monitoring</p>
			<h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">Infrastructure dashboard</h1>
			<p class="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-400">
				Keep a compact view of saved monitoring links and jump into the sites catalog when you need to register more.
			</p>
		</div>

		<a href="/monitoring/sites/new" class="inline-flex h-10 items-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800">
			Add site
		</a>
	</header>

	<div class="grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
		<section class="rounded-[1.9rem] border border-slate-200 bg-[linear-gradient(135deg,#eff6ff,#f8fafc_62%,#ecfeff)] p-6 dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(14,116,144,0.14),rgba(15,23,42,0.96)_62%,rgba(8,47,73,0.88))]">
			<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Summary</p>
			<div class="mt-5 rounded-[1.5rem] border border-white/80 bg-white/90 p-5 dark:border-white/10 dark:bg-slate-950/55">
				<p class="text-sm font-medium text-slate-500 dark:text-slate-400">Saved monitoring sites</p>
				<p class="mt-3 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">{data.siteCount}</p>
				<p class="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400">
					Use the sites catalog to keep your most important infrastructure dashboards one click away.
				</p>
			</div>

			<div class="mt-4 flex flex-wrap gap-3">
				<a href="/monitoring/sites" class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white">
					Open sites
				</a>
				<a href="/monitoring/sites/new" class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white">
					Register site
				</a>
			</div>
		</section>

		<section class="rounded-[1.9rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/92">
			<div class="border-b border-slate-200/80 px-6 py-5 dark:border-white/10">
				<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Recent links</p>
				<h2 class="mt-2 text-xl font-semibold tracking-tight text-slate-950 dark:text-white">Recently updated sites</h2>
			</div>

			<div class="divide-y divide-slate-100 dark:divide-white/10">
				{#if data.recentSites.length === 0}
					<div class="px-6 py-10 text-sm text-slate-500">
						No monitoring sites have been registered yet.
					</div>
				{:else}
					{#each data.recentSites as site}
						<div class="px-6 py-5">
							<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
								<div class="min-w-0">
									<p class="font-semibold text-slate-950 dark:text-white">{site.name}</p>
									<a href={site.url} target="_blank" rel="noreferrer" class="mt-1 block truncate text-sm text-sky-700 transition hover:text-sky-800 hover:underline">
										{site.url}
									</a>
									<p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{site.description || 'No description provided.'}</p>
								</div>

								<div class="sm:text-right">
									<p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Updated</p>
									<p class="mt-2 text-sm text-slate-600 dark:text-slate-400">{formatDate(site.updatedAt ?? site.createdAt)}</p>
								</div>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</section>
	</div>
</section>