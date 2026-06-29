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
		return form?.intent === 'createDirectory' ? form.values ?? {} : {};
	}

	function errors() {
		return form?.intent === 'createDirectory' ? form.errors ?? {} : {};
	}

	function statusBadgeClass(status) {
		if (status === 'enabled') return 'bg-emerald-50 text-emerald-700';
		if (status === 'provisioning') return 'bg-sky-50 text-sky-700';
		if (status === 'error') return 'bg-rose-50 text-rose-700';
		return 'bg-slate-100 text-slate-700';
	}

	function statusLabel(status) {
		if (status === 'provisioning') return 'Provisioning';
		return `${String(status ?? 'disabled').slice(0, 1).toUpperCase()}${String(status ?? 'disabled').slice(1)}`;
	}
</script>

<section class="space-y-6">
	{#if data.storage && data.storage.config.status !== 'enabled'}
		<div class="flex justify-end">
			<form method="POST" action="?/enable">
				<button class="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
					Enable storage
				</button>
			</form>
		</div>
	{/if}

	{#if !data.environment.configured}
		<div class="rounded-[1.7rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
			<p class="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Configuration required</p>
			<p class="mt-2 leading-6">Client storage cannot be provisioned until the admin app receives the required R2 environment variables.</p>
			<p class="mt-3 font-medium">Missing variables: {data.environment.missingVars.join(', ')}</p>
		</div>
	{/if}

	{#if data.storage}
		<section class="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
		<div class="rounded-[1.9rem] border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-slate-900/92">
			<div class="flex items-start justify-between gap-4">
				<div>
					<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Storage status</p>
					<h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{data.storage.config.basePrefix}</h2>
					<p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">Every allowed directory for this client lives under the fixed base prefix shown here.</p>
					</div>
					<span class={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(data.storage.config.status)}`}>{statusLabel(data.storage.config.status)}</span>
				</div>

				<dl class="mt-6 grid gap-5 sm:grid-cols-2">
					<div>
					<dt class="text-sm font-medium text-slate-500 dark:text-slate-400">Bucket</dt>
					<dd class="mt-2 text-sm text-slate-950 dark:text-slate-100">{data.storage.config.bucketName ?? data.environment.bucketName ?? 'Not configured'}</dd>
				</div>
				<div>
					<dt class="text-sm font-medium text-slate-500 dark:text-slate-400">Provisioned</dt>
					<dd class="mt-2 text-sm text-slate-950 dark:text-slate-100">{formatDate(data.storage.config.provisionedAt)}</dd>
				</div>
				<div>
					<dt class="text-sm font-medium text-slate-500 dark:text-slate-400">Last synced</dt>
					<dd class="mt-2 text-sm text-slate-950 dark:text-slate-100">{formatDate(data.storage.config.lastSyncedAt)}</dd>
				</div>
				<div>
					<dt class="text-sm font-medium text-slate-500 dark:text-slate-400">Directories</dt>
					<dd class="mt-2 text-sm text-slate-950 dark:text-slate-100">{data.storage.directories.length}</dd>

				{#if data.storage.config.lastError}
					<div class="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{data.storage.config.lastError}</div>
				{/if}
			</div>

<section class="rounded-[1.9rem] border border-slate-200 bg-slate-50/80 p-6 dark:border-white/10 dark:bg-white/5">
			<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Allowed directories</p>
			<h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">API-safe paths</h2>
			<p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">Admins define the only directories the future client upload API will be allowed to target under this client prefix.</p>

				{#if data.storage.config.status === 'enabled'}
					<form method="POST" action="?/createDirectory" class="mt-6 space-y-4 rounded-[1.6rem] border border-slate-200 bg-white p-5">
						<div>
							<label class="block text-sm font-medium text-slate-700" for="displayName">Label</label>
							<input id="displayName" name="displayName" value={values().displayName ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white" placeholder="Invoices" />
						</div>
						<div>
							<label class="block text-sm font-medium text-slate-700" for="path">Directory path</label>
							<input id="path" name="path" value={values().path ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white" placeholder="invoices/2026" />
							<p class="mt-2 text-xs text-slate-500">Use nested lowercase path segments such as invoices/2026 or uploads/raw.</p>
							{#if errors().path}<p class="mt-2 text-sm text-rose-600">{errors().path}</p>{/if}
						</div>
						<div class="flex justify-end">
							<button class="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">Create directory</button>
						</div>
					</form>
				{:else}
					<div class="mt-6 rounded-[1.6rem] border border-dashed border-slate-300 bg-white px-5 py-6 text-sm text-slate-500">Enable client storage before creating allowed directories.</div>
				{/if}
			</section>
		</section>

		<div class="overflow-hidden rounded-[1.9rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/92">
			<div class="border-b border-slate-200 px-5 py-5 dark:border-white/10">
				<p class="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">Allowed directories</p>
				<p class="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-400">The admin UI uses internal metadata as the source of truth for where files may be written later. It does not depend on live bucket scans.</p>
			</div>

			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
					<thead class="bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:bg-white/5 dark:text-slate-500">
						<tr>
							<th class="px-5 py-4">Label</th>
							<th class="px-5 py-4">Relative path</th>
							<th class="px-5 py-4">Full prefix</th>
							<th class="px-5 py-4">State</th>
							<th class="px-5 py-4">Created</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100 dark:divide-white/5">
						{#if data.storage.directories.length === 0}
							<tr>
								<td colspan="5" class="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">No allowed directories have been configured yet.</td>
							</tr>
						{:else}
							{#each data.storage.directories as directory}
								<tr class="bg-white align-top dark:bg-slate-900/92">
									<td class="px-5 py-4 font-semibold text-slate-950 dark:text-white">{directory.displayName}</td>
									<td class="px-5 py-4 text-slate-600 dark:text-slate-400">{directory.path}</td>
									<td class="px-5 py-4 text-slate-500 dark:text-slate-400">{data.storage.config.basePrefix}{directory.path}/</td>
									<td class="px-5 py-4"><span class={`rounded-full px-2.5 py-1 text-xs font-semibold ${directory.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-200' : 'bg-slate-100 text-slate-700 dark:bg-white/8 dark:text-slate-300'}`}>{directory.isActive ? 'Active' : 'Inactive'}</span></td>
									<td class="px-5 py-4 text-slate-500 dark:text-slate-400">{formatDate(directory.createdAt)}</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</section>