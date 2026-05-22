<script>
	/** @type {{ title: string, children: import('svelte').Snippet, icon?: import('svelte').Snippet }} */
	let { title, children, icon } = $props();
</script>

<article class="group relative rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
	<div class="flex items-start gap-4">
		<div class="rounded-xl border border-zinc-200 bg-zinc-50 p-3 shadow-inner group-hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-800">
			{#if icon}
				{@render icon()}
			{/if}
		</div>
		<div class="flex-1">
			<h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
			{@render children()}
		</div>
	</div>
</article>
