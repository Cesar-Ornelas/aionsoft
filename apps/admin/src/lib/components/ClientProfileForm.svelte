<script>
	let { form, client, backHref, backLabel = 'Back' } = $props();

	function values() {
		return form?.values ?? client;
	}

	function errors() {
		return form?.errors ?? {};
	}
</script>

<section class="rounded-[1.9rem] border border-slate-200 bg-slate-50/70 p-6 sm:p-8">
	<div class="flex flex-col gap-3 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Clients</p>
			<h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Edit company profile</h2>
			<p class="mt-2 text-sm leading-7 text-slate-600">
				Update the core company details while keeping contact management on its own dedicated pages.
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

		<div class="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
			<div>
				<label class="block text-sm font-medium text-slate-700" for="companyName">Company name</label>
				<input id="companyName" name="companyName" value={values().companyName ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white" placeholder="Northwind Systems" />
				{#if errors().companyName}
					<p class="mt-2 text-sm text-rose-600">{errors().companyName}</p>
				{/if}
			</div>

			<div>
				<label class="block text-sm font-medium text-slate-700" for="phone">Company phone</label>
				<input id="phone" name="phone" value={values().phone ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white" placeholder="+1 (555) 010-2000" />
			</div>

			<div>
				<label class="block text-sm font-medium text-slate-700" for="website">Website</label>
				<input id="website" name="website" value={values().website ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white" placeholder="https://northwind.example" />
			</div>

			<div class="lg:row-span-2">
				<label class="block text-sm font-medium text-slate-700" for="address">Address</label>
				<textarea id="address" name="address" rows="5" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white" placeholder="123 Main Street, Suite 400&#10;Austin, TX 78701">{values().address ?? ''}</textarea>
			</div>
		</div>

		<div class="flex flex-wrap items-center justify-end gap-3 pt-2">
			<a href={backHref} class="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950">
				Cancel
			</a>
			<button class="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
				Update company
			</button>
		</div>
	</form>
</section>