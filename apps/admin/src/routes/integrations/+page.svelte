<script>
	let { data, form } = $props();

	function formatDate(value) {
		if (!value) {
			return 'Never';
		}

		return new Intl.DateTimeFormat('en-US', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(value));
	}

	function isChecked(permission) {
		return (form?.values?.permissions ?? ['tasks:create']).includes(permission);
	}
</script>

<section class="space-y-6">
	<header class="flex flex-col gap-4 border-b border-slate-200/80 pb-5 lg:flex-row lg:items-end lg:justify-between">
		<div>
			<p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Integrations</p>
			<h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Task API integrations</h1>
			<p class="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
				Register external systems that can create internal tasks through the API. Each integration gets its own token and internal owner.
			</p>
		</div>
	</header>

	{#if data.errorMessage}
		<div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
			{data.errorMessage}
		</div>
	{/if}

	{#if form?.message}
		<div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
			{form.message}
		</div>
	{/if}

	{#if form?.success && form?.token}
		<div class="rounded-[1.7rem] border border-emerald-200 bg-emerald-50 px-5 py-4">
			<p class="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">Token created</p>
			<p class="mt-2 text-sm text-emerald-800">
				Copy this API token now. It will not be shown again after this response.
			</p>
			<pre class="mt-3 overflow-x-auto rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950">{form.token}</pre>
		</div>
	{/if}

	<div class="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
		<form method="POST" class="rounded-[1.9rem] border border-slate-200 bg-white p-5">
			<div>
				<p class="text-lg font-semibold tracking-tight text-slate-950">New integration</p>
				<p class="mt-2 text-sm leading-7 text-slate-600">
					Choose which internal user should own tasks created by this integration and grant the minimum permissions it needs.
				</p>
			</div>

			<div class="mt-5 space-y-5">
				<div>
					<label for="name" class="block text-sm font-semibold text-slate-800">Integration name</label>
					<input
						id="name"
						name="name"
						type="text"
						value={form?.values?.name ?? ''}
						class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300"
						placeholder="Customer site production"
					/>
					{#if form?.errors?.name}
						<p class="mt-2 text-sm text-rose-600">{form.errors.name}</p>
					{/if}
				</div>

				<div>
					<label for="kind" class="block text-sm font-semibold text-slate-800">Source type label</label>
					<input
						id="kind"
						name="kind"
						type="text"
						value={form?.values?.kind ?? 'external'}
						class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300"
						placeholder="customer-site"
					/>
				</div>

				<div>
					<label for="actorUserId" class="block text-sm font-semibold text-slate-800">Internal owner</label>
					<select
						id="actorUserId"
						name="actorUserId"
						class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300"
						value={form?.values?.actorUserId ?? ''}
					>
						<option value="">Select a local user</option>
						{#each data.users as user}
							<option value={user.id}>{user.name} ({user.email})</option>
						{/each}
					</select>
					{#if form?.errors?.actorUserId}
						<p class="mt-2 text-sm text-rose-600">{form.errors.actorUserId}</p>
					{/if}
				</div>

				<fieldset>
					<legend class="block text-sm font-semibold text-slate-800">Permissions</legend>
					<div class="mt-3 space-y-3">
						{#each data.permissions as permission}
							<label class="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
								<input type="checkbox" name="permissions" value={permission} checked={isChecked(permission)} class="h-4 w-4 rounded border-slate-300 text-slate-950" />
								<span>{permission}</span>
							</label>
						{/each}
					</div>
					{#if form?.errors?.permissions}
						<p class="mt-2 text-sm text-rose-600">{form.errors.permissions}</p>
					{/if}
				</fieldset>

				<div class="flex justify-end">
					<button type="submit" class="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
						Create integration
					</button>
				</div>
			</div>
		</form>

		<div class="overflow-hidden rounded-[1.9rem] border border-slate-200 bg-white">
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-slate-200 text-sm">
					<thead class="bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
						<tr>
							<th class="px-5 py-4">Integration</th>
							<th class="px-5 py-4">Permissions</th>
							<th class="px-5 py-4">Token</th>
							<th class="px-5 py-4">Last used</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100">
						{#if data.integrations.length === 0}
							<tr>
								<td colspan="4" class="px-5 py-10 text-center text-sm text-slate-500">
									No integrations have been created yet.
								</td>
							</tr>
						{:else}
							{#each data.integrations as integration}
								<tr class="bg-white align-top">
									<td class="px-5 py-4">
										<p class="font-semibold text-slate-950">{integration.name}</p>
										<p class="mt-1 text-xs text-slate-400">{integration.kind} · {integration.status}</p>
									</td>
									<td class="px-5 py-4 text-slate-600">{integration.permissions.join(', ')}</td>
									<td class="px-5 py-4 text-slate-500">{integration.tokenHint}</td>
									<td class="px-5 py-4 text-slate-500">{formatDate(integration.lastUsedAt)}</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	</div>
</section>