<script>
	import '../app.css';
	import AppShell from '$lib/components/app-shell.svelte';
	let { children } = $props();
</script>

<svelte:head>
	<title>Aionsoft Cell</title>
	<meta name="description" content="Aionsoft Cell workspace" />
</svelte:head>

<AppShell>
	{@render children()}
</AppShell>
