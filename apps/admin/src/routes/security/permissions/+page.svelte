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
						<th class="px-5 py-4">Key</th>
						<th class="px-5 py-4">Description</th>
						<th class="px-5 py-4">Updated</th>
						<th class="px-5 py-4 text-right">Action</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100">
					{#if data.permissions.length === 0}
						<tr>
							<td colspan="4" class="px-5 py-10 text-center text-sm text-slate-500">
								No permissions are available yet.
							</td>
						</tr>
					{:else}
						{#each data.permissions as permission}
							<tr class="bg-white">
								<td class="px-5 py-4 align-top">
									<p class="font-semibold text-slate-950">{permission.key}</p>
									<p class="mt-1 text-xs text-slate-400">{permission.id}</p>
								</td>
								<td class="px-5 py-4 align-top text-slate-600">{permission.description || 'No description'}</td>
								<td class="px-5 py-4 align-top text-slate-500">{formatDate(permission.updatedAt ?? permission.createdAt)}</td>
								<td class="px-5 py-4 text-right align-top">
									<a href={`/security/permissions/${permission.id}/edit`} class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950">
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