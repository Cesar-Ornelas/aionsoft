<script>
	import '../app.css';
	import { page } from '$app/state';

	let { data, children } = $props();

	let menuOpen = $state(false);

	const primaryNavItems = [
		{
			href: '/tools',
			label: 'Tools',
			description: 'Monitoring and future apps',
			badge: 'Infra'
		},
		{
			href: '/clients',
			label: 'Clients',
			description: 'Companies, contacts',
			badge: 'Ops'
		},
		{
			href: '/security/users',
			label: 'Security',
			description: 'Users, roles, permissions',
			badge: 'Core'
		}
	];

	function isActive(href) {
		return data.currentPath === href || data.currentPath.startsWith(`${href}/`);
	}

	function getSessionLabel(user) {
		return user?.name ?? user?.email ?? 'Guest session';
	}

	function getSessionSecondaryLabel(user) {
		if (user?.name && user?.email) {
			return user.email;
		}

		return user?.sub ?? 'Not signed in';
	}

	function getAvatarLabel(user) {
		const source = user?.name ?? user?.email ?? 'A';
		const parts = source
			.split(/\s+/)
			.map((part) => part.trim())
			.filter(Boolean);

		if (parts.length >= 2) {
			return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
		}

		return source.slice(0, 2).toUpperCase();
	}

	function closeMenu() {
		menuOpen = false;
	}

	const workspaceShell = $derived(page.data.workspaceShell ?? null);
	const currentPath = $derived(page.data.currentPath ?? data.currentPath);
	const hasSession = $derived(Boolean(data.user));
</script>

<svelte:head>
	<title>Aionsoft Admin</title>
	<meta
		name="description"
		content="Admin workspace for managing security, users, and internal operations."
	/>
</svelte:head>

<main class="min-h-screen bg-[radial-gradient(circle_at_top_left,#e0f2fe_0%,#eff6ff_24%,#f8fafc_58%,#f8fafc_100%)] text-slate-950">
	<div class="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:linear-gradient(180deg,rgba(255,255,255,0.85),rgba(255,255,255,0.2))]"></div>

	<div class="relative min-h-screen lg:grid lg:grid-cols-[18.5rem_minmax(0,1fr)] lg:gap-5 lg:p-5">
		{#if menuOpen}
			<button
				type="button"
				class="fixed inset-0 z-20 bg-slate-950/20 backdrop-blur-[2px] lg:hidden"
				onclick={closeMenu}
				aria-label="Close workspace menu"
			></button>
		{/if}

		<aside
			class={`fixed inset-y-3 left-3 z-30 flex w-[min(19rem,calc(100vw-1rem))] flex-col rounded-[2rem] border border-white/75 bg-white/92 p-4 shadow-[0_32px_80px_-42px_rgba(15,23,42,0.45)] backdrop-blur-2xl transition duration-300 lg:static lg:w-auto lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-[calc(100%+1rem)] lg:translate-x-0'}`}
		>
			<div class="flex items-center justify-between gap-3 border-b border-slate-200/80 px-3 pb-4">
				<div>
					{#if workspaceShell}
						<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{workspaceShell.kicker}</p>
						<p class="mt-1 text-lg font-semibold tracking-tight text-slate-950">{workspaceShell.title}</p>
						<p class="mt-1 text-xs text-slate-500">{workspaceShell.subtitle}</p>
					{:else}
						<p class="text-lg font-semibold tracking-tight text-slate-950">Aionsoft Admin</p>
						<p class="text-xs uppercase tracking-[0.24em] text-slate-400">Internal Workspace</p>
					{/if}
				</div>
				<button
					type="button"
					class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 lg:hidden"
					onclick={closeMenu}
					aria-label="Close navigation"
				>
					<span aria-hidden="true">×</span>
				</button>
			</div>

			<nav class="mt-5 flex-1 space-y-2">
				{#if workspaceShell}
					{#each workspaceShell.navItems as item}
						<a
							href={item.href}
							onclick={closeMenu}
							class={`block rounded-2xl border px-4 py-3 transition ${currentPath === item.href || currentPath.startsWith(`${item.href}/`) ? 'border-sky-100 bg-sky-50 text-slate-950 shadow-sm' : 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900'}`}
						>
							<span class="block text-sm font-semibold">{item.label}</span>
							<span class="mt-1 block text-xs text-slate-400">{item.description}</span>
						</a>
					{/each}
				{:else}
					{#each primaryNavItems as item}
						<a
							href={item.href}
							onclick={closeMenu}
							class={`flex items-center justify-between rounded-2xl border px-4 py-3 transition ${isActive(item.href) ? 'border-sky-100 bg-sky-50 text-slate-950 shadow-sm' : 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900'}`}
						>
							<span>
								<span class="block text-sm font-semibold">{item.label}</span>
								<span class="mt-1 block text-xs text-slate-400">{item.description}</span>
							</span>
							<span class={`rounded-full px-2.5 py-1 text-xs font-semibold ${isActive(item.href) ? 'bg-white text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
								{item.badge}
							</span>
						</a>
					{/each}
				{/if}
			</nav>

			{#if workspaceShell}
				<a
					href={workspaceShell.exitHref}
					onclick={closeMenu}
					class="mb-4 inline-flex items-center justify-between rounded-[1.4rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
				>
					<span>{workspaceShell.exitLabel}</span>
					<span aria-hidden="true">←</span>
				</a>
			{/if}

			<div class="rounded-[1.6rem] border border-slate-200/80 bg-[linear-gradient(135deg,#ffffff,#f8fafc_72%,#ecfeff)] p-3.5">
				<div class="flex items-center gap-3 rounded-[1.35rem] border border-slate-200/80 bg-white/85 px-3 py-3">
					<div class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold tracking-[0.12em] text-white">
						{getAvatarLabel(data.user)}
					</div>

					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-semibold text-slate-950">{getSessionLabel(data.user)}</p>
						<p class="truncate text-xs text-slate-500">{getSessionSecondaryLabel(data.user)}</p>
					</div>

					{#if hasSession}
						<form method="POST" action="/auth/sign-out">
							<button
								type="submit"
								class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
								aria-label="Sign out"
							>
								<svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
									<path d="M8 3.75H6.75A2.75 2.75 0 0 0 4 6.5v7a2.75 2.75 0 0 0 2.75 2.75H8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
									<path d="M10.5 6.5 14 10m0 0-3.5 3.5M14 10H7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
							</button>
						</form>
					{:else}
						<a
							href="/auth/sign-in?returnTo=/security/users"
							class="inline-flex h-9 items-center rounded-full border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
						>
							Sign in
						</a>
					{/if}
				</div>
			</div>
		</aside>

		<section class="relative z-10 min-h-screen px-4 pb-5 pt-20 sm:px-5 lg:px-0 lg:pt-0">
			<button
				type="button"
				class="fixed left-4 top-4 z-20 inline-flex items-center gap-3 rounded-full border border-white/80 bg-white/88 px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.9)] backdrop-blur-xl lg:hidden"
				onclick={() => (menuOpen = true)}
			>
				<span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-white">≡</span>
				<span>Workspace Menu</span>
			</button>

			<div class="mx-auto max-w-[1400px] rounded-[2.2rem] border border-white/75 bg-white/82 p-4 shadow-[0_40px_120px_-70px_rgba(15,23,42,0.65)] backdrop-blur-2xl sm:p-6">
				{@render children()}
			</div>
		</section>
	</div>
</main>