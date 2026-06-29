<script>
	/** @type {{ data: { html: string } }} */
	let { data } = $props();
</script>

<svelte:head>
	<title>Terms of Service — Aionsoft</title>
</svelte:head>

<div class="bg-white text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-zinc-100">
	<div class="mx-auto max-w-6xl px-6 pt-20 pb-24 md:pt-28 md:pb-32">
		<article class="prose prose-zinc max-w-none prose-headings:text-zinc-950 prose-p:text-zinc-800 prose-li:text-zinc-800 prose-strong:text-zinc-950 prose-a:text-[var(--color-brand-primary)] dark:prose-invert dark:prose-headings:text-zinc-100 dark:prose-p:text-zinc-300 dark:prose-li:text-zinc-300 dark:prose-strong:text-zinc-100 dark:prose-a:text-sky-300">
			{@html data.html}
		</article>
	</div>
</div>
