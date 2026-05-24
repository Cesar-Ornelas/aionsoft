<script>
	let { form, publicMode = false } = $props();

	function values() {
		return form?.values ?? {};
	}

	function errors() {
		return form?.errors ?? {};
	}
</script>

<section class={`grid gap-6 ${publicMode ? 'xl:grid-cols-[1.05fr_0.95fr]' : 'xl:grid-cols-[1.05fr_0.95fr]'}`}>
	<div class="rounded-[1.9rem] border border-slate-200 bg-slate-50/80 p-6 sm:p-8">
		<p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">First run</p>
		<h2 class="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
			Register your organization and initial administrator.
		</h2>
		<p class="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
			The admin application stays in setup mode until an organization exists in Logto and the first app-local administrator is assigned. The initial user signs in with email credentials managed by Logto, while the admin role and permissions stay inside this app.
		</p>

		<div class="mt-8 grid gap-4 sm:grid-cols-2">
			<div class="rounded-2xl border border-white bg-white/90 p-5">
				<p class="text-sm font-semibold text-slate-950">What this creates</p>
				<ul class="mt-3 space-y-2 text-sm leading-6 text-slate-600">
					<li>One organization in Logto</li>
					<li>One initial user in Logto</li>
					<li>One local admin role with default security permissions</li>
				</ul>
			</div>
			<div class="rounded-2xl border border-white bg-white/90 p-5">
				<p class="text-sm font-semibold text-slate-950">Login model</p>
				<p class="mt-3 text-sm leading-6 text-slate-600">
					Users authenticate with email and password in Logto. Authorization for roles and permissions remains app-local.
				</p>
			</div>
		</div>
	</div>

	<form method="POST" class="rounded-[1.9rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-48px_rgba(15,23,42,0.75)] sm:p-8">
		<div class="flex items-center justify-between gap-4">
			<div>
				<p class="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Application Setup</p>
				<h3 class="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Create your first organization</h3>
			</div>
			<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">Required</span>
		</div>

		{#if form?.message}
			<div class="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
				{form.message}
			</div>
		{/if}

		<div class="mt-6 space-y-5">
			<div>
				<label class="block text-sm font-medium text-slate-700" for="organizationName">Organization name</label>
				<input
					id="organizationName"
					name="organizationName"
					value={values().organizationName ?? ''}
					class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-teal-400 focus:bg-white"
					placeholder="Aionsoft Operations"
				/>
				{#if errors().organizationName}
					<p class="mt-2 text-sm text-rose-600">{errors().organizationName}</p>
				{/if}
			</div>

			<div>
				<label class="block text-sm font-medium text-slate-700" for="organizationDescription">Organization description</label>
				<textarea
					id="organizationDescription"
					name="organizationDescription"
					rows="3"
					class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-teal-400 focus:bg-white"
					placeholder="Optional context for the customer, workspace, or internal team."
				>{values().organizationDescription ?? ''}</textarea>
			</div>

			<div class="grid gap-5 sm:grid-cols-2">
				<div>
					<label class="block text-sm font-medium text-slate-700" for="name">Administrator name</label>
					<input
						id="name"
						name="name"
						value={values().name ?? ''}
						class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-teal-400 focus:bg-white"
						placeholder="Cesar Ornelas"
					/>
					{#if errors().name}
						<p class="mt-2 text-sm text-rose-600">{errors().name}</p>
					{/if}
				</div>

				<div>
					<label class="block text-sm font-medium text-slate-700" for="email">Email</label>
					<input
						id="email"
						name="email"
						type="email"
						value={values().email ?? ''}
						class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-teal-400 focus:bg-white"
						placeholder="ops@aionsoft.io"
					/>
					{#if errors().email}
						<p class="mt-2 text-sm text-rose-600">{errors().email}</p>
					{/if}
				</div>
			</div>

			<div>
				<label class="block text-sm font-medium text-slate-700" for="password">Password</label>
				<input
					id="password"
					name="password"
					type="password"
					class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-teal-400 focus:bg-white"
					placeholder="Set the first admin password"
				/>
				{#if errors().password}
					<p class="mt-2 text-sm text-rose-600">{errors().password}</p>
				{/if}
			</div>
		</div>

		<div class="mt-8 flex flex-wrap items-center justify-between gap-3">
			<p class="text-sm text-slate-500">This only needs to be completed once per tenant.</p>
			<button class="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
				Initialize application
			</button>
		</div>
	</form>
</section>