<script>
	import SetupWorkspace from '$lib/components/SetupWorkspace.svelte';

	let { form } = $props();
</script>

<svelte:head>
	<title>Admin Setup</title>
	<meta name="description" content="Bootstrap the admin application with its first organization and administrator." />
</svelte:head>

<section class="space-y-6">
	<header class="rounded-[1.9rem] border border-sky-100 bg-[linear-gradient(135deg,#eff6ff,#ffffff_68%,#ecfeff)] px-6 py-8 shadow-[0_24px_60px_-48px_rgba(15,23,42,0.75)] sm:px-8">
		<p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Application Setup</p>
		<h1 class="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
			Bootstrap the admin workspace before first sign-in.
		</h1>
		<p class="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
			Use this route once to register the organization, create the first Logto user, and assign the default app-local admin role.
		</p>
	</header>

	<SetupWorkspace {form} publicMode={true} />
</section>