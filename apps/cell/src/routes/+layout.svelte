<script>
	import '../app.css';
	import AppShell from '$lib/components/app-shell.svelte';
	import { toastStore, dismissToast } from '$lib/stores/toast.js';
	let { children } = $props();

	let toasts = $state([]);
	toastStore.subscribe((items) => {
		toasts = items;
	});
</script>

<svelte:head>
	<title>Aionsoft Cell</title>
	<meta name="description" content="Aionsoft Cell workspace" />
</svelte:head>

<div class="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
	{#each toasts as toast (toast.id)}
		<div class="pointer-events-auto rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur-sm">
			<div class="flex items-start justify-between gap-3">
				<div class="flex items-start gap-2">
					<span class={`mt-0.5 inline-block h-2.5 w-2.5 rounded-full ${toast.variant === 'error' ? 'bg-red-400' : toast.variant === 'success' ? 'bg-emerald-400' : 'bg-sky-400'}`}></span>
					<div>
						<p class="text-sm font-medium text-foreground">{toast.variant === 'error' ? 'Error' : toast.variant === 'success' ? 'Success' : 'Notice'}</p>
						<p class="text-sm text-muted-foreground">{toast.message}</p>
					</div>
				</div>
				<button type="button" class="text-xs text-muted-foreground hover:text-foreground" onclick={() => dismissToast(toast.id)}>Close</button>
			</div>
		</div>
	{/each}
</div>

<AppShell>
	{@render children()}
</AppShell>
