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

<section class="space-y-5">
	<header class="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Sites</p>
			<h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Saved monitoring links</h1>
			<p class="mt-2 text-sm leading-7 text-slate-600">
				Register dashboards, status pages, and operational links so the team can jump to them without hunting across bookmarks.
			</p>
		</div>

		<a href="/monitoring/sites/new" class="inline-flex h-10 items-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800">
			Add site
		</a>
	</header>

	{#if data.notice}
		<div class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
			{data.notice}
		</div>
	{/if}

	{#if data.errorMessage}
		<div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
			{data.errorMessage}
		</div>
	{/if}

	{#if data.sites.length === 0}
		<section class="rounded-[1.9rem] border border-dashed border-slate-300 bg-slate-50/70 px-6 py-12 text-center">
			<p class="text-lg font-semibold tracking-tight text-slate-950">No monitoring sites yet</p>
			<p class="mt-2 text-sm leading-7 text-slate-600">
				Add your first site to keep favorite infrastructure dashboards and status pages in one place.
			</p>
			<div class="mt-5">
				<a href="/monitoring/sites/new" class="inline-flex h-10 items-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800">
					Register first site
				</a>
			</div>
		</section>
	{:else}
		<div class="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
			{#each data.sites as site}
				<article class="flex h-full flex-col rounded-[1.9rem] border border-slate-200 bg-white p-6">
					<div class="flex items-start justify-between gap-4">
						<div class="min-w-0">
							<p class="text-lg font-semibold tracking-tight text-slate-950">{site.name}</p>
							<a href={site.url} target="_blank" rel="noreferrer" class="mt-2 block break-all text-sm text-sky-700 transition hover:text-sky-800 hover:underline">
								{site.url}
							</a>
						</div>

						<a href={`/monitoring/sites/${site.id}/edit`} class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950">
							Edit
						</a>
					</div>

					<p class="mt-4 flex-1 text-sm leading-7 text-slate-600">{site.description || 'No description provided.'}</p>

					<div class="mt-6 flex items-end justify-between gap-4 border-t border-slate-200/80 pt-4">
						<div>
							<p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Updated</p>
							<p class="mt-2 text-sm text-slate-600">{formatDate(site.updatedAt ?? site.createdAt)}</p>
						</div>

						<a href={site.url} target="_blank" rel="noreferrer" class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950">
							Open link
						</a>
					</div>
				</article>
			{/each}
		</div>
	{/if}
</section>