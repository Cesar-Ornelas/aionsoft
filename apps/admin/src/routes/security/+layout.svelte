<script>
	let { data, children } = $props();

	const tabs = [
		{ href: '/security/users', label: 'Users', createHref: '/security/users?new=1', createLabel: 'Add user' },
		{ href: '/security/roles', label: 'Roles', createHref: '/security/roles?new=1', createLabel: 'Add role' },
		{ href: '/security/permissions', label: 'Permissions', createHref: '/security/permissions?new=1', createLabel: 'Add permission' }
	];

	function isActive(href) {
		return data.currentPath === href || data.currentPath.startsWith(`${href}/`);
	}

	function getActiveTab() {
		return tabs.find((tab) => isActive(tab.href)) ?? tabs[0];
	}
</script>

<div class="space-y-6">
	<header class="flex flex-col gap-4 border-b border-slate-200/80 pb-5 dark:border-white/10 lg:flex-row lg:items-end lg:justify-between">
		<div>
			<p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Security</p>
			<h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">Authentication, access, and identity controls</h1>
		</div>

		<div class="rounded-[1.6rem] border border-emerald-100 bg-[linear-gradient(135deg,#ecfdf5,#f8fafc_68%,#eff6ff)] px-5 py-4 dark:border-emerald-500/20 dark:bg-[linear-gradient(135deg,rgba(6,95,70,0.34),rgba(15,23,42,0.96)_68%,rgba(12,74,110,0.52))]">
			<p class="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-200">Organization</p>
			<p class="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{data.bootstrap.organization?.name ?? 'Setup required'}</p>
			<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
				{data.bootstrap.organizationCount} configured {data.bootstrap.organizationCount === 1 ? 'organization' : 'organizations'}
			</p>
		</div>
	</header>

	<div class="flex flex-wrap items-center gap-2">
		<a
			href={getActiveTab().createHref}
			aria-label={getActiveTab().createLabel}
			title={getActiveTab().createLabel}
			class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-lg font-semibold text-white transition hover:bg-slate-800"
		>
			+
		</a>

		<nav class="flex flex-wrap gap-2">
			{#each tabs as tab}
				<a
					href={tab.href}
					class={`rounded-full border px-4 py-2 text-sm font-semibold transition ${isActive(tab.href) ? 'border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900 dark:border-white/10 dark:bg-slate-900/92 dark:text-slate-300 dark:hover:border-white/20 dark:hover:text-white'}`}
				>
					{tab.label}
				</a>
			{/each}
		</nav>
	</div>

	{@render children()}
</div>