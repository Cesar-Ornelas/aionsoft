<script>
	import { onMount } from 'svelte';

	const storageKey = 'aionsoft-theme';
	let theme = $state('light');

	function persistTheme(nextTheme) {
		try {
			localStorage.setItem(storageKey, nextTheme);
		} catch {
			// Ignore local storage failures and still apply the in-memory theme.
		}
	}

	function applyTheme(nextTheme, options = {}) {
		const shouldPersist = options.persist ?? true;
		theme = nextTheme;
		document.documentElement.classList.toggle('dark', nextTheme === 'dark');
		document.documentElement.dataset.theme = nextTheme;

		if (shouldPersist) {
			persistTheme(nextTheme);
		}
	}

	function toggleTheme() {
		applyTheme(theme === 'dark' ? 'light' : 'dark');
	}

	onMount(() => {
		applyTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light', { persist: false });
	});
</script>

<button
	type="button"
	onclick={toggleTheme}
	class="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white/85 text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-white hover:text-zinc-950 dark:border-white/15 dark:bg-white/8 dark:text-zinc-200 dark:hover:bg-white/12 dark:hover:text-white"
	aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
	title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
>
	{#if theme === 'dark'}
		<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" aria-hidden="true">
			<path d="M12 3.75V5.5M12 18.5v1.75M5.46 5.46l1.24 1.24M17.3 17.3l1.24 1.24M3.75 12h1.75M18.5 12h1.75M5.46 18.54 6.7 17.3M17.3 6.7l1.24-1.24M15.5 12A3.5 3.5 0 1 1 8.5 12a3.5 3.5 0 0 1 7 0Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
		</svg>
	{:else}
		<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" aria-hidden="true">
			<path d="M21 12.8A8.99 8.99 0 0 1 11.2 3a9 9 0 1 0 9.8 9.8Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
		</svg>
	{/if}
</button>