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

	function isChecked(permission) {
		return (values().permissions ?? ['tasks:create']).includes(permission);
	}

	function editDrawerOpen() {
		return Boolean(page.url.searchParams.get('edit')) || form?.intent === 'edit';
	}

	function drawerOpen() {
		return page.url.searchParams.get('new') === '1' || editDrawerOpen() || form?.intent === 'create';
	}

	function drawerHref(open) {
		const url = new URL(page.url);

		if (open) {
			url.searchParams.set('new', '1');
			url.searchParams.delete('edit');
		} else {
			url.searchParams.delete('new');
			url.searchParams.delete('edit');
		}

		const search = url.searchParams.toString();
		return `${url.pathname}${search ? `?${search}` : ''}`;
	}

	function editDrawerHref(integrationId) {
		const url = new URL(page.url);
		url.searchParams.set('edit', integrationId);
		url.searchParams.delete('new');
		const search = url.searchParams.toString();
		return `${url.pathname}${search ? `?${search}` : ''}`;
	}

	function values() {
		if (form?.intent === 'create' || form?.intent === 'edit') {
			return form?.values ?? {};
		}

		if (editDrawerOpen()) {
			return data.editingIntegration ?? {};
		}

		return {};
	}

	function errors() {
		return form?.errors ?? {};
	}

	function taskAccessScopeValue() {
		return values().taskAccessScope ?? 'own';
	}

	function allowedTaskTagsValue() {
		const sourceValue = values().allowedTaskTags;

		if (Array.isArray(sourceValue)) {
			return sourceValue.join(', ');
		}

		return sourceValue ?? '';
	}

	function taskAccessScopeLabel(value) {
		if (value === 'all') {
			return 'All tasks';
		}

		if (value === 'tags') {
			return 'Specific tags';
		}

		return 'Own tasks only';
	}

	function drawerTitle() {
		return editDrawerOpen() ? 'Edit API entry' : 'Create API entry';
	}

	function drawerDescription() {
		return editDrawerOpen()
			? 'Update permissions and task visibility for this integration without rotating its token.'
			: 'Choose which internal user should own tasks created by this integration and grant the minimum permissions it needs.';
	}

	function drawerAction() {
		return editDrawerOpen() ? '?/edit' : '?/create';
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
		<a href={drawerHref(true)} class="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
			New API entry
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

	<div class="overflow-hidden rounded-[1.9rem] border border-slate-200 bg-white">
		<div class="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5">
			<div>
				<p class="text-lg font-semibold tracking-tight text-slate-950">API entries</p>
				<p class="mt-2 text-sm leading-7 text-slate-600">
					Review integrations that can authenticate against the task API and see their current permissions and usage hints.
				</p>
			</div>
			<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{data.integrations.length} entries</span>
		</div>

		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-slate-200 text-sm">
				<thead class="bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
					<tr>
						<th class="px-5 py-4">Integration</th>
						<th class="px-5 py-4">Permissions</th>
						<th class="px-5 py-4">Scope</th>
						<th class="px-5 py-4">Token</th>
						<th class="px-5 py-4">Last used</th>
						<th class="px-5 py-4 text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100">
					{#if data.integrations.length === 0}
						<tr>
							<td colspan="6" class="px-5 py-10 text-center text-sm text-slate-500">
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
								<td class="px-5 py-4 text-slate-600">
									<p>{taskAccessScopeLabel(integration.taskAccessScope)}</p>
									{#if integration.taskAccessScope === 'tags' && integration.allowedTaskTags.length > 0}
										<p class="mt-1 text-xs text-slate-400">{integration.allowedTaskTags.join(', ')}</p>
									{/if}
								</td>
								<td class="px-5 py-4 text-slate-500">{integration.tokenHint}</td>
								<td class="px-5 py-4 text-slate-500">{formatDate(integration.lastUsedAt)}</td>
								<td class="px-5 py-4 text-right">
									<a href={editDrawerHref(integration.id)} class="inline-flex items-center rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950">
										Edit
									</a>
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
			<a href={drawerHref(false)} class="absolute inset-0 bg-slate-950/35 backdrop-blur-[3px]" aria-label={editDrawerOpen() ? 'Close edit API entry drawer' : 'Close new API entry drawer'} in:fade={{ duration: 180 }} out:fade={{ duration: 140 }}></a>

			<div class="absolute inset-y-0 right-0 w-full bg-white shadow-[-24px_0_80px_-48px_rgba(15,23,42,0.55)] sm:max-w-2xl lg:w-[40vw] lg:max-w-none lg:min-w-[32rem]" in:fly={{ x: 96, duration: 220, opacity: 1 }} out:fly={{ x: 96, duration: 180, opacity: 1 }}>
				<section class="flex h-full flex-col bg-white">
					<div class="border-b border-slate-200 px-5 py-5 sm:px-6">
						<div class="flex items-start justify-between gap-4">
							<div>
								<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Integrations</p>
								<h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{drawerTitle()}</h2>
								<p class="mt-2 text-sm leading-6 text-slate-600">{drawerDescription()}</p>
							</div>
							<a href={drawerHref(false)} class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950">
								Close
							</a>
						</div>
					</div>

					<form method="POST" action={drawerAction()} class="flex min-h-0 flex-1 flex-col">
						{#if editDrawerOpen()}
							<input type="hidden" name="integrationId" value={form?.integrationId ?? data.editingIntegration?.id ?? ''} />
						{/if}
						<div class="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
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

							{#if editDrawerOpen()}
								<div class="rounded-[1.7rem] border border-slate-200 bg-slate-50/80 px-5 py-4">
									<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Integration</p>
									<p class="mt-2 text-lg font-semibold text-slate-950">{data.editingIntegration?.name ?? 'Unknown integration'}</p>
									<p class="mt-1 text-sm text-slate-500">{data.editingIntegration?.kind ?? 'external'} · {data.editingIntegration?.status ?? 'active'}</p>
								</div>
							{:else}
								<div>
									<label for="name" class="block text-sm font-semibold text-slate-800">Integration name</label>
									<input
										id="name"
										name="name"
										type="text"
										value={values().name ?? ''}
										class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300"
										placeholder="Customer site production"
									/>
									{#if errors().name}
										<p class="mt-2 text-sm text-rose-600">{errors().name}</p>
									{/if}
								</div>

								<div>
									<label for="kind" class="block text-sm font-semibold text-slate-800">Source type label</label>
									<input
										id="kind"
										name="kind"
										type="text"
										value={values().kind ?? 'external'}
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
										value={values().actorUserId ?? ''}
									>
										<option value="">Select a local user</option>
										{#each data.users as user}
											<option value={user.id}>{user.name} ({user.email})</option>
										{/each}
									</select>
									{#if errors().actorUserId}
										<p class="mt-2 text-sm text-rose-600">{errors().actorUserId}</p>
									{/if}
								</div>
							{/if}

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
								{#if errors().permissions}
									<p class="mt-2 text-sm text-rose-600">{errors().permissions}</p>
								{/if}
							</fieldset>

							<div>
								<label for="taskAccessScope" class="block text-sm font-semibold text-slate-800">Task read scope</label>
								<select id="taskAccessScope" name="taskAccessScope" class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300" value={taskAccessScopeValue()}>
									<option value="own">Own tasks only</option>
									<option value="tags">Tasks with specific tags</option>
									<option value="all">All tasks</option>
								</select>
								<p class="mt-2 text-xs text-slate-500">
									{#if taskAccessScopeValue() === 'all'}
										This token will be able to read any task exposed by the API.
									{:else if taskAccessScopeValue() === 'tags'}
										This token will only read tasks whose tags match one of the allowed task tags below.
									{:else}
										This token will only read tasks created by this integration.
									{/if}
								</p>
							</div>

							{#if taskAccessScopeValue() === 'tags'}
								<div>
									<label for="allowedTaskTags" class="block text-sm font-semibold text-slate-800">Allowed task tags</label>
									<input id="allowedTaskTags" name="allowedTaskTags" type="text" value={allowedTaskTagsValue()} class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300" placeholder="customer-a, support, billing" />
									<p class="mt-2 text-xs text-slate-500">Separate tags with commas. They are normalized and matched against task tag keys.</p>
									{#if errors().allowedTaskTags}
										<p class="mt-2 text-sm text-rose-600">{errors().allowedTaskTags}</p>
									{/if}
								</div>
							{/if}
						</div>

						<div class="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 px-5 py-4 sm:px-6">
							<a href={drawerHref(false)} class="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950">
								Cancel
							</a>
							<button type="submit" class="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
								{editDrawerOpen() ? 'Update integration' : 'Create integration'}
							</button>
						</div>
					</form>
				</section>
			</div>
		</div>
	{/if}
</section>