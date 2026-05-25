<script>
	const tools = [
		{
			name: 'Monitoring',
			href: '/monitoring',
			description: 'Dashboards, saved monitoring URLs, and future operational views.'
		},
		{
			name: 'Integrations',
			href: '/integrations',
			description: 'Issue API tokens and manage inbound task integrations for external systems.'
		},
		{
			name: 'Jobs',
			href: '/tools/jobs',
			description: 'Review job execution history grouped by job name, including failures and recent results.'
		}
	];
</script>

<section class="space-y-6">
	<header class="flex flex-col gap-4 border-b border-slate-200/80 pb-5 lg:flex-row lg:items-end lg:justify-between">
		<div>
			<p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Tools</p>
			<h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Operational tools</h1>
			<p class="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
				Choose a tool to enter its dedicated workspace. New tools can be added here over time as standalone operational surfaces.
			</p>
		</div>
	</header>

	<div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
		{#each tools as tool}
			<a href={tool.href} class="group aspect-square rounded-[2rem] border border-slate-200 bg-white p-6 transition hover:border-slate-300 hover:bg-slate-50">
				<div class="flex h-full flex-col justify-between">
					<div class="inline-flex h-20 w-20 items-center justify-center rounded-[1.6rem] bg-[linear-gradient(135deg,#e0f2fe,#ecfeff)] text-slate-950 transition group-hover:scale-[1.02]">
						<svg viewBox="0 0 24 24" fill="none" class="h-10 w-10" aria-hidden="true">
							<path d="M5 6.75A1.75 1.75 0 0 1 6.75 5h10.5A1.75 1.75 0 0 1 19 6.75v10.5A1.75 1.75 0 0 1 17.25 19H6.75A1.75 1.75 0 0 1 5 17.25V6.75Zm3.25 7h2.5V16h-2.5v-2.25Zm0-5.75h2.5v4h-2.5v-4Zm5 3h2.5V16h-2.5v-5Zm0-3h2.5v1.75h-2.5V8Z" fill="currentColor"/>
						</svg>
					</div>

					<div class="mt-6">
						<p class="text-2xl font-semibold tracking-tight text-slate-950">{tool.name}</p>
						<p class="mt-3 text-sm leading-7 text-slate-600">{tool.description}</p>
					</div>

					<div class="mt-6 flex items-center justify-between text-sm font-semibold text-slate-700">
						<span>Open tool</span>
						<span aria-hidden="true">→</span>
					</div>
				</div>
			</a>
		{/each}
	</div>
</section>