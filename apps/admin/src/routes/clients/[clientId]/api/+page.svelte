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
	<header class="flex flex-col gap-4 border-b border-slate-200/80 pb-5 lg:flex-row lg:items-end lg:justify-between">
		<div>
			<p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">API</p>
			<h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Client site access</h1>
			<p class="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
				Create client-bound API tokens for hosted sites and widgets. Every token is limited to this client's audience and only the permissions selected here.
			</p>
		</div>
		<a href={drawerHref(true)} class="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
			New token
		</a>
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
			<p class="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">One-time secret</p>
			<p class="mt-2 text-sm text-emerald-800">
				{form.notice ?? 'Copy this client API token now. It will not be shown again after this response.'}
			</p>
			<pre class="mt-3 overflow-x-auto rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950">{form.token}</pre>
		</div>
	{:else if form?.notice}
		<div class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
			{form.notice}
		</div>
	{/if}

	<div class="overflow-hidden rounded-[1.9rem] border border-slate-200 bg-white">
		<div class="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5">
			<div>
				<p class="text-lg font-semibold tracking-tight text-slate-950">Client API tokens</p>
				<p class="mt-2 text-sm leading-7 text-slate-600">
					Use separate tokens for production, staging, or different embedded surfaces. Rotating a token issues a new secret and reactivates the entry.
				</p>
			</div>
			<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{data.apiTokens.length} tokens</span>
		</div>

		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-slate-200 text-sm">
				<thead class="bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
					<tr>
						<th class="px-5 py-4">Token</th>
						<th class="px-5 py-4">Permissions</th>
						<th class="px-5 py-4">Status</th>
						<th class="px-5 py-4">Last used</th>
						<th class="px-5 py-4">Created</th>
						<th class="px-5 py-4 text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100">
					{#if data.apiTokens.length === 0}
						<tr>
							<td colspan="6" class="px-5 py-10 text-center text-sm text-slate-500">
								No client API tokens have been created yet.
							</td>
						</tr>
					{:else}
						{#each data.apiTokens as tokenRecord}
							<tr class="bg-white align-top">
								<td class="px-5 py-4">
									<p class="font-semibold text-slate-950">{tokenRecord.name}</p>
									<p class="mt-1 text-xs text-slate-400">{tokenRecord.tokenHint}</p>
								</td>
								<td class="px-5 py-4 text-slate-600">
									{tokenRecord.permissions.map(permissionLabel).join(', ')}
								</td>
								<td class="px-5 py-4">
									<span class={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(tokenRecord.status)}`}>
										{tokenRecord.status}
									</span>
								</td>
								<td class="px-5 py-4 text-slate-500">{formatDate(tokenRecord.lastUsedAt)}</td>
								<td class="px-5 py-4 text-slate-500">{formatDate(tokenRecord.createdAt)}</td>
								<td class="px-5 py-4 text-right">
									<div class="flex justify-end gap-2">
										<form method="POST" action="?/rotate">
											<input type="hidden" name="tokenId" value={tokenRecord.id} />
											<button class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950">
												Rotate
											</button>
										</form>

										{#if tokenRecord.status !== 'revoked'}
											<form method="POST" action="?/revoke">
												<input type="hidden" name="tokenId" value={tokenRecord.id} />
												<button class="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:text-rose-800">
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

			<div class="absolute inset-y-0 right-0 w-full bg-white shadow-[-24px_0_80px_-48px_rgba(15,23,42,0.55)] sm:max-w-2xl lg:w-[40vw] lg:max-w-none lg:min-w-[32rem]" in:fly={{ x: 96, duration: 220, opacity: 1 }} out:fly={{ x: 96, duration: 180, opacity: 1 }}>
				<section class="flex h-full flex-col bg-white">
					<div class="border-b border-slate-200 px-5 py-5 sm:px-6">
						<div class="flex items-start justify-between gap-4">
							<div>
								<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">API</p>
								<h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Create client token</h2>
								<p class="mt-2 text-sm leading-6 text-slate-600">
									Issue a token for this client's hosted site, widget, or server integration. The token is always scoped to this client audience.
								</p>
							</div>
							<a href={drawerHref(false)} class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950">
								Close
							</a>
						</div>
					</div>

					<form method="POST" action="?/create" class="flex min-h-0 flex-1 flex-col">
						<div class="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
							{#if form?.message}
								<div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
									{form.message}
								</div>
							{/if}

							{#if form?.success && form?.token}
								<div class="rounded-[1.7rem] border border-emerald-200 bg-emerald-50 px-5 py-4">
									<p class="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">Token created</p>
									<p class="mt-2 text-sm text-emerald-800">Copy this API token now. It will not be shown again after this response.</p>
									<pre class="mt-3 overflow-x-auto rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950">{form.token}</pre>
								</div>
							{/if}

							<div>
								<label for="name" class="block text-sm font-semibold text-slate-800">Token name</label>
								<input id="name" name="name" type="text" value={values().name ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300" placeholder="Production site" />
								<p class="mt-2 text-xs text-slate-500">Use a label that matches the deployment or widget using this token.</p>
								{#if errors().name}
									<p class="mt-2 text-sm text-rose-600">{errors().name}</p>
								{/if}
							</div>

							<fieldset>
								<legend class="block text-sm font-semibold text-slate-800">Permissions</legend>
								<div class="mt-3 space-y-3">
									{#each data.permissions as permission}
										<label class="flex items-start gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
											<input type="checkbox" name="permissions" value={permission} checked={isChecked(permission)} class="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-950" />
											<span>
												<span class="block font-medium text-slate-950">{permissionLabel(permission)}</span>
												<span class="mt-1 block text-xs text-slate-500">{permission}</span>
											</span>
										</label>
									{/each}
								</div>
								{#if errors().permissions}
									<p class="mt-2 text-sm text-rose-600">{errors().permissions}</p>
								{/if}
							</fieldset>
						</div>

						<div class="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 px-5 py-4 sm:px-6">
							<a href={drawerHref(false)} class="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950">
								Cancel
							</a>
							<button type="submit" class="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
								Create token
							</button>
						</div>
					</form>
				</section>
			</div>
		</div>
	{/if}
</section>