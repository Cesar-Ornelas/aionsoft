<script>
  import { onMount } from 'svelte';
  import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
  import * as Sidebar from '$lib/components/ui/sidebar/index.js';
  import * as Sheet from '$lib/components/ui/sheet/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import Avatar from '$lib/components/ui/avatar/avatar.svelte';
  import AvatarImage from '$lib/components/ui/avatar/avatar-image.svelte';
  import AvatarFallback from '$lib/components/ui/avatar/avatar-fallback.svelte';
  import ArrowUpRightIcon from '@lucide/svelte/icons/arrow-up-right';
  import BellIcon from '@lucide/svelte/icons/bell';
  import BriefcaseBusinessIcon from '@lucide/svelte/icons/briefcase-business';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import ContactRoundIcon from '@lucide/svelte/icons/contact-round';
  import HomeIcon from '@lucide/svelte/icons/home';
  import LayoutGridIcon from '@lucide/svelte/icons/layout-grid';
  import LogOutIcon from '@lucide/svelte/icons/log-out';
  import MenuIcon from '@lucide/svelte/icons/menu';
  import SettingsIcon from '@lucide/svelte/icons/settings';
  import SearchIcon from '@lucide/svelte/icons/search';
  import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
  import UserRoundIcon from '@lucide/svelte/icons/user-round';
  import UsersIcon from '@lucide/svelte/icons/users';

  let { children } = $props();

  const appNavigation = {
    Sales: [
      { label: 'Dashboard', href: '/pipeline/dashboard', icon: LayoutGridIcon },
      { label: 'Contacts', href: '/crm/contacts', icon: ContactRoundIcon },
      { label: 'Companies', href: '/crm/companies', icon: BriefcaseBusinessIcon },
      { label: 'Deals', href: '/pipeline/dashboard', icon: UsersIcon }
    ],
    Projects: [
      { label: 'Dashboard', href: '/projects', icon: LayoutGridIcon, disabled: true },
      { label: 'Projects', href: '/projects', icon: BriefcaseBusinessIcon, disabled: true },
      { label: 'Tasks', href: '/projects', icon: BellIcon, disabled: true }
    ],
    Support: [
      { label: 'Dashboard', href: '/support', icon: LayoutGridIcon, disabled: true },
      { label: 'Tickets', href: '/support', icon: BellIcon, disabled: true },
      { label: 'Customers', href: '/support', icon: ContactRoundIcon, disabled: true }
    ],
    Marketing: [
      { label: 'Dashboard', href: '/marketing', icon: LayoutGridIcon, disabled: true },
      { label: 'Campaigns', href: '/marketing', icon: UsersIcon, disabled: true },
      { label: 'Audience', href: '/marketing', icon: ContactRoundIcon, disabled: true }
    ],
    Operations: [
      { label: 'Dashboard', href: '/operations/dashboard', icon: LayoutGridIcon },
      { label: 'Accounts', href: '/operations/accounts', icon: BriefcaseBusinessIcon },
      { label: 'Tasks', href: '/operations/dashboard', icon: BellIcon },
      { label: 'Clients', href: '/operations/dashboard', icon: ContactRoundIcon }
    ],
    Management: [
      { label: 'Dashboard', href: '/management/dashboard', icon: LayoutGridIcon },
      { label: 'Users', href: '/management/users', icon: UserRoundIcon },
      { label: 'Groups', href: '/management/groups', icon: UsersIcon },
      { label: 'Roles', href: '/management/roles', icon: SettingsIcon },
      { label: 'Permissions', href: '/management/permissions', icon: SettingsIcon },
      { label: 'Migrations', href: '/management/migrations', icon: SettingsIcon }
    ]
  };

  const navigation = $derived(appNavigation[activeTeam.name] ?? appNavigation.Sales);

  const featureTeams = [
    { name: 'Sales', plan: 'Revenue', logo: BriefcaseBusinessIcon, href: '/pipeline/dashboard' },
    { name: 'Projects', plan: 'Delivery', logo: LayoutGridIcon, href: '/projects', disabled: true },
    { name: 'Support', plan: 'Customer care', logo: BellIcon, href: '/support', disabled: true },
    { name: 'Marketing', plan: 'Growth', logo: UsersIcon, href: '/marketing', disabled: true },
    { name: 'Operations', plan: 'Execution', logo: SettingsIcon, href: '/operations/dashboard' },
    { name: 'Management', plan: 'Administration', logo: ShieldCheckIcon, href: '/management/dashboard' }
  ];

  function resolveWorkspaceFromPath(pathname) {
    if (!pathname || pathname === '/') return 'Sales';
    if (pathname.startsWith('/crm') || pathname.startsWith('/customers') || pathname.startsWith('/companies')) return 'Sales';
    if (pathname.startsWith('/pipeline')) return 'Sales';
    if (pathname.startsWith('/operations')) return 'Operations';
    if (pathname.startsWith('/management')) return 'Management';
    if (pathname.startsWith('/projects')) return 'Projects';
    if (pathname.startsWith('/support')) return 'Support';
    if (pathname.startsWith('/marketing')) return 'Marketing';
    return 'Sales';
  }

  let activeTeam = $state(
    featureTeams.find((team) => team.name === resolveWorkspaceFromPath(page.url.pathname)) ?? featureTeams[0]
  );

  $effect(() => {
    const nextWorkspace = resolveWorkspaceFromPath(page.url.pathname);
    const nextTeam = featureTeams.find((team) => team.name === nextWorkspace);

    if (nextTeam) {
      activeTeam = nextTeam;
    }
  });

  const user = {
    name: 'Aionsoft Admin',
    email: 'admin@aionsoft.local',
    avatar: ''
  };

  const breadcrumbs = $derived(() => {
    const pathParts = page.url.pathname.split('/').filter(Boolean);
    const items = [{ label: 'Dashboard', href: '/' }];

    if (!pathParts.length) {
      return items;
    }

    let current = '';
    for (const part of pathParts) {
      current += `/${part}`;
      items.push({
        label: part
          .split('-')
          .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
          .join(' '),
        href: current
      });
    }

    return items;
  });

  let sidebarOpen = $state(true);
  let mobileSidebarOpen = $state(false);
  let isMobile = $state(false);
  let userMenuOpen = $state(false);
  let workspaceMenuOpen = $state(false);
  let menuOverlayOpen = $state(false);
  let menuSearch = $state('');

  const sidebarVisible = $derived(isMobile ? mobileSidebarOpen : sidebarOpen);
  const filteredNavigationGroups = $derived(
    Object.entries(appNavigation)
      .map(([label, items]) => ({
        label,
        items: items.filter((item) => {
          const query = menuSearch.trim().toLowerCase();
          return !query || `${label} ${item.label}`.toLowerCase().includes(query);
        })
      }))
      .filter((group) => group.items.length > 0)
  );

  $effect(() => {
    if (!menuOverlayOpen) {
      menuSearch = '';
    }
  });

  onMount(() => {
    const syncViewport = () => {
      const matches = window.innerWidth < 768;
      isMobile = matches;
      if (!matches) {
        mobileSidebarOpen = false;
      }
    };

    syncViewport();
    window.addEventListener('resize', syncViewport);

    return () => window.removeEventListener('resize', syncViewport);
  });

  function isActive(path) {
    return page.url.pathname === path || page.url.pathname.startsWith(`${path}/`);
  }

  function toggleSidebar() {
    if (isMobile) {
      mobileSidebarOpen = !mobileSidebarOpen;
      return;
    }

    sidebarOpen = !sidebarOpen;
  }

  function toggleUserMenu() {
    userMenuOpen = !userMenuOpen;
  }

  function toggleWorkspaceMenu() {
    workspaceMenuOpen = !workspaceMenuOpen;
  }

  function closeMenuOverlay() {
    menuOverlayOpen = false;
    menuSearch = '';
  }

  function openMenuOverlay() {
    mobileSidebarOpen = false;
    menuOverlayOpen = true;
  }

  async function navigateTo(path) {
    if (!path) return;
    await goto(path, { keepFocus: true, noScroll: true, replaceState: false });
    userMenuOpen = false;
    workspaceMenuOpen = false;
    closeMenuOverlay();
  }

  async function selectWorkspace(team) {
    if (team.disabled) return;
    await navigateTo(team.href);
  }
</script>

<div class="flex h-screen overflow-visible bg-background text-foreground">
  <div
    class={`fixed inset-y-0 left-0 z-40 bg-black/30 transition-opacity duration-200 md:hidden ${isMobile && mobileSidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
    aria-hidden={!mobileSidebarOpen}
    onclick={() => (mobileSidebarOpen = false)}
  ></div>

  <aside class={`fixed inset-y-0 left-0 z-50 flex h-screen w-72 shrink-0 flex-col overflow-visible border-r bg-sidebar text-sidebar-foreground transition-all duration-200 md:relative md:inset-auto md:z-auto md:translate-x-0 ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${sidebarOpen ? 'md:w-72' : 'md:w-20'}`}>
    <div class="shrink-0">
      <Sidebar.Header class={`${!sidebarVisible && !isMobile ? 'px-2 py-3' : 'px-3 py-3'} w-full`}>
        <Sidebar.Menu class="w-full">
          <Sidebar.MenuItem class="w-full">
            <div class={`relative min-w-0 ${sidebarVisible ? 'w-full' : 'flex w-full justify-center'}`}>
              {#if sidebarVisible}
                <button
                  type="button"
                  aria-label={`Select workspace. Current workspace: ${activeTeam.name}`}
                  aria-expanded={workspaceMenuOpen}
                  aria-haspopup="menu"
                  onclick={toggleWorkspaceMenu}
                  class="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <div class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <activeTeam.logo class="size-4" />
                  </div>
                  <div class="grid flex-1 text-left text-sm leading-tight">
                    <span class="truncate font-medium">{activeTeam.name}</span>
                    <span class="truncate text-xs text-muted-foreground">{activeTeam.plan}</span>
                  </div>
                  <ChevronDownIcon class={`size-4 shrink-0 text-muted-foreground transition-transform ${workspaceMenuOpen ? 'rotate-180' : ''}`} />
                </button>
              {:else}
                <div aria-label="Aionsoft Cell" class="mx-auto flex h-10 w-10 items-center justify-center rounded-xl">
                  <LayoutGridIcon class="size-4" />
                </div>
              {/if}

              {#if workspaceMenuOpen && sidebarVisible}
                <div class="absolute inset-x-0 z-[120] mt-2 rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-2xl" role="menu">
                  <div class="mb-1 px-2 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Workspaces</div>
                  {#each featureTeams as team (team.name)}
                    <button
                      type="button"
                      role="menuitem"
                      aria-disabled={team.disabled}
                      disabled={team.disabled}
                      onclick={() => selectWorkspace(team)}
                      class={`flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors ${team.disabled ? 'cursor-not-allowed opacity-45' : activeTeam.name === team.name ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'}`}
                    >
                      <div class="flex size-8 items-center justify-center rounded-md border bg-transparent">
                        <team.logo class="size-4 shrink-0" />
                      </div>
                      <div class="flex flex-1 flex-col">
                        <span class="text-sm font-medium">{team.name}</span>
                        <span class="text-xs text-muted-foreground">{team.plan}{team.disabled ? ' · Coming soon' : ''}</span>
                      </div>
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
          </Sidebar.MenuItem>
        </Sidebar.Menu>

      </Sidebar.Header>
    </div>

    <div class={`min-h-0 flex-1 overflow-y-auto py-3 ${sidebarVisible ? 'px-2' : 'px-1'}`}>
      <Sidebar.Content class="gap-4">
        {#if isMobile}
          <div class="space-y-1">
            {#each navigation as item}
              <button
                type="button"
                onclick={() => navigateTo(item.href)}
                class={`flex w-full items-center rounded-xl py-2 text-sm transition-colors ${sidebarVisible ? 'gap-3 px-3' : 'justify-center px-0'} ${isActive(item.href) ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
                title={item.label}
              >
                <item.icon class="h-4 w-4" />
                {#if sidebarVisible}
                  <span>{item.label}</span>
                {/if}
              </button>
            {/each}
          </div>
        {:else if sidebarVisible}
          <div class="space-y-1">
            {#each navigation as item (`${item.label}-${item.href}`)}
              <button
                type="button"
                disabled={item.disabled}
                onclick={() => item.disabled || navigateTo(item.href)}
                class={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${item.disabled ? 'cursor-not-allowed opacity-45' : isActive(item.href) ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
              >
                <item.icon class="h-4 w-4" />
                <span>{item.label}</span>
                {#if item.disabled}<span class="ml-auto text-[10px] uppercase tracking-wide">Soon</span>{/if}
              </button>
            {/each}
          </div>
        {:else}
          <div class="space-y-1">
            {#each navigation as item}
              <button type="button" onclick={() => navigateTo(item.href)} class={`flex w-full items-center justify-center rounded-xl px-0 py-2 text-sm transition-colors ${isActive(item.href) ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`} title={item.label}>
                <item.icon class="h-4 w-4" />
              </button>
            {/each}
          </div>
        {/if}

      </Sidebar.Content>
    </div>

    <div class={`shrink-0 ${sidebarVisible ? 'p-2' : 'px-1 pb-2'}`}>
      <Sidebar.Footer class="p-0">
        <div class="relative">
          <button
            type="button"
            class={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition-colors ${userMenuOpen ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'hover:bg-sidebar-accent/80'} ${!sidebarVisible ? 'justify-center px-0' : ''}`}
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
            onclick={toggleUserMenu}
          >
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {user.name.charAt(0).toUpperCase()}
            </div>
            {#if sidebarVisible}
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium">{user.name}</p>
                <p class="truncate text-[11px] text-muted-foreground">{user.email}</p>
              </div>
              <ChevronDownIcon class={`h-4 w-4 text-muted-foreground transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            {/if}
          </button>

          {#if userMenuOpen}
            <div class="absolute bottom-full left-0 z-50 mb-2 w-56 rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg">
              <button type="button" class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground">
                <UserRoundIcon class="h-4 w-4" />
                Profile
              </button>
              <button type="button" class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground">
                <SettingsIcon class="h-4 w-4" />
                Settings
              </button>
              <div class="my-1 h-px bg-border"></div>
              <button type="button" class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10">
                <LogOutIcon class="h-4 w-4" />
                Log out
              </button>
            </div>
          {/if}

        </div>
      </Sidebar.Footer>
    </div>
  </aside>

  <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
    <header class="shrink-0 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div class="flex h-[57px] items-center justify-between gap-4 px-3">
        <div class="flex items-center gap-3">
          <Button variant="ghost" size="icon" class="hidden h-8 w-8 md:inline-flex" onclick={toggleSidebar}>
            <MenuIcon class="h-4 w-4" />
          </Button>

          <Breadcrumb.Root>
            <Breadcrumb.List>
              {#each breadcrumbs as crumb, index}
                <Breadcrumb.Item>
                  {#if index < breadcrumbs.length - 1}
                    <Breadcrumb.Link href={crumb.href}>{crumb.label}</Breadcrumb.Link>
                    <Breadcrumb.Separator />
                  {:else}
                    <Breadcrumb.Page>{crumb.label}</Breadcrumb.Page>
                  {/if}
                </Breadcrumb.Item>
              {/each}
            </Breadcrumb.List>
          </Breadcrumb.Root>
        </div>

        <div class="flex items-center gap-2">
          <Button variant="outline" class="gap-2" onclick={openMenuOverlay}>
            <SearchIcon class="h-4 w-4" />
            Menu
          </Button>
          <Button variant="outline" class="gap-2">
            <ArrowUpRightIcon class="h-4 w-4" />
            Quick actions
          </Button>
        </div>
      </div>
    </header>

    <main class="flex-1 overflow-y-auto p-6 pb-24 md:pb-6">
      <div class="mx-auto max-w-6xl">
        {@render children?.()}
      </div>
    </main>
  </div>
</div>

<Sheet.Root bind:open={menuOverlayOpen}>
  <Sheet.Content side="right" class="h-full w-full max-w-none gap-0 p-0 sm:max-w-none">
    <div class="mx-auto flex h-full w-full max-w-7xl flex-col">
      <Sheet.Header class="border-b border-border px-5 pb-4 pt-5 pr-16 text-left md:px-8 md:pt-7">
        <Sheet.Title>Menu</Sheet.Title>
        <Sheet.Description>Search and open any Cell area.</Sheet.Description>
      </Sheet.Header>

      <div class="border-b border-border px-5 py-4 md:px-8 md:py-5">
        <div class="relative mx-auto max-w-3xl">
          <SearchIcon class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input bind:value={menuSearch} class="h-11 pl-10 md:h-12" placeholder="Search menus" aria-label="Search menus" />
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-8 md:py-8">
        <div class="flex flex-col gap-7 md:grid md:grid-cols-2 md:gap-7 xl:grid-cols-3">
        {#each filteredNavigationGroups as group (group.label)}
          <section aria-labelledby={`menu-${group.label}`} class="rounded-none border-0 bg-transparent p-0 md:rounded-2xl md:border md:border-border md:bg-card/40 md:p-4">
            <h2 id={`menu-${group.label}`} class="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground md:px-3">{group.label}</h2>
            <div class="flex flex-col gap-1">
              {#each group.items as item (`${item.label}-${item.href}`)}
                <button
                  type="button"
                  disabled={item.disabled}
                  class={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${item.disabled ? 'cursor-not-allowed opacity-45' : 'text-foreground hover:bg-accent hover:text-accent-foreground'}`}
                  onclick={() => item.disabled || navigateTo(item.href)}
                >
                  <item.icon class="text-muted-foreground" />
                  <span>{item.label}</span>
                  {#if item.disabled}<span class="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">Soon</span>{/if}
                </button>
              {/each}
            </div>
          </section>
        {:else}
          <p class="py-8 text-center text-sm text-muted-foreground">No menu items match your search.</p>
        {/each}
        </div>
      </div>
    </div>
  </Sheet.Content>
</Sheet.Root>

<nav class="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-3 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur md:hidden" aria-label="Mobile navigation">
  <div class="mx-auto grid max-w-md grid-cols-3 gap-2">
    <button type="button" class={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium transition-colors ${page.url.pathname === '/' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`} onclick={() => navigateTo('/')}>
      <HomeIcon />
      <span>Home</span>
    </button>
    <button type="button" class={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium transition-colors ${menuOverlayOpen ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`} aria-expanded={menuOverlayOpen} onclick={openMenuOverlay}>
      <MenuIcon />
      <span>Menu</span>
    </button>
    <button type="button" class={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium transition-colors ${isActive('/configuration') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`} onclick={() => navigateTo('/configuration')}>
      <SettingsIcon />
      <span>Configuration</span>
    </button>
  </div>
</nav>
