<script>
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
</script>

<header class="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/88 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/85">
	<div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
		<a class="flex items-center gap-3" href="/">
			<img src="/img/aionsoft_logo_dark-xs.webp" alt="Aionsoft" class="h-8 rounded bg-white px-2 py-1 shadow-sm dark:hidden" />
			<img src="/img/aionsoft_logo_light-xs.webp" alt="Aionsoft" class="hidden h-8 rounded bg-zinc-950 px-2 py-1 dark:block" />
		</a>

		<nav class="hidden items-center gap-5 text-sm text-zinc-600 md:flex dark:text-zinc-300">
			<a href="/#services" class="transition hover:text-zinc-950 dark:hover:text-white">Services</a>
			<a href="/#problems" class="transition hover:text-zinc-950 dark:hover:text-white">Problems</a>
			<a href="/#process" class="transition hover:text-zinc-950 dark:hover:text-white">Process</a>
			<a href="/#webpacks" class="transition hover:text-zinc-950 dark:hover:text-white">Website Packs</a>
			<ThemeToggle />
			<a href="/#contact" class="rounded-md bg-zinc-950 px-4 py-2 font-bold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200">Get a quote</a>
		</nav>

		<div class="flex items-center gap-2 md:hidden">
			<ThemeToggle />
			<a href="/#contact" class="rounded-md bg-zinc-950 px-3 py-2 text-sm font-bold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950">
				Quote
			</a>
		</div>
	</div>
</header>
