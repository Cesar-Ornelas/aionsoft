<script>
	/** @type {{ data: { html: string } }} */
	let { data } = $props();
</script>

<svelte:head>
	<title>Terms of Service — Aionsoft</title>
</svelte:head>

<div class="bg-white text-zinc-950">
	<div class="mx-auto max-w-6xl px-6 pt-20 pb-24 md:pt-28 md:pb-32">
		<article class="prose prose-zinc prose-headings:text-zinc-950 prose-p:text-zinc-800 prose-li:text-zinc-800 prose-strong:text-zinc-950 prose-a:text-[var(--color-brand-primary)] max-w-none">
			{@html data.html}
		</article>
	</div>
</div>
