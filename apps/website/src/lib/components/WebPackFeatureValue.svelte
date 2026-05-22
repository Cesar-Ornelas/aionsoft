<script>
	/** @type {{ included?: boolean, children?: import('svelte').Snippet }} */
	let { included = false, children } = $props();
</script>

{#if included}
	<div class="text-center">
		<svg xmlns="http://www.w3.org/2000/svg" class="flex-shrink-0 mx-auto h-5 w-5 text-green-400" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
			<path d="M5 12l5 5l10 -10"></path>
		</svg>
	</div>
{:else if children}
	<div class="text-center text-zinc-700">
		{@render children()}
	</div>
{:else}
	<div></div>
{/if}
