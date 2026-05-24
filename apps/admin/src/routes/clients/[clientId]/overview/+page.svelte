<script>
	let { data } = $props();

	let actionsOpen = $state(false);

	function formatDate(value) {
		if (!value) {
			return 'Not available';
		}

		return new Intl.DateTimeFormat('en-US', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(value));
	}

	function getPrimaryContact() {
		return data.client.contacts.find((contact) => contact.isPrimary) ?? data.client.contacts[0] ?? null;
	}

	function toggleActions() {
		actionsOpen = !actionsOpen;
	}
</script>

<section class="space-y-6">
	<header class="flex flex-col gap-4 border-b border-slate-200/80 pb-5 lg:flex-row lg:items-end lg:justify-between">
		<div>
			<p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Profile</p>
			<h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{data.client.companyName}</h1>
			<p class="mt-2 text-sm leading-7 text-slate-600">
				Review company details and contact coverage, then jump into editing when changes are needed.
			</p>
		</div>

		<div class="relative">
			<button
				type="button"
				class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
				onclick={toggleActions}
				aria-haspopup="menu"
				aria-expanded={actionsOpen}
				aria-label="Client profile actions"
				title="Client profile actions"
			>
				<svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
					<path d="M10 4.25a1.25 1.25 0 1 0 0 .001V4.25Zm0 4.5a1.25 1.25 0 1 0 0 .001V8.75Zm0 4.5a1.25 1.25 0 1 0 0 .001v-.001Z" fill="currentColor" />
				</svg>
			</button>

			{#if actionsOpen}
				<button type="button" class="fixed inset-0 z-10" onclick={() => (actionsOpen = false)} aria-label="Close profile actions menu"></button>

				<div class="absolute right-0 top-[calc(100%+0.6rem)] z-20 w-52 rounded-[1.3rem] border border-slate-200 bg-white p-2 shadow-[0_32px_80px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-950/5">
					<a href={`/clients/${data.client.id}/edit`} class="flex items-center gap-3 rounded-[1rem] px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950" onclick={() => (actionsOpen = false)}>
						<svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
							<path d="M4.75 13.5V15.25H6.5l7.22-7.22-1.75-1.75L4.75 13.5Zm10.44-6.28a1.24 1.24 0 0 0 0-1.75l-.66-.66a1.24 1.24 0 0 0-1.75 0l-.74.74 1.75 1.75.74-.08Z" fill="currentColor" />
						</svg>
						<span>Edit client</span>
					</a>

					<a href={`/clients/${data.client.id}/contacts/new`} class="flex items-center gap-3 rounded-[1rem] px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950" onclick={() => (actionsOpen = false)}>
						<svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
							<path d="M10 4.25v11.5M4.25 10h11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
						</svg>
						<span>Add contact</span>
					</a>
				</div>
			{/if}
		</div>
	</header>

	{#if data.notice}
		<div class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
			{data.notice}
		</div>
	{/if}

	<div class="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)]">
		<section class="rounded-[1.9rem] border border-slate-200 bg-white p-6">
			<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Company details</p>
			<dl class="mt-5 grid gap-5 sm:grid-cols-2">
				<div>
					<dt class="text-sm font-medium text-slate-500">Website</dt>
					<dd class="mt-2 text-sm text-slate-950">
						{#if data.client.website}
							<a href={data.client.website} target="_blank" rel="noreferrer" class="transition hover:text-slate-700 hover:underline">
								{data.client.website}
							</a>
						{:else}
							No website
						{/if}
					</dd>
				</div>

				<div>
					<dt class="text-sm font-medium text-slate-500">Phone</dt>
					<dd class="mt-2 text-sm text-slate-950">{data.client.phone || 'No phone'}</dd>
				</div>

				<div class="sm:col-span-2">
					<dt class="text-sm font-medium text-slate-500">Address</dt>
					<dd class="mt-2 whitespace-pre-line text-sm text-slate-950">{data.client.address || 'No address'}</dd>
				</div>

				<div>
					<dt class="text-sm font-medium text-slate-500">Created</dt>
					<dd class="mt-2 text-sm text-slate-950">{formatDate(data.client.createdAt)}</dd>
				</div>

				<div>
					<dt class="text-sm font-medium text-slate-500">Updated</dt>
					<dd class="mt-2 text-sm text-slate-950">{formatDate(data.client.updatedAt ?? data.client.createdAt)}</dd>
				</div>
			</dl>
		</section>

		<section class="rounded-[1.9rem] border border-slate-200 bg-slate-50/80 p-6">
			<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Primary contact</p>
			{#if getPrimaryContact()}
				<div class="mt-5 rounded-[1.5rem] border border-slate-200 bg-white p-5">
					<p class="text-lg font-semibold tracking-tight text-slate-950">{getPrimaryContact().name}</p>
					<p class="mt-1 text-sm text-slate-500">{getPrimaryContact().title || 'No title'}</p>
					<dl class="mt-5 space-y-4 text-sm">
						<div>
							<dt class="font-medium text-slate-500">Email</dt>
							<dd class="mt-1 text-slate-950">{getPrimaryContact().email || 'No email'}</dd>
						</div>
						<div>
							<dt class="font-medium text-slate-500">Phone</dt>
							<dd class="mt-1 text-slate-950">{getPrimaryContact().phone || 'No phone'}</dd>
						</div>
						<div>
							<dt class="font-medium text-slate-500">Extension</dt>
							<dd class="mt-1 text-slate-950">{getPrimaryContact().extension || 'No extension'}</dd>
						</div>
					</dl>
				</div>
			{:else}
				<div class="mt-5 rounded-[1.5rem] border border-slate-200 bg-white p-5 text-sm text-slate-500">
					No primary contact is configured.
				</div>
			{/if}
		</section>
	</div>

	<section class="rounded-[1.9rem] border border-slate-200 bg-white">
		<div class="border-b border-slate-200/80 px-6 py-5">
			<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Contacts</p>
			<h2 class="mt-2 text-xl font-semibold tracking-tight text-slate-950">All client contacts</h2>
		</div>

		<div class="divide-y divide-slate-100">
			{#each data.client.contacts as contact}
				<div class="grid gap-4 px-6 py-5 sm:grid-cols-[minmax(0,1.1fr)_repeat(3,minmax(0,0.9fr))_auto] sm:items-start">
					<div>
						<div class="flex flex-wrap items-center gap-2">
							<p class="font-semibold text-slate-950">{contact.name}</p>
							{#if contact.isPrimary}
								<span class="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">Primary</span>
							{/if}
						</div>
						<p class="mt-1 text-sm text-slate-500">{contact.title || 'No title'}</p>
					</div>

					<div>
						<p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Email</p>
						<p class="mt-2 text-sm text-slate-950">{contact.email || 'No email'}</p>
					</div>

					<div>
						<p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Phone</p>
						<p class="mt-2 text-sm text-slate-950">{contact.phone || 'No phone'}</p>
					</div>

					<div>
						<p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Extension</p>
						<p class="mt-2 text-sm text-slate-950">{contact.extension || 'No extension'}</p>
					</div>

					<div class="sm:text-right">
						<a href={`/clients/${data.client.id}/contacts/${contact.id}/edit`} class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950">
							Edit
						</a>
					</div>
				</div>
			{/each}
		</div>
	</section>
</section>