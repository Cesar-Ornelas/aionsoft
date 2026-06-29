<script>
	import '../app.css';
	import { page } from '$app/state';
	import { onDestroy } from 'svelte';
	import { fly } from 'svelte/transition';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	let { data, children } = $props();

	let menuOpen = $state(false);
	let alertsOpen = $state(false);
	let navSearch = $state('');
	let activeToast = $state(null);
	let lastToastKey = '';
	let toastTimer = null;

	const primaryNavItems = [
		{
			href: '/tools',
			label: 'Tools',
			description: 'Monitoring and future apps',
			badge: 'Infra'
		},
		{
			href: '/tasks',
			label: 'Tasks',
			description: 'Work items, reminders',
			badge: 'Ops'
		},
		{
			href: '/projects',
			label: 'Projects',
			description: 'Phases, milestones, delivery',
			badge: 'Ops'
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

	function isWorkspaceItemActive(href) {
		const navItems = workspaceShell?.navItems ?? [];
		const hasExactMatch = navItems.some((item) => currentPath === item.href);

		if (hasExactMatch) {
			return currentPath === href;
		}

		return currentPath === href || currentPath.startsWith(`${href}/`);
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

	function matchesNavSearch(label, description) {
		const query = navSearch.trim().toLowerCase();

		if (!query) {
			return true;
		}

		return `${label} ${description}`.toLowerCase().includes(query);
	}

	function closeMenu() {
		menuOpen = false;
	}

	function toggleAlerts() {
		alertsOpen = !alertsOpen;
	}

	function closeAlerts() {
		alertsOpen = false;
	}

	function dismissToast() {
		activeToast = null;

		if (toastTimer) {
			clearTimeout(toastTimer);
			toastTimer = null;
		}
	}

	function showToast(kind, message, toastKey) {
		activeToast = { kind, message };
		lastToastKey = toastKey;

		if (toastTimer) {
			clearTimeout(toastTimer);
		}

		toastTimer = setTimeout(() => {
			activeToast = null;
			toastTimer = null;
		}, 4200);
	}

	function getAlertsButtonClass(summary) {
		if (summary.highestSeverity === 'critical') {
			return 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:text-rose-800';
		}

		if (summary.highestSeverity === 'warning') {
			return 'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:text-amber-800';
		}

		if (summary.activeCount > 0) {
			return 'border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300 hover:text-sky-800';
		}

		return 'border-slate-200 text-slate-700 hover:border-slate-300 hover:text-slate-950';
	}

	const workspaceShell = $derived(page.data.workspaceShell ?? null);
	const currentPath = $derived(page.data.currentPath ?? data.currentPath);
	const hasSession = $derived(Boolean(data.user));
	const routeNotice = $derived(page.data.notice ?? null);
	const routeError = $derived(page.data.errorMessage ?? null);
	const formMessage = $derived(page.form?.message ?? null);
	const formHasFieldErrors = $derived(Boolean(page.form?.errors && Object.keys(page.form.errors).length > 0));
	const activeToastSource = $derived(
		routeError ? { kind: 'error', message: routeError } : formMessage && !formHasFieldErrors ? { kind: 'error', message: formMessage } : routeNotice ? { kind: 'success', message: routeNotice } : null
	);
	const activeToastKey = $derived(
		activeToastSource ? `${page.url.pathname}${page.url.search}::${activeToastSource.kind}::${activeToastSource.message}` : ''
	);
	const filteredPrimaryNavItems = $derived(
		primaryNavItems.filter((item) => matchesNavSearch(item.label, item.description))
	);
	const filteredWorkspaceNavItems = $derived(
		(workspaceShell?.navItems ?? []).filter((item) => matchesNavSearch(item.label, item.description))
	);
	const alertsSummary = $derived(
		data.alertsSummary ?? {
			alerts: [],
			activeCount: 0,
			highestSeverity: null
		}
	);

	$effect(() => {
		if (!activeToastSource || !activeToastKey || activeToastKey === lastToastKey) {
			return;
		}

		showToast(activeToastSource.kind, activeToastSource.message, activeToastKey);
	});

	onDestroy(() => {
		if (toastTimer) {
			clearTimeout(toastTimer);
		}
	});
</script>

<svelte:head>
	<title>Aionsoft Admin</title>
	<meta
		name="description"
		content="Admin workspace for managing security, users, and internal operations."
	/>
</svelte:head>

<main class="min-h-screen bg-slate-50 text-slate-950 transition-colors dark:bg-slate-950 dark:text-slate-100">
	<div class="relative min-h-screen lg:grid lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:gap-0">
		{#if menuOpen}
			<button
				type="button"
				class="fixed inset-0 z-20 bg-slate-950/20 backdrop-blur-[2px] lg:hidden"
				onclick={closeMenu}
				aria-label="Close workspace menu"
			></button>
		{/if}

		<aside
			class={`fixed inset-y-3 left-3 z-30 flex h-[calc(100dvh-1.5rem)] w-[min(18rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-[0_24px_48px_-28px_rgba(15,23,42,0.28)] transition duration-300 dark:border-white/10 dark:bg-slate-950 lg:sticky lg:top-0 lg:left-auto lg:h-screen lg:w-auto lg:self-start lg:rounded-none lg:border-0 lg:border-r lg:border-slate-200 lg:bg-transparent lg:p-5 lg:shadow-none dark:lg:border-white/10 ${menuOpen ? 'translate-x-0' : '-translate-x-[calc(100%+1rem)] lg:translate-x-0'}`}
		>
			<div class="flex items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-white/10 lg:px-1">
				<div>
					{#if workspaceShell}
						<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">{workspaceShell.kicker}</p>
						<p class="mt-1 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">{workspaceShell.title}</p>
						<p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{workspaceShell.subtitle}</p>
					{:else}
						<p class="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">Aionsoft Admin</p>
						<p class="text-xs uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Internal Workspace</p>
					{/if}
				</div>
				<button
					type="button"
					class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 dark:border-white/10 dark:text-slate-400 lg:hidden"
					onclick={closeMenu}
					aria-label="Close navigation"
				>
					<span aria-hidden="true">×</span>
				</button>
			</div>

			<div class="mt-4 lg:px-1">
				<label class="relative block w-full">
					<span class="pointer-events-none absolute inset-y-0 left-4 inline-flex items-center text-slate-400 dark:text-slate-500">
						<svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
							<path d="m14.5 14.5 3 3M16 8.75a7.25 7.25 0 1 1-14.5 0 7.25 7.25 0 0 1 14.5 0Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					</span>
					<input
						type="search"
						bind:value={navSearch}
						placeholder={workspaceShell ? 'Filter this workspace navigation' : 'Filter admin sections'}
						class="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-500/40 dark:focus:ring-sky-500/10"
					/>
				</label>
			</div>

			<nav class="mt-5 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 lg:pr-3">
				{#if workspaceShell}
					{#if filteredWorkspaceNavItems.length === 0}
						<div class="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
							No workspace items match “{navSearch}”.
						</div>
					{:else}
					{#each filteredWorkspaceNavItems as item}
						<a
							href={item.href}
							onclick={closeMenu}
							class={`block rounded-2xl border px-4 py-3 transition ${isWorkspaceItemActive(item.href) ? 'border-slate-200 bg-slate-100 text-slate-950 dark:border-white/10 dark:bg-white/8 dark:text-white' : 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:border-white/10 dark:hover:bg-white/5 dark:hover:text-white'}`}
						>
							<span class="block text-sm font-semibold">{item.label}</span>
							<span class="mt-1 block text-xs text-slate-400 dark:text-slate-500">{item.description}</span>
						</a>
					{/each}
					{/if}
				{:else}
					{#if filteredPrimaryNavItems.length === 0}
						<div class="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
							No sections match “{navSearch}”.
						</div>
					{:else}
					{#each filteredPrimaryNavItems as item}
						<a
							href={item.href}
							onclick={closeMenu}
							class={`flex items-center justify-between rounded-2xl border px-4 py-3 transition ${isActive(item.href) ? 'border-slate-200 bg-slate-100 text-slate-950 dark:border-white/10 dark:bg-white/8 dark:text-white' : 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:border-white/10 dark:hover:bg-white/5 dark:hover:text-white'}`}
						>
							<span>
								<span class="block text-sm font-semibold">{item.label}</span>
								<span class="mt-1 block text-xs text-slate-400 dark:text-slate-500">{item.description}</span>
							</span>
							<span class={`rounded-full px-2.5 py-1 text-xs font-semibold ${isActive(item.href) ? 'bg-white text-slate-500 dark:bg-white/10 dark:text-slate-200' : 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500'}`}>
								{item.badge}
							</span>
						</a>
					{/each}
					{/if}
				{/if}
			</nav>

			{#if workspaceShell}
				<div class="mt-4 shrink-0 border-t border-slate-200 pt-4 dark:border-white/10 lg:px-1">
					<a
						href={workspaceShell.exitHref}
						onclick={closeMenu}
						class="inline-flex w-full items-center justify-between rounded-[1.4rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white"
					>
						<span>{workspaceShell.exitLabel}</span>
						<span aria-hidden="true">←</span>
					</a>
				</div>
			{/if}
		</aside>

		{#if alertsOpen}
			<button type="button" class="fixed inset-0 z-10" onclick={closeAlerts} aria-label="Close alerts"></button>

			<div class="fixed bottom-24 right-6 z-40 w-[min(22rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] rounded-[1.4rem] border border-slate-200 bg-white p-2 shadow-[0_32px_80px_-32px_rgba(15,23,42,0.45)] ring-1 ring-slate-950/5 dark:border-white/10 dark:bg-slate-950 dark:ring-white/10 max-sm:left-4 max-sm:right-4">
				<div class="flex items-center justify-between gap-3 px-3 py-2.5">
					<div>
						<p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Alerts</p>
						<p class="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
							{alertsSummary.activeCount === 0 ? 'No active alerts' : `${alertsSummary.activeCount} active ${alertsSummary.activeCount === 1 ? 'alert' : 'alerts'}`}
						</p>
					</div>
				</div>

				<div class="max-h-80 overflow-y-auto">
					{#if alertsSummary.alerts.length === 0}
						<div class="px-3 py-6 text-sm text-slate-500 dark:text-slate-400">
							There are no upcoming alerts right now.
						</div>
					{:else}
						{#each alertsSummary.alerts as alert}
							<a href={alert.href} onclick={closeAlerts} class="block rounded-[1.1rem] px-3 py-3 transition hover:bg-slate-50 dark:hover:bg-white/5">
								<div class="flex items-start justify-between gap-3">
									<div class="min-w-0">
										<p class="truncate text-sm font-semibold text-slate-950 dark:text-white">{alert.title}</p>
										<p class="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{alert.severity}</p>
										<p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{alert.message || 'Open the related item for more details.'}</p>
									</div>
									<span class="text-sm font-semibold text-slate-500 dark:text-slate-400">→</span>
								</div>
							</a>
						{/each}
					{/if}
				</div>
			</div>
		{/if}

		{#if activeToast}
			<div class="pointer-events-none fixed right-4 top-20 z-50 w-[min(24rem,calc(100vw-2rem))] sm:right-6 sm:top-24" transition:fly={{ y: -12, duration: 180 }}>
				<div class={`pointer-events-auto rounded-[1.5rem] border bg-white/95 p-3 backdrop-blur-xl dark:bg-slate-950/92 ${activeToast.kind === 'error' ? 'border-rose-200/90 shadow-[0_30px_80px_-40px_rgba(244,63,94,0.45)] ring-1 ring-rose-500/10 dark:border-rose-500/20 dark:ring-rose-500/20' : 'border-emerald-200/90 shadow-[0_30px_80px_-40px_rgba(16,185,129,0.55)] ring-1 ring-emerald-500/10 dark:border-emerald-500/20 dark:ring-emerald-500/20'}`}>
					<div class="flex items-start gap-3">
						<div class={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${activeToast.kind === 'error' ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'}`}>
							<svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
								{#if activeToast.kind === 'error'}
									<path d="M10 6.25v4.25M10 13.75h.01M17.25 10a7.25 7.25 0 1 1-14.5 0 7.25 7.25 0 0 1 14.5 0Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
								{:else}
									<path d="m5.75 10 2.5 2.5 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
								{/if}
							</svg>
						</div>

						<div class="min-w-0 flex-1">
							<p class={`text-xs font-semibold uppercase tracking-[0.24em] ${activeToast.kind === 'error' ? 'text-rose-600 dark:text-rose-300' : 'text-emerald-600 dark:text-emerald-300'}`}>{activeToast.kind === 'error' ? 'Error' : 'Success'}</p>
							<p class="mt-1 text-sm font-medium leading-6 text-slate-900 dark:text-slate-100">{activeToast.message}</p>
						</div>

						<button
							type="button"
							class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-900 dark:border-white/10 dark:text-slate-400 dark:hover:border-white/20 dark:hover:text-white"
							onclick={dismissToast}
							aria-label={`Dismiss ${activeToast.kind} notification`}
						>
							<span aria-hidden="true">×</span>
						</button>
					</div>
				</div>
			</div>
		{/if}

		<section class="relative min-h-screen px-4 pb-6 pt-4 sm:px-5 lg:px-8 lg:pb-8 lg:pt-4">
			<div class="relative mx-auto max-w-[1400px]">
				<div class="sticky top-4 z-20 mb-4">
					<div class="rounded-[1.4rem] border border-slate-200 bg-white/95 px-4 py-3 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.16)] backdrop-blur-md dark:border-white/10 dark:bg-slate-900/92 dark:shadow-[0_14px_30px_-24px_rgba(2,6,23,0.4)]">
						<div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
							<div class="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
								<button
									type="button"
									class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 lg:hidden"
									onclick={() => (menuOpen = true)}
									aria-label="Open workspace menu"
								>
									<span aria-hidden="true">≡</span>
								</button>

								{#if workspaceShell?.actions?.length}
									{#each workspaceShell.actions as action}
										<a
											href={action.href}
											class={`inline-flex h-10 items-center gap-2 rounded-2xl border px-3 text-sm font-semibold transition ${action.tone === 'secondary' ? 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white' : action.tone === 'danger' ? 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200' : 'border-slate-950 bg-slate-950 text-white hover:bg-slate-800 dark:border-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200'}`}
										>
											<span aria-hidden="true" class="text-base leading-none">{action.symbol ?? '+'}</span>
											<span>{action.label}</span>
										</a>
									{/each}
								{/if}
							</div>

							<div class="flex items-center gap-2 self-end lg:self-auto">
								<div class="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-1.5 sm:flex dark:border-white/10 dark:bg-white/5">
									<div class="min-w-0 text-right">
										<p class="truncate text-xs font-semibold text-slate-950 dark:text-white">{getSessionLabel(data.user)}</p>
										<p class="truncate text-[11px] text-slate-500 dark:text-slate-400">{getSessionSecondaryLabel(data.user)}</p>
									</div>

									<div class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-xs font-bold tracking-[0.12em] text-white dark:bg-white dark:text-slate-950">
										{getAvatarLabel(data.user)}
									</div>
								</div>

								<ThemeToggle />

								{#if hasSession}
									<button
										type="button"
										class={`relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition ${getAlertsButtonClass(alertsSummary)} dark:border-white/10 dark:bg-white/5`}
										onclick={toggleAlerts}
										aria-label="Alerts"
										aria-haspopup="menu"
										aria-expanded={alertsOpen}
									>
										<svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
											<path d="M10 3.5a3.25 3.25 0 0 0-3.25 3.25v1.18c0 .65-.2 1.29-.58 1.82L5 11.5h10l-1.17-1.75a3.25 3.25 0 0 1-.58-1.82V6.75A3.25 3.25 0 0 0 10 3.5Zm-1.74 10.25a1.75 1.75 0 0 0 3.48 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
										</svg>

										{#if alertsSummary.activeCount > 0}
											<span class="absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-slate-950 px-1 text-[10px] font-semibold text-white dark:bg-white dark:text-slate-950">
												{alertsSummary.activeCount > 9 ? '9+' : alertsSummary.activeCount}
											</span>
										{/if}
									</button>

									<form method="POST" action="/auth/sign-out">
										<button
											type="submit"
											class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white"
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
										class="inline-flex h-10 items-center rounded-2xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white"
									>
										Sign in
									</a>
								{/if}
							</div>
						</div>
					</div>
				</div>

				<div class="relative">
					{@render children()}
				</div>
			</div>
		</section>
	</div>
</main>