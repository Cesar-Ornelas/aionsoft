<script>
	let { data } = $props();

	function formatDate(value) {
		if (!value) {
			return 'Not available';
		}

		return new Intl.DateTimeFormat('en-US', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(value));
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

		<a href="/clients/new" class="inline-flex h-10 items-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800">
			Add client
		</a>
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
									<p class="font-semibold text-slate-950">{client.companyName}</p>
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
									<a href={`/clients/${client.id}/edit`} class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950">
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
</section>