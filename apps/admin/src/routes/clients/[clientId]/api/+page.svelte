<script>
	import { page } from '$app/state';
	import { fade, fly } from 'svelte/transition';

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

	function drawerOpen() {
		return page.url.searchParams.get('new') === '1' || form?.intent === 'create';
	}

	function drawerHref(open) {
		const url = new URL(page.url);

		if (open) {
			url.searchParams.set('new', '1');
		} else {
			url.searchParams.delete('new');
		}

		const search = url.searchParams.toString();
		return `${url.pathname}${search ? `?${search}` : ''}`;
	}

	function values() {
		return form?.values ?? {};
	}

	function errors() {
		return form?.errors ?? {};
	}

	function isChecked(permission) {
		return (values().permissions ?? ['tasks:read']).includes(permission);
	}

	function statusBadgeClass(status) {
		return status === 'revoked'
			? 'bg-rose-50 text-rose-700'
			: 'bg-emerald-50 text-emerald-700';
	}

	function permissionLabel(permission) {
		if (permission === 'invoices:read') {
			return 'Invoices read';
		}

		return 'Tasks read';
	}
</script>

<section class="space-y-6">
	<div class="flex justify-end">
		<a href={drawerHref(true)} class="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
			New token
		</a>
	</div>

	{#if form?.success && form?.token}
		<div class="rounded-[1.7rem] border border-emerald-200 bg-emerald-50 px-5 py-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
			<p class="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600 dark:text-emerald-300">One-time secret</p>
			<p class="mt-2 text-sm text-emerald-800 dark:text-emerald-200">
				{form.notice ?? 'Copy this client API token now. It will not be shown again after this response.'}
			</p>
			<pre class="mt-3 overflow-x-auto rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 dark:bg-slate-900 dark:text-slate-100">{form.token}</pre>
		</div>
	{:else if form?.notice}
		<div class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
			{form.notice}
		</div>
	{/if}

	<div class="overflow-hidden rounded-[1.9rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/92">
		<div class="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 dark:border-white/10">
			<div>
				<p class="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">Client API tokens</p>
				<p class="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-400">
					Use separate tokens for production, staging, or different embedded surfaces. Rotating a token issues a new secret and reactivates the entry.
				</p>
			</div>
			<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-white/8 dark:text-slate-300">{data.apiTokens.length} tokens</span>
		</div>

		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
				<thead class="bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:bg-white/5 dark:text-slate-500">
					<tr>
						<th class="px-5 py-4">Token</th>
						<th class="px-5 py-4">Permissions</th>
						<th class="px-5 py-4">Status</th>
						<th class="px-5 py-4">Last used</th>
						<th class="px-5 py-4">Created</th>
						<th class="px-5 py-4 text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100 dark:divide-white/5">
					{#if data.apiTokens.length === 0}
						<tr>
							<td colspan="6" class="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
								No client API tokens have been created yet.
							</td>
						</tr>
					{:else}
						{#each data.apiTokens as tokenRecord}
							<tr class="bg-white align-top dark:bg-slate-900/92">
								<td class="px-5 py-4">
									<p class="font-semibold text-slate-950 dark:text-white">{tokenRecord.name}</p>
									<p class="mt-1 text-xs text-slate-400">{tokenRecord.tokenHint}</p>
								</td>
								<td class="px-5 py-4 text-slate-600 dark:text-slate-400">
									{tokenRecord.permissions.map(permissionLabel).join(', ')}
								</td>
								<td class="px-5 py-4">
										<span class={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(tokenRecord.status)} dark:bg-opacity-20 dark:text-white`}>
											{tokenRecord.status}
										</span>
								</td>
								<td class="px-5 py-4 text-slate-500 dark:text-slate-400">{formatDate(tokenRecord.lastUsedAt)}</td>
								<td class="px-5 py-4 text-slate-500 dark:text-slate-400">{formatDate(tokenRecord.createdAt)}</td>
								<td class="px-5 py-4 text-right">
									<div class="flex justify-end gap-2">
										<form method="POST" action="?/rotate">
											<input type="hidden" name="tokenId" value={tokenRecord.id} />
										<button class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white">
											Rotate
										</button>
									</form>

									{#if tokenRecord.status !== 'revoked'}
										<form method="POST" action="?/revoke">
											<input type="hidden" name="tokenId" value={tokenRecord.id} />
											<button class="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:text-rose-800 dark:border-rose-500/20 dark:text-rose-300 dark:hover:border-rose-500/40 dark:hover:text-rose-200">
													Revoke
												</button>
											</form>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>

	{#if drawerOpen()}
		<div class="fixed inset-0 z-50">
			<a href={drawerHref(false)} class="absolute inset-0 bg-slate-950/35 backdrop-blur-[3px]" aria-label="Close new token drawer" in:fade={{ duration: 180 }} out:fade={{ duration: 140 }}></a>

			<div class="absolute inset-y-0 right-0 w-full bg-white shadow-[-24px_0_80px_-48px_rgba(15,23,42,0.55)] dark:bg-slate-950 dark:shadow-[-24px_0_80px_-48px_rgba(2,6,23,0.85)] sm:max-w-2xl lg:w-[40vw] lg:max-w-none lg:min-w-[32rem]" in:fly={{ x: 96, duration: 220, opacity: 1 }} out:fly={{ x: 96, duration: 180, opacity: 1 }}>
				<section class="flex h-full flex-col bg-white dark:bg-slate-950">
					<div class="border-b border-slate-200 px-5 py-5 dark:border-white/10 sm:px-6">
						<div class="flex items-start justify-between gap-4">
							<div>
								<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">API</p>
								<h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Create client token</h2>
								<p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
									Issue a token for this client's hosted site, widget, or server integration. The token is always scoped to this client audience.
								</p>
							</div>
							<a href={drawerHref(false)} class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white">
								Close
							</a>
						</div>
					</div>

					<form method="POST" action="?/create" class="flex min-h-0 flex-1 flex-col">
						<div class="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
							{#if form?.message}
								<div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
									{form.message}
								</div>
							{/if}

							{#if form?.success && form?.token}
								<div class="rounded-[1.7rem] border border-emerald-200 bg-emerald-50 px-5 py-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
									<p class="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600 dark:text-emerald-300">Token created</p>
									<p class="mt-2 text-sm text-emerald-800 dark:text-emerald-200">Copy this API token now. It will not be shown again after this response.</p>
									<pre class="mt-3 overflow-x-auto rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 dark:bg-slate-900 dark:text-slate-100">{form.token}</pre>
								</div>
							{/if}

							<div>
								<label for="name" class="block text-sm font-semibold text-slate-800 dark:text-slate-200">Token name</label>
								<input id="name" name="name" type="text" value={values().name ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-sky-500/50" placeholder="Production site" />
								<p class="mt-2 text-xs text-slate-500 dark:text-slate-400">Use a label that matches the deployment or widget using this token.</p>
								{#if errors().name}
									<p class="mt-2 text-sm text-rose-600">{errors().name}</p>
								{/if}
							</div>

							<fieldset>
								<legend class="block text-sm font-semibold text-slate-800 dark:text-slate-200">Permissions</legend>
								<div class="mt-3 space-y-3">
									{#each data.permissions as permission}
										<label class="flex items-start gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:text-slate-300">
											<input type="checkbox" name="permissions" value={permission} checked={isChecked(permission)} class="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-950 dark:border-white/15 dark:bg-slate-900" />
											<span>
												<span class="block font-medium text-slate-950 dark:text-white">{permissionLabel(permission)}</span>
												<span class="mt-1 block text-xs text-slate-500 dark:text-slate-400">{permission}</span>
											</span>
										</label>
									{/each}
								</div>
								{#if errors().permissions}
									<p class="mt-2 text-sm text-rose-600">{errors().permissions}</p>
								{/if}
							</fieldset>
						</div>

						<div class="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 px-5 py-4 dark:border-white/10 sm:px-6">
							<a href={drawerHref(false)} class="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white">
								Cancel
							</a>
							<button type="submit" class="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100">
								Create token
							</button>
						</div>
					</form>
				</section>
			</div>
		</div>
	{/if}
</section>