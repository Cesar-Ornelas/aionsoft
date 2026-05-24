<script>
	let { form, contact = null, mode = 'create', clientId, backHref, backLabel = 'Back to profile' } = $props();

	function values() {
		return form?.values ?? contact ?? {};
	}

	function errors() {
		return form?.errors ?? {};
	}
</script>

<section class="rounded-[1.9rem] border border-slate-200 bg-slate-50/70 p-6 sm:p-8">
	<div class="flex flex-col gap-3 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Clients</p>
			<h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{mode === 'edit' ? 'Edit contact' : 'Add contact'}</h2>
			<p class="mt-2 text-sm leading-7 text-slate-600">
				{mode === 'edit'
					? 'Update the selected client contact without leaving the client workspace.'
					: 'Add a new contact for this client and optionally make it the primary contact.'}
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

		<div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
			<div>
				<label class="block text-sm font-medium text-slate-700" for="name">Name</label>
				<input id="name" name="name" value={values().name ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white" placeholder="Jordan Lee" />
				{#if errors().name}
					<p class="mt-2 text-sm text-rose-600">{errors().name}</p>
				{/if}
			</div>

			<div>
				<label class="block text-sm font-medium text-slate-700" for="email">Email</label>
				<input id="email" name="email" type="email" value={values().email ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white" placeholder="jordan@northwind.example" />
			</div>

			<div>
				<label class="block text-sm font-medium text-slate-700" for="phone">Phone</label>
				<input id="phone" name="phone" value={values().phone ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white" placeholder="+1 (555) 010-2020" />
			</div>

			<div>
				<label class="block text-sm font-medium text-slate-700" for="extension">Extension</label>
				<input id="extension" name="extension" value={values().extension ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white" placeholder="204" />
			</div>

			<div class="sm:col-span-2 xl:col-span-2">
				<label class="block text-sm font-medium text-slate-700" for="title">Title</label>
				<input id="title" name="title" value={values().title ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white" placeholder="Operations Director" />
			</div>
		</div>

		<label class="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
			<input type="checkbox" name="isPrimary" checked={Boolean(values().isPrimary)} class="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-300" />
			<span>
				<span class="block font-semibold text-slate-950">Primary contact</span>
				<span class="mt-1 block text-slate-500">If selected, this contact becomes the primary contact for this client.</span>
			</span>
		</label>

		<div class="flex flex-wrap items-center justify-end gap-3 pt-2">
			<a href={backHref} class="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950">
				Cancel
			</a>
			<button class="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
				{mode === 'edit' ? 'Update contact' : 'Save contact'}
			</button>
		</div>
	</form>
</section>