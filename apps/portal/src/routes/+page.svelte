<script>
	import { PortalEmptyState } from '@aionsoft/ui';
</script>

<svelte:head>
	<title>Aionsoft Portal</title>
	<meta
		name="description"
		content="Portal scaffold for internal workflows and future product features."
	/>
</svelte:head>

<main class="min-h-screen bg-[radial-gradient(circle_at_top,#e0f2fe_0%,#f8fafc_35%,#f8fafc_100%)] px-6 py-16">
	<div class="mx-auto grid max-w-5xl gap-8">
		<PortalEmptyState />

		<section class="grid gap-4 md:grid-cols-3">
			<article class="rounded-2xl border border-white/70 bg-white/80 p-6 backdrop-blur">
				<h2 class="text-lg font-bold text-slate-950">Workspace ready</h2>
				<p class="mt-3 text-sm leading-6 text-slate-600">This app has its own SvelteKit runtime, build, preview, and Docker entrypoint surface.</p>
			</article>
			<article class="rounded-2xl border border-white/70 bg-white/80 p-6 backdrop-blur">
				<h2 class="text-lg font-bold text-slate-950">Shared packages wired</h2>
				<p class="mt-3 text-sm leading-6 text-slate-600">Use `@aionsoft/ui`, `@aionsoft/shared`, and `@aionsoft/config` for cross-app code instead of relative imports.</p>
			</article>
			<article class="rounded-2xl border border-white/70 bg-white/80 p-6 backdrop-blur">
				<h2 class="text-lg font-bold text-slate-950">Feature space open</h2>
				<p class="mt-3 text-sm leading-6 text-slate-600">Authentication, admin workflows, dashboards, and internal tools can now be added without coupling them to the website app.</p>
			</article>
		</section>
	</div>
</main>