<script>
	let { data, form } = $props();

	let actionsOpen = $state(false);
	let importDialogOpen = $state(false);

	function formatDate(value) {
		if (!value) {
			return 'Not available';
		}

		return new Intl.DateTimeFormat('en-US', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(value));
	}

	function toggleActions() {
		actionsOpen = !actionsOpen;
	}

	function openImportDialog() {
		actionsOpen = false;
		importDialogOpen = true;
	}

	function closeImportDialog() {
		importDialogOpen = false;
	}
</script>

<section class="space-y-5">
	<header class="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Clients</p>
			<h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Companies and primary contacts</h1>
			<p class="mt-2 text-sm leading-7 text-slate-600">
				Manage customer records, store company details, and keep a primary point of contact for every client.
			</p>
		</div>

		<div class="flex flex-wrap items-center gap-3">
			<div class="relative">
				<button
					type="button"
					class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
					onclick={toggleActions}
					aria-haspopup="menu"
					aria-expanded={actionsOpen}
					aria-label="Client actions"
					title="Client actions"
				>
					<svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
						<path d="M5 10a1.25 1.25 0 1 0 0 .001V10Zm5 0a1.25 1.25 0 1 0 0 .001V10Zm5 0a1.25 1.25 0 1 0 0 .001V10Z" fill="currentColor" />
					</svg>
				</button>

				{#if actionsOpen}
					<button
						type="button"
						class="fixed inset-0 z-10"
						onclick={() => (actionsOpen = false)}
						aria-label="Close actions menu"
					></button>

					<div class="absolute right-0 top-[calc(100%+0.6rem)] z-20 w-52 rounded-[1.3rem] border border-slate-200 bg-white p-2 shadow-[0_32px_80px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-950/5">
						<a
							href="/clients/export"
							class="flex items-center gap-3 rounded-[1rem] px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
							onclick={() => (actionsOpen = false)}
						>
							<svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
								<path d="M10 3.75v8.5m0 0 3-3m-3 3-3-3M4.75 13.75v.5A1.75 1.75 0 0 0 6.5 16h7a1.75 1.75 0 0 0 1.75-1.75v-.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
							<span>Export JSON</span>
						</a>

						<button
							type="button"
							class="flex w-full items-center gap-3 rounded-[1rem] px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
							onclick={openImportDialog}
						>
							<svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
								<path d="M10 12.25v-8.5m0 0 3 3m-3-3-3 3m-2.25 7v.5A1.75 1.75 0 0 0 6.5 16h7a1.75 1.75 0 0 0 1.75-1.75v-.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
							<span>Import JSON</span>
						</button>
					</div>
				{/if}
			</div>

			<a href="/clients/new" class="inline-flex h-10 items-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800">
				Add client
			</a>
		</div>
	</header>

	{#if data.notice}
		<div class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
			{data.notice}
		</div>
	{/if}

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
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-slate-200 text-sm">
				<thead class="bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
					<tr>
						<th class="px-5 py-4">Company</th>
						<th class="px-5 py-4">Primary contact</th>
						<th class="px-5 py-4">Website</th>
						<th class="px-5 py-4">Phone</th>
						<th class="px-5 py-4">Updated</th>
						<th class="px-5 py-4 text-right">Action</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100">
					{#if data.clients.length === 0}
						<tr>
							<td colspan="6" class="px-5 py-10 text-center text-sm text-slate-500">
								No clients are available yet.
							</td>
						</tr>
					{:else}
						{#each data.clients as client}
							<tr class="bg-white">
								<td class="px-5 py-4 align-top">
									<a href={`/clients/${client.id}`} class="font-semibold text-slate-950 transition hover:text-slate-700 hover:underline">
										{client.companyName}
									</a>
									<p class="mt-1 text-xs text-slate-400">{client.id}</p>
								</td>
								<td class="px-5 py-4 align-top text-slate-600">
									{#if client.primaryContact}
										<p class="font-medium text-slate-950">{client.primaryContact.name}</p>
										<p class="mt-1 text-xs text-slate-500">{client.primaryContact.email || 'No email'}</p>
									{:else}
										No primary contact
									{/if}
								</td>
								<td class="px-5 py-4 align-top text-slate-600">
									{#if client.website}
										<a href={client.website} target="_blank" rel="noreferrer" class="transition hover:text-slate-950 hover:underline">
											{client.website}
										</a>
									{:else}
										No website
									{/if}
								</td>
								<td class="px-5 py-4 align-top text-slate-600">{client.phone || 'No phone'}</td>
								<td class="px-5 py-4 align-top text-slate-500">{formatDate(client.updatedAt ?? client.createdAt)}</td>
								<td class="px-5 py-4 text-right align-top">
									<a href={`/clients/${client.id}`} class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950">
										Open
									</a>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>

	{#if importDialogOpen}
		<div class="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6">
			<button
				type="button"
				class="absolute inset-0 bg-slate-950/30 backdrop-blur-[2px]"
				onclick={closeImportDialog}
				aria-label="Close import dialog"
			></button>

			<div class="relative z-10 w-full max-w-xl rounded-[1.8rem] border border-white/80 bg-white p-6 shadow-[0_32px_80px_-42px_rgba(15,23,42,0.45)] sm:p-7">
				<div class="flex items-start justify-between gap-4 border-b border-slate-200/80 pb-4">
					<div>
						<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Import</p>
						<h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Import clients JSON</h2>
						<p class="mt-2 text-sm leading-7 text-slate-600">
							Choose a previously exported JSON file. Imported records are added as new clients.
						</p>
					</div>

					<button
						type="button"
						class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-950"
						onclick={closeImportDialog}
						aria-label="Close import dialog"
					>
						<span aria-hidden="true">×</span>
					</button>
				</div>

				<form method="POST" action="?/import" enctype="multipart/form-data" class="mt-5 space-y-5">
					<div>
						<label class="block text-sm font-medium text-slate-700" for="client-import-file">Export file</label>
						<input
							id="client-import-file"
							type="file"
							name="file"
							accept="application/json,.json"
							class="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-slate-950 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
						/>
					</div>

					<div class="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800">
						This import is additive. Existing client records are not replaced.
					</div>

					<div class="flex flex-wrap items-center justify-end gap-3">
						<button
							type="button"
							class="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
							onclick={closeImportDialog}
						>
							Cancel
						</button>
						<button class="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
							Import clients
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</section>