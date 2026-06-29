<script>
	let { data, form } = $props();

	function formatDate(value) {
		if (!value) {
			return 'Not available';
		}

		return new Intl.DateTimeFormat('en-US', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(value));
	}

	function values() {
		return form?.intent === 'createCompanyDirectory' ? form.values ?? {} : {};
	}

	function errors() {
		return form?.intent === 'createCompanyDirectory' ? form.errors ?? {} : {};
	}

	function statusBadgeClass(status) {
		if (status === 'enabled') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-200';
		if (status === 'provisioning') return 'bg-sky-50 text-sky-700 dark:bg-sky-500/12 dark:text-sky-200';
		if (status === 'error') return 'bg-rose-50 text-rose-700 dark:bg-rose-500/12 dark:text-rose-200';
		return 'bg-slate-100 text-slate-700 dark:bg-white/8 dark:text-slate-300';
	}

	function statusLabel(status) {
		if (status === 'provisioning') return 'Provisioning';
		return `${String(status ?? 'disabled').slice(0, 1).toUpperCase()}${String(status ?? 'disabled').slice(1)}`;
	}
</script>

<section class="space-y-6">
	<header class="flex flex-col gap-4 border-b border-slate-200/80 pb-5 dark:border-white/10 lg:flex-row lg:items-end lg:justify-between">
		<div>
			<p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Tools</p>
			<h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">Storage</h1>
			<p class="mt-2 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-400">
				Manage company-level directories under the shared bucket and review every directory currently registered across client storage workspaces.
			</p>
		</div>

		{#if data.companyStorage && data.companyStorage.config.status !== 'enabled'}
			<form method="POST" action="?/enableCompany">
				<button class="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
					Enable company storage
				</button>
			</form>
		{/if}
	</header>

	{#if !data.environment.configured}
		<div class="rounded-[1.7rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
			<p class="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Configuration required</p>
			<p class="mt-2 leading-6">Company storage cannot be provisioned until the admin app receives the required R2 environment variables.</p>
			<p class="mt-3 font-medium">Missing variables: {data.environment.missingVars.join(', ')}</p>
		</div>
	{/if}

	{#if data.companyStorage}
		<section class="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
			<div class="rounded-[1.9rem] border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-slate-900/92">
				<div class="flex items-start justify-between gap-4">
					<div>
						<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Company storage</p>
						<h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{data.companyStorage.config.basePrefix}</h2>
						<p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">Use this prefix for directories that belong to your own company rather than an individual client.</p>
					</div>
					<span class={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(data.companyStorage.config.status)}`}>{statusLabel(data.companyStorage.config.status)}</span>
				</div>

				<dl class="mt-6 grid gap-5 sm:grid-cols-2">
					<div>
						<dt class="text-sm font-medium text-slate-500 dark:text-slate-400">Bucket</dt>
						<dd class="mt-2 text-sm text-slate-950 dark:text-slate-100">{data.companyStorage.config.bucketName ?? data.environment.bucketName ?? 'Not configured'}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-slate-500 dark:text-slate-400">Provisioned</dt>
						<dd class="mt-2 text-sm text-slate-950 dark:text-slate-100">{formatDate(data.companyStorage.config.provisionedAt)}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-slate-500 dark:text-slate-400">Last synced</dt>
						<dd class="mt-2 text-sm text-slate-950 dark:text-slate-100">{formatDate(data.companyStorage.config.lastSyncedAt)}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-slate-500 dark:text-slate-400">Directories</dt>
						<dd class="mt-2 text-sm text-slate-950 dark:text-slate-100">{data.companyStorage.directories.length}</dd>
					</div>
				</dl>

				{#if data.companyStorage.config.lastError}
					<div class="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{data.companyStorage.config.lastError}</div>
				{/if}
			</div>

			<section class="rounded-[1.9rem] border border-slate-200 bg-slate-50/80 p-6 dark:border-white/10 dark:bg-white/5">
				<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Company directories</p>
				<h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Internal paths</h2>
				<p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">Create directories for internal files, shared assets, or operations content that should not live under a client prefix.</p>

				{#if data.companyStorage.config.status === 'enabled'}
					<form method="POST" action="?/createCompanyDirectory" class="mt-6 space-y-4 rounded-[1.6rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900/92">
						<div>
							<label class="block text-sm font-medium text-slate-700 dark:text-slate-300" for="displayName">Label</label>
							<input id="displayName" name="displayName" value={values().displayName ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-teal-400 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-teal-500/40 dark:focus:bg-white/10" placeholder="Shared contracts" />
						</div>
						<div>
							<label class="block text-sm font-medium text-slate-700 dark:text-slate-300" for="path">Directory path</label>
							<input id="path" name="path" value={values().path ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-teal-400 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-teal-500/40 dark:focus:bg-white/10" placeholder="contracts/master" />
							<p class="mt-2 text-xs text-slate-500 dark:text-slate-400">Use nested lowercase segments such as contracts/master or finance/reports.</p>
							{#if errors().path}<p class="mt-2 text-sm text-rose-600">{errors().path}</p>{/if}
						</div>
						<div class="flex justify-end">
							<button class="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">Create directory</button>
						</div>
					</form>
				{:else}
					<div class="mt-6 rounded-[1.6rem] border border-dashed border-slate-300 bg-white px-5 py-6 text-sm text-slate-500 dark:border-white/10 dark:bg-slate-900/92 dark:text-slate-400">Enable company storage before creating directories.</div>
				{/if}
			</section>
		</section>

		<div class="grid gap-5 xl:grid-cols-2">
			<div class="overflow-hidden rounded-[1.9rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/92">
				<div class="border-b border-slate-200 px-5 py-5 dark:border-white/10">
					<p class="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">Company directories</p>
					<p class="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-400">These directories are managed directly from the storage tool.</p>
				</div>

				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
						<thead class="bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:bg-white/5 dark:text-slate-500">
							<tr>
								<th class="px-5 py-4">Label</th>
								<th class="px-5 py-4">Relative path</th>
								<th class="px-5 py-4">Full prefix</th>
								<th class="px-5 py-4">Created</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-100 dark:divide-white/5">
							{#if data.companyStorage.directories.length === 0}
								<tr>
									<td colspan="4" class="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">No company directories have been configured yet.</td>
								</tr>
							{:else}
								{#each data.companyStorage.directories as directory}
									<tr class="bg-white align-top dark:bg-slate-900/92">
										<td class="px-5 py-4 font-semibold text-slate-950 dark:text-white">{directory.displayName}</td>
										<td class="px-5 py-4 text-slate-600 dark:text-slate-400">{directory.path}</td>
										<td class="px-5 py-4 text-slate-500 dark:text-slate-400">{data.companyStorage.config.basePrefix}{directory.path}/</td>
										<td class="px-5 py-4 text-slate-500 dark:text-slate-400">{formatDate(directory.createdAt)}</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>

			<div class="overflow-hidden rounded-[1.9rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/92">
				<div class="border-b border-slate-200 px-5 py-5 dark:border-white/10">
					<p class="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">Client directories</p>
					<p class="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-400">This gives you a single operational view of every directory already registered inside client storage workspaces.</p>
				</div>

				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
						<thead class="bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:bg-white/5 dark:text-slate-500">
							<tr>
								<th class="px-5 py-4">Client</th>
								<th class="px-5 py-4">Label</th>
								<th class="px-5 py-4">Full prefix</th>
								<th class="px-5 py-4">State</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-100 dark:divide-white/5">
							{#if data.clientDirectories.length === 0}
								<tr>
									<td colspan="4" class="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">No client directories have been captured yet.</td>
								</tr>
							{:else}
								{#each data.clientDirectories as directory}
									<tr class="bg-white align-top dark:bg-slate-900/92">
										<td class="px-5 py-4">
											<a href={`/clients/${directory.clientId}/storage`} class="font-semibold text-slate-950 underline-offset-4 hover:underline dark:text-white">{directory.clientCompanyName}</a>
											<p class="mt-1 text-xs text-slate-400">{directory.path}</p>
										</td>
										<td class="px-5 py-4 text-slate-600 dark:text-slate-400">{directory.displayName}</td>
										<td class="px-5 py-4 text-slate-500 dark:text-slate-400">{directory.fullPrefix}</td>
										<td class="px-5 py-4"><span class={`rounded-full px-2.5 py-1 text-xs font-semibold ${directory.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-200' : 'bg-slate-100 text-slate-700 dark:bg-white/8 dark:text-slate-300'}`}>{directory.isActive ? 'Active' : 'Inactive'}</span></td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	{/if}
</section>