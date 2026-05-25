<script>
	let {
		form,
		site = null,
		mode = 'create',
		backHref = '/monitoring/sites',
		backLabel = 'Back to sites'
	} = $props();

	function values() {
		return form?.values ?? site ?? {};
	}

	function errors() {
		return form?.errors ?? {};
	}
</script>

<section class="rounded-[1.9rem] border border-slate-200 bg-slate-50/70 p-6 sm:p-8">
	<div class="flex flex-col gap-3 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Monitoring</p>
			<h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{mode === 'edit' ? 'Edit site' : 'Add site'}</h2>
			<p class="mt-2 text-sm leading-7 text-slate-600">
				{mode === 'edit'
					? 'Update the saved monitoring link and return to the sites catalog with the latest details.'
					: 'Register a monitoring URL so the team can open dashboards and status pages from the admin workspace.'}
			</p>
		</div>

		<a href={backHref} class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950">
			{backLabel}
		</a>
	</div>

	<form method="POST" class="mt-6 space-y-6 rounded-[1.7rem] border border-white bg-white/90 p-6">
		{#if form?.message}
			<div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
				{form.message}
			</div>
		{/if}

		<div class="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
			<div>
				<label class="block text-sm font-medium text-slate-700" for="name">Site name</label>
				<input id="name" name="name" value={values().name ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white" placeholder="Production Grafana" />
				{#if errors().name}
					<p class="mt-2 text-sm text-rose-600">{errors().name}</p>
				{/if}
			</div>

			<div>
				<label class="block text-sm font-medium text-slate-700" for="url">URL</label>
				<input id="url" name="url" type="url" value={values().url ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white" placeholder="https://grafana.example.com" />
				{#if errors().url}
					<p class="mt-2 text-sm text-rose-600">{errors().url}</p>
				{/if}
			</div>

			<div class="lg:col-span-2">
				<label class="block text-sm font-medium text-slate-700" for="description">Description</label>
				<textarea id="description" name="description" rows="5" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white" placeholder="Primary observability workspace for production systems, alerts, and service dashboards.">{values().description ?? ''}</textarea>
			</div>
		</div>

		<div class="flex flex-wrap items-center justify-end gap-3 pt-2">
			<a href={backHref} class="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950">
				Cancel
			</a>
			<button class="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
				{mode === 'edit' ? 'Update site' : 'Save site'}
			</button>
		</div>
	</form>
</section>