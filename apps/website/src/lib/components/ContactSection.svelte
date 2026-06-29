<script>
	/** @type {{ form?: { success?: boolean, message?: string, error?: string, errors?: Record<string, string>, values?: Record<string, string> }, timestamp: number }} */
	let { form, timestamp } = $props();
</script>

<section id="contact" class="bg-zinc-950 py-20 text-white transition-colors dark:bg-black">
	<div class="mx-auto max-w-7xl px-6">
		<div class="grid gap-10 rounded-2xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/30 md:grid-cols-[0.9fr_1.1fr] md:p-12">
			<div>
				<p class="text-sm font-bold uppercase tracking-[0.2em] text-[var(--color-brand-pink)]">Start a conversation</p>
				<h2 class="mt-3 font-lexend text-4xl font-black tracking-tight">Tell us what you're trying to build.</h2>
				<p class="mt-4 text-zinc-300">Share your goals, current challenges, and what systems or website you need help with. We'll respond with next steps and a practical path forward.</p>

				<div class="mt-8 grid gap-3 text-sm text-zinc-300">
					<p><strong class="text-white">Good fit for:</strong> websites, portals, automations, integrations, reporting, and managed hosting.</p>
				</div>
			</div>

			<form method="POST" class="grid gap-4 rounded-xl bg-white p-5 text-zinc-950 transition-colors dark:border dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100">
				{#if form?.success}
					<p class="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{form.message}</p>
				{/if}

				{#if form?.error}
					<p class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{form.error}</p>
				{/if}

				<div class="sr-only" aria-hidden="true">
					<label for="website">Website</label>
					<input id="website" name="website" autocomplete="off" tabindex="-1" />
				</div>

				<input type="hidden" name="timestamp" value={timestamp} />

				<div>
					<input name="name" value={form?.values?.name ?? ''} class="w-full rounded-md border border-zinc-200 px-4 py-3 outline-none transition focus:border-[var(--color-brand-blue)] focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100" placeholder="Name" />
					{#if form?.errors?.name}<p class="mt-1 text-xs text-red-600">{form.errors.name}</p>{/if}
				</div>

				<div>
					<input name="email" type="email" value={form?.values?.email ?? ''} class="w-full rounded-md border border-zinc-200 px-4 py-3 outline-none transition focus:border-[var(--color-brand-blue)] focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100" placeholder="Email" />
					{#if form?.errors?.email}<p class="mt-1 text-xs text-red-600">{form.errors.email}</p>{/if}
				</div>

				<div>
					<select name="helpType" class="w-full rounded-md border border-zinc-200 px-4 py-3 outline-none transition focus:border-[var(--color-brand-blue)] focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100">
						<option selected={(form?.values?.helpType ?? '') === ''}>What do you need help with?</option>
						<option value="Custom software" selected={form?.values?.helpType === 'Custom software'}>Custom software</option>
						<option value="Website / hosting" selected={form?.values?.helpType === 'Website / hosting'}>Website / hosting</option>
						<option value="Automation / integrations" selected={form?.values?.helpType === 'Automation / integrations'}>Automation / integrations</option>
						<option value="Reporting / data" selected={form?.values?.helpType === 'Reporting / data'}>Reporting / data</option>
						<option value="Not sure yet" selected={form?.values?.helpType === 'Not sure yet'}>Not sure yet</option>
					</select>
					{#if form?.errors?.helpType}<p class="mt-1 text-xs text-red-600">{form.errors.helpType}</p>{/if}
				</div>

				<div>
					<textarea name="details" class="w-full rounded-md border border-zinc-200 px-4 py-3 outline-none transition focus:border-[var(--color-brand-blue)] focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100" rows="5" placeholder="Tell us about your project">{form?.values?.details ?? ''}</textarea>
					{#if form?.errors?.details}<p class="mt-1 text-xs text-red-600">{form.errors.details}</p>{/if}
				</div>

				<button class="rounded-md bg-zinc-950 px-4 py-3 font-bold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200">Send message</button>
				<p class="text-xs leading-5 text-zinc-500 dark:text-zinc-400">By submitting this form, you agree to be contacted about your project request.</p>
			</form>
		</div>
	</div>
</section>
