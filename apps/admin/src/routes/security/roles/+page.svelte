<script>
	import { page } from '$app/state';
	import { fade, fly } from 'svelte/transition';

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
</script>

<section class="space-y-5">
	<div class="overflow-hidden rounded-[1.9rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/92">
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
				<thead class="bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:bg-white/5 dark:text-slate-500">
					<tr>
						<th class="px-5 py-4">Role</th>
						<th class="px-5 py-4">Description</th>
						<th class="px-5 py-4">Updated</th>
						<th class="px-5 py-4 text-right">Action</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100 dark:divide-white/5">
					{#if data.roles.length === 0}
						<tr>
							<td colspan="4" class="px-5 py-10 text-center text-sm text-slate-500">
								No roles are available yet.
							</td>
						</tr>
					{:else}
						{#each data.roles as role}
							<tr class="bg-white dark:bg-slate-900/92">
								<td class="px-5 py-4 align-top">
									<p class="font-semibold text-slate-950 dark:text-white">{role.name}</p>
									<p class="mt-1 text-xs text-slate-400">{role.id}</p>
								</td>
								<td class="px-5 py-4 align-top text-slate-600 dark:text-slate-400">{role.description || 'No description'}</td>
								<td class="px-5 py-4 align-top text-slate-500 dark:text-slate-400">{formatDate(role.updatedAt ?? role.createdAt)}</td>
								<td class="px-5 py-4 text-right align-top">
									<a href={`/security/roles/${role.id}/edit`} class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white">
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
			<a href={drawerHref(false)} class="absolute inset-0 bg-slate-950/35 backdrop-blur-[3px]" aria-label="Close new role dialog" in:fade={{ duration: 180 }} out:fade={{ duration: 140 }}></a>

			<div class="absolute inset-y-0 right-0 w-full bg-white shadow-[-24px_0_80px_-48px_rgba(15,23,42,0.55)] dark:bg-slate-950 dark:shadow-[-24px_0_80px_-48px_rgba(2,6,23,0.8)] sm:max-w-2xl lg:w-[40vw] lg:max-w-none lg:min-w-[32rem]" in:fly={{ x: 96, duration: 220, opacity: 1 }} out:fly={{ x: 96, duration: 180, opacity: 1 }}>
				<section class="flex h-full flex-col bg-white dark:bg-slate-950">
					<div class="border-b border-slate-200 px-5 py-5 dark:border-white/10 sm:px-6">
						<div>
							<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Roles</p>
							<h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Create a role</h2>
							<p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">Define a role without leaving the roles list.</p>
						</div>
					</div>

					<form method="POST" action="?/create" class="flex min-h-0 flex-1 flex-col">
						<div class="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
							{#if form?.message}
								<div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{form.message}</div>
							{/if}

							<div>
								<label class="block text-sm font-medium text-slate-700 dark:text-slate-300" for="name">Role name</label>
								<input id="name" name="name" value={values().name ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-teal-400 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-teal-500/40 dark:focus:bg-white/10" placeholder="Security Manager" />
								{#if errors().name}<p class="mt-2 text-sm text-rose-600">{errors().name}</p>{/if}
							</div>

							<div>
								<label class="block text-sm font-medium text-slate-700 dark:text-slate-300" for="description">Description</label>
								<textarea id="description" name="description" rows="4" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-teal-400 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-teal-500/40 dark:focus:bg-white/10" placeholder="Describe what this role is allowed to manage.">{values().description ?? ''}</textarea>
							</div>
						</div>

						<div class="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 px-5 py-4 dark:border-white/10 sm:px-6">
							<a href={drawerHref(false)} class="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white">Cancel</a>
							<button class="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">Save role</button>
						</div>
					</form>
				</section>
			</div>
		</div>
	{/if}
</section>