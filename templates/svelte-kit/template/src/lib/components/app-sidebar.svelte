<script lang="ts" module>
  const data = {
    navMain: [
      {
        title: "Workspace",
        items: [
          { title: "Projects", url: "/", icon: FolderKanbanIcon },
          { title: "Tasks", url: "/", icon: ListTodoIcon }
        ]
      }
    ]
  };
</script>

<script lang="ts">
  import { page } from "$app/state";
  import NavUser from "$lib/components/nav-user.svelte";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import BellIcon from "@lucide/svelte/icons/bell";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import FolderKanbanIcon from "@lucide/svelte/icons/folder-kanban";
  import KeyRoundIcon from "@lucide/svelte/icons/key-round";
  import ListTodoIcon from "@lucide/svelte/icons/list-todo";
  import Settings2Icon from "@lucide/svelte/icons/settings-2";
  import ShieldCheckIcon from "@lucide/svelte/icons/shield-check";
  import UserRoundIcon from "@lucide/svelte/icons/user-round";

  let {
    user,
    hasLogtoManagement,
    notificationsHref,
    unreadNotificationsCount
  }: {
    user: { name: string; email: string; avatar: string };
    hasLogtoManagement: boolean;
    notificationsHref: string;
    unreadNotificationsCount: number;
  } = $props();
  let managementOpen = $state(false);

  function isItemActive(url: string) {
    return page.url.pathname === url || page.url.pathname.startsWith(`${url}/`);
  }
</script>

<Sidebar.Root collapsible="icon">
  <Sidebar.Header>
    <div class="flex items-center gap-2 px-2 py-1 group-data-[collapsible=icon]:justify-center">
      <div class="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-sidebar-accent-foreground text-xs font-bold">
        A
      </div>
      <div class="min-w-0 group-data-[collapsible=icon]:hidden">
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Aionsoft</p>
        <p class="mt-0.5 truncate text-sm font-semibold">__PROJECT_NAME__</p>
        <p class="truncate text-xs text-muted-foreground">App Default Layout</p>
      </div>
    </div>
  </Sidebar.Header>

  <Sidebar.Content>
    {#each data.navMain as group (group.title)}
      <Sidebar.Group>
        <Sidebar.GroupLabel>{group.title}</Sidebar.GroupLabel>
        <Sidebar.GroupContent>
          <Sidebar.Menu>
            {#each group.items as item (item.title)}
              <Sidebar.MenuItem>
                <Sidebar.MenuButton isActive={isItemActive(item.url)}>
                  {#snippet child({ props })}
                    <a {...props} href={item.url}>
                      <item.icon data-icon="inline-start" />
                      <span>{item.title}</span>
                    </a>
                  {/snippet}
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
            {/each}
          </Sidebar.Menu>
        </Sidebar.GroupContent>
      </Sidebar.Group>
    {/each}
  </Sidebar.Content>

  <Sidebar.Footer>
    <Sidebar.Menu>
      <Sidebar.MenuItem>
        <Sidebar.MenuButton>
          {#snippet child({ props })}
            <a {...props} href={notificationsHref}>
              <BellIcon data-icon="inline-start" />
              <span>Notifications</span>
              {#if unreadNotificationsCount > 0}
                <span class="ms-auto rounded-full bg-cyan-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                  {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
                </span>
              {/if}
            </a>
          {/snippet}
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>

      <Sidebar.MenuItem>
        <Sidebar.MenuButton
          onclick={() => {
            managementOpen = !managementOpen;
          }}
        >
          <Settings2Icon data-icon="inline-start" />
          <span>Management</span>
          <ChevronRightIcon class={`ms-auto transition-transform ${managementOpen ? "rotate-90" : ""}`} />
        </Sidebar.MenuButton>

        {#if managementOpen}
          <Sidebar.MenuSub>
            {#if hasLogtoManagement}
              <Sidebar.MenuSubItem>
                <Sidebar.MenuSubButton href="/security">Security</Sidebar.MenuSubButton>
              </Sidebar.MenuSubItem>
            {/if}
            <Sidebar.MenuSubItem>
              <Sidebar.MenuSubButton href="/">Settings</Sidebar.MenuSubButton>
            </Sidebar.MenuSubItem>
          </Sidebar.MenuSub>
        {/if}
      </Sidebar.MenuItem>
    </Sidebar.Menu>

    <Sidebar.Separator />
    <NavUser {user} />
  </Sidebar.Footer>

  <Sidebar.Rail />
</Sidebar.Root>