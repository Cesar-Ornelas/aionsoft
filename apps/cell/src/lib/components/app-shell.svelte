<script>
  import { onMount } from 'svelte';
  import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
  import * as Sidebar from '$lib/components/ui/sidebar/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { page } from '$app/state';
  import Avatar from '$lib/components/ui/avatar/avatar.svelte';
  import AvatarImage from '$lib/components/ui/avatar/avatar-image.svelte';
  import AvatarFallback from '$lib/components/ui/avatar/avatar-fallback.svelte';

  let { children } = $props();
  import ArrowUpRightIcon from '@lucide/svelte/icons/arrow-up-right';
  import BellIcon from '@lucide/svelte/icons/bell';
  import BriefcaseBusinessIcon from '@lucide/svelte/icons/briefcase-business';
  import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import ContactRoundIcon from '@lucide/svelte/icons/contact-round';
  import LayoutGridIcon from '@lucide/svelte/icons/layout-grid';
  import LogOutIcon from '@lucide/svelte/icons/log-out';
  import MenuIcon from '@lucide/svelte/icons/menu';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import SettingsIcon from '@lucide/svelte/icons/settings';
  import UserRoundIcon from '@lucide/svelte/icons/user-round';
  import UsersIcon from '@lucide/svelte/icons/users';

  const appNavigation = {
    Core: [
      { label: 'Overview', href: '/', icon: LayoutGridIcon },
      { label: 'Contacts', href: '/contacts', icon: ContactRoundIcon },
      { label: 'Accounts', href: '/accounts', icon: BriefcaseBusinessIcon },
      { label: 'Pipeline', href: '/pipeline', icon: UsersIcon },
      { label: 'Tasks', href: '/tasks', icon: BellIcon }
    ],
    Cell: [
      { label: 'Overview', href: '/', icon: LayoutGridIcon },
      { label: 'Customers', href: '/contacts', icon: ContactRoundIcon },
      { label: 'Accounts', href: '/accounts', icon: BriefcaseBusinessIcon },
      { label: 'Deals', href: '/pipeline', icon: UsersIcon },
      { label: 'Work items', href: '/tasks', icon: BellIcon }
    ],
    Pipeline: [
      { label: 'Pipeline', href: '/', icon: UsersIcon },
      { label: 'Forecast', href: '/pipeline', icon: BriefcaseBusinessIcon },
      { label: 'Stages', href: '/accounts', icon: LayoutGridIcon },
      { label: 'Tasks', href: '/tasks', icon: BellIcon }
    ],
    Operations: [
      { label: 'Overview', href: '/', icon: LayoutGridIcon },
      { label: 'Tasks', href: '/tasks', icon: BellIcon },
      { label: 'Incidents', href: '/accounts', icon: BriefcaseBusinessIcon },
      { label: 'Clients', href: '/contacts', icon: ContactRoundIcon }
    ]
  };

  const navigation = $derived(appNavigation[activeTeam.name] ?? appNavigation.Core);

  const featureTeams = [
    {
      name: 'Core',
      plan: 'Workspace',
      logo: LayoutGridIcon
    },
    {
      name: 'Cell',
      plan: 'Customers',
      logo: ContactRoundIcon
    },
    {
      name: 'Pipeline',
      plan: 'Deals',
      logo: UsersIcon
    },
    {
      name: 'Operations',
      plan: 'Tasks',
      logo: BellIcon
    }
  ];

  let activeTeam = $state(featureTeams[0]);

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

  const sidebarVisible = $derived(isMobile ? mobileSidebarOpen : sidebarOpen);

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

  function selectWorkspace(team) {
    activeTeam = team;
    workspaceMenuOpen = false;
  }
</script>

<div class="flex h-screen overflow-visible bg-background text-foreground">
  <div
    class={`fixed inset-y-0 left-0 z-40 bg-black/30 transition-opacity duration-200 md:hidden ${isMobile && mobileSidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
    aria-hidden={!mobileSidebarOpen}
    onclick={() => (mobileSidebarOpen = false)}
  ></div>

  <aside class={`flex h-screen shrink-0 flex-col overflow-visible border-r bg-sidebar text-sidebar-foreground transition-all duration-200 ${isMobile ? 'fixed inset-y-0 left-0 z-50 w-72' : 'relative'} ${!isMobile && !sidebarOpen ? 'w-20' : 'w-72'} ${isMobile ? (mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}`}>
    <div class="shrink-0">
      <Sidebar.Header class={`${!sidebarVisible && !isMobile ? 'px-2 py-3' : 'px-3 py-3'} w-full`}>
        <Sidebar.Menu class="w-full">
          <Sidebar.MenuItem class="w-full">
            <div class={`relative min-w-0 ${sidebarVisible ? 'w-full' : 'flex w-full justify-center'}`}>
              <button
                type="button"
                aria-expanded={workspaceMenuOpen}
                aria-haspopup="listbox"
                onclick={toggleWorkspaceMenu}
                class={`flex items-center rounded-xl text-left transition-colors ${sidebarVisible ? 'w-full gap-3 px-3 py-2' : 'mx-auto h-10 w-10 items-center justify-center p-0'} data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground`}
              >
                <div class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <activeTeam.logo class="size-4" />
                </div>

                {#if sidebarVisible}
                  <div class="grid flex-1 text-left text-sm leading-tight">
                    <span class="truncate font-medium">{activeTeam.name}</span>
                    <span class="truncate text-xs text-muted-foreground">{activeTeam.plan}</span>
                  </div>

                  <ChevronsUpDownIcon class="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
                {/if}
              </button>

              {#if workspaceMenuOpen}
                <div class={`rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-2xl ${sidebarVisible ? 'absolute inset-x-0 z-[120] mt-2 w-full' : 'fixed left-[88px] top-[72px] z-[200] w-[320px]'}`}>
                  {#if sidebarVisible}
                    <div class="mb-1 px-2 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Workspaces</div>
                  {/if}

                  {#each featureTeams as team (team.name)}
                    <button
                      type="button"
                      onclick={() => selectWorkspace(team)}
                      class={`flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors ${activeTeam.name === team.name ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'}`}
                    >
                      <div class="flex size-8 items-center justify-center rounded-md border bg-transparent">
                        <team.logo class="size-4 shrink-0" />
                      </div>
                      <div class="flex flex-1 flex-col">
                        <span class="text-base font-medium">{team.name}</span>
                        <span class="text-xs text-muted-foreground">{team.plan}</span>
                      </div>
                    </button>
                  {/each}

                  <div class="mt-2 h-px bg-border"></div>

                  <button type="button" class="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground">
                    <div class="flex size-8 items-center justify-center rounded-md border bg-transparent">
                      <PlusIcon class="size-4" />
                    </div>
                    <span class="text-base font-medium text-muted-foreground">Add workspace</span>
                  </button>
                </div>
              {/if}
            </div>
          </Sidebar.MenuItem>
        </Sidebar.Menu>

      </Sidebar.Header>
    </div>

    <div class={`min-h-0 flex-1 overflow-y-auto py-3 ${sidebarVisible ? 'px-2' : 'px-1'}`}>
      <Sidebar.Content class="gap-4">
        <div class="space-y-1">
          {#each navigation as item}
            <a
              href={item.href}
              class={`flex items-center rounded-xl py-2 text-sm transition-colors ${sidebarVisible ? 'gap-3 px-3' : 'justify-center px-0'} ${isActive(item.href) ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
              title={item.label}
            >
              <item.icon class="h-4 w-4" />
              {#if sidebarVisible}
                <span>{item.label}</span>
              {/if}
            </a>
          {/each}
        </div>

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
          <Button variant="ghost" size="icon" class="h-8 w-8" onclick={toggleSidebar}>
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
          <Button variant="outline" class="gap-2">
            <ArrowUpRightIcon class="h-4 w-4" />
            Quick actions
          </Button>
        </div>
      </div>
    </header>

    <main class="flex-1 overflow-y-auto p-6">
      <div class="mx-auto max-w-6xl">
        {@render children?.()}
      </div>
    </main>
  </div>
</div>
