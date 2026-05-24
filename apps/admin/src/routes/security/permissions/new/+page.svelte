<script>
	let { form } = $props();

	function values() {
		return form?.values ?? {};
	}

	function errors() {
		return form?.errors ?? {};
	}
</script>

<section class="rounded-[1.9rem] border border-slate-200 bg-slate-50/70 p-6 sm:p-8">
	<div class="flex flex-col gap-3 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Permissions</p>
			<h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Create a permission</h2>
			<p class="mt-2 text-sm leading-7 text-slate-600">
				Permissions use a durable key format so they can be enforced on the server and reflected consistently in the UI.
			</p>
		</div>

		<a href="/security/permissions" class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950">
			Back to permissions
		</a>
	</div>

	<form method="POST" class="mt-6 space-y-5 rounded-[1.7rem] border border-white bg-white/90 p-6">
		{#if form?.message}
			<div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
				{form.message}
			</div>
		{/if}

		<div>
			<label class="block text-sm font-medium text-slate-700" for="key">Permission key</label>
			<input id="key" name="key" value={values().key ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white" placeholder="manage:users" />
			{#if errors().key}
				<p class="mt-2 text-sm text-rose-600">{errors().key}</p>
			{/if}
		</div>

		<div>
			<label class="block text-sm font-medium text-slate-700" for="description">Description</label>
			<textarea id="description" name="description" rows="4" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white" placeholder="Describe what this permission allows.">{values().description ?? ''}</textarea>
		</div>

		<div class="flex flex-wrap items-center justify-end gap-3 pt-2">
			<a href="/security/permissions" class="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950">
				Cancel
			</a>
			<button class="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
				Save permission
			</button>
		</div>
	</form>
</section>