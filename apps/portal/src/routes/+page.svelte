<script>
	let { data } = $props();

	function getIdentityFields(user) {
		return [
			{ label: 'User ID', value: user?.sub },
			{ label: 'Name', value: user?.name },
			{ label: 'Username', value: user?.username },
			{ label: 'Email', value: user?.email }
		].filter(({ value }) => Boolean(value));
	}
</script>

<svelte:head>
	<title>Aionsoft Portal</title>
	<meta
		name="description"
		content="Authenticated portal for Aionsoft operators and product workflows."
	/>
</svelte:head>


<main class="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eff6ff_32%,#f8fafc_100%)] px-6 py-16 text-slate-950">
	<div class="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.4fr_0.9fr]">
		<section class="rounded-[2rem] border border-sky-100/80 bg-white/90 p-8 shadow-[0_30px_80px_-50px_rgba(14,116,144,0.45)] backdrop-blur">
			<p class="text-xs font-semibold uppercase tracking-[0.32em] text-sky-700">Portal Access</p>
			<h1 class="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
				Authenticated workspace ready for internal operations.
			</h1>
			<p class="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
				This first milestone verifies the Logto session, protects the portal root on the server,
				and establishes the runtime contract for future product tooling.
			</p>

			<div class="mt-10 grid gap-4 md:grid-cols-2">
				<article class="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
					<p class="text-sm font-semibold text-slate-950">Session status</p>
					<p class="mt-2 text-sm leading-6 text-slate-600">
						The root route is only rendered after the Logto session is present in the server request.
					</p>
				</article>
				<article class="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
					<p class="text-sm font-semibold text-slate-950">Next integration step</p>
					<p class="mt-2 text-sm leading-6 text-slate-600">
						Database-backed user provisioning and management API calls can now be layered on top of the authenticated shell.
					</p>
				</article>
			</div>
		</section>

		<aside class="rounded-[2rem] border border-slate-200 bg-slate-950 p-8 text-slate-50 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.9)]">
			<div class="flex items-start justify-between gap-4">
				<div>
					<p class="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300">Authenticated</p>
					<h2 class="mt-3 text-2xl font-semibold">Portal session</h2>
				</div>
				<form method="POST" action="/auth/sign-out">
					<button
						type="submit"
						class="rounded-full border border-sky-400/40 px-4 py-2 text-sm font-medium text-sky-100 transition hover:border-sky-300 hover:bg-sky-400/10"
					>
						Sign out
					</button>
				</form>
			</div>

			<div class="mt-8 space-y-3">
				{#if getIdentityFields(data.user).length > 0}
					{#each getIdentityFields(data.user) as field}
						<div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
							<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{field.label}</p>
							<p class="mt-2 break-all text-sm text-slate-100">{field.value}</p>
						</div>
					{/each}
				{:else}
					<div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
						<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Identity</p>
						<p class="mt-2 text-sm text-slate-100">The current session is active, but no display claims were returned yet.</p>
					</div>
				{/if}
			</div>
		</aside>
	</div>
</main>