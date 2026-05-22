<script>
	/** @type {{ title: string, theme?: 'light' | 'dark', children?: import('svelte').Snippet }} */
	let { title, theme = 'light', children } = $props();
</script>

<div class="mx-auto max-w-2xl text-center">
	<h2 class="text-2xl md:text-[2.5rem] font-black font-[family-name:var(--font-lexend)] tracking-tight text-zinc-900 dark:text-white">
		{title}
	</h2>
	{#if children}
		{@render children()}
	{/if}
</div>
