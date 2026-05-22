<script>
	/** @type {{ stepNumber: string, title: string, children: import('svelte').Snippet }} */
	let { stepNumber, title, children } = $props();
</script>

<div class="bg-card rounded-2xl border border-zinc-200 p-4 shadow-sm transition-shadow hover:shadow-md flex flex-row group">
	<span class="font-black text-zinc-200 dark:text-zinc-700 text-9xl p-4 transition-all duration-1000 group-hover:text-[var(--color-brand-main)]">{stepNumber}</span>
	<div>
		<h3 class="mt-2 text-xl font-bold text-zinc-800 dark:text-zinc-100">{title}</h3>
		<p class="text-md mt-2 leading-loose text-zinc-600">
			{@render children()}
		</p>
	</div>
</div>
