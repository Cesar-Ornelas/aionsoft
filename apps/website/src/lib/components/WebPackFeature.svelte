<script>
	/** @type {{ name: string, children: import('svelte').Snippet }} */
	let { name, children } = $props();
</script>

<div class="col-span-full grid grid-cols-subgrid border-b border-gray-200 py-3">
	<div class="font-semibold text-left pr-4 text-zinc-900">{name}</div>
	{@render children()}
</div>
