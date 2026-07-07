<script lang="ts">
  import { onMount } from "svelte";
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { useSidebar } from "$lib/components/ui/sidebar/index.js";
  import BadgeCheckIcon from "@lucide/svelte/icons/badge-check";
  import MoonIcon from "@lucide/svelte/icons/moon";
  import LogOutIcon from "@lucide/svelte/icons/log-out";
  import SunIcon from "@lucide/svelte/icons/sun";
  import ChevronsUpDownIcon from "@lucide/svelte/icons/chevrons-up-down";

  let { user }: { user: { name: string; email: string; avatar: string } } = $props();
  const sidebar = useSidebar();

  const themeStorageKey = "aionsoft-theme";
  let themeMode = $state<"light" | "dark">("light");
  let readyToPersistTheme = false;

  function applyThemeToDocument(mode: "light" | "dark") {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.classList.toggle("dark", mode === "dark");
    document.documentElement.style.colorScheme = mode;
  }

  onMount(() => {
    const storedTheme = localStorage.getItem(themeStorageKey);

    if (storedTheme === "light" || storedTheme === "dark") {
      themeMode = storedTheme;
    } else {
      themeMode = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    applyThemeToDocument(themeMode);
    readyToPersistTheme = true;
  });

  $effect(() => {
    if (!readyToPersistTheme) {
      return;
    }

    applyThemeToDocument(themeMode);
    localStorage.setItem(themeStorageKey, themeMode);
  });
</script>

<Sidebar.Menu>
  <Sidebar.MenuItem>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Sidebar.MenuButton
            size="lg"
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            {...props}
          >
            <Avatar.Root class="size-8 rounded-lg">
              <Avatar.Image src={user.avatar} alt={user.name} />
              <Avatar.Fallback class="rounded-lg">{user.name.slice(0, 2).toUpperCase()}</Avatar.Fallback>
            </Avatar.Root>
            <div class="grid flex-1 text-start text-sm leading-tight">
              <span class="truncate font-medium">{user.name}</span>
              <span class="truncate text-xs">{user.email}</span>
            </div>
            <ChevronsUpDownIcon data-icon="inline-end" />
          </Sidebar.MenuButton>
        {/snippet}
      </DropdownMenu.Trigger>

      <DropdownMenu.Content
        class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg"
        side={sidebar.isMobile ? "bottom" : "right"}
        align="end"
        sideOffset={4}
      >
        <DropdownMenu.Label class="p-0 font-normal">
          <div class="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
            <Avatar.Root class="size-8 rounded-lg">
              <Avatar.Image src={user.avatar} alt={user.name} />
              <Avatar.Fallback class="rounded-lg">{user.name.slice(0, 2).toUpperCase()}</Avatar.Fallback>
            </Avatar.Root>
            <div class="grid flex-1 text-start text-sm leading-tight">
              <span class="truncate font-medium">{user.name}</span>
              <span class="truncate text-xs">{user.email}</span>
            </div>
          </div>
        </DropdownMenu.Label>

        <DropdownMenu.Separator />

        <DropdownMenu.Group>
          <DropdownMenu.Item>
            <BadgeCheckIcon />
            Account
          </DropdownMenu.Item>
        </DropdownMenu.Group>

        <DropdownMenu.Separator />

        <DropdownMenu.Group>
          <DropdownMenu.GroupHeading>Theme</DropdownMenu.GroupHeading>
          <DropdownMenu.RadioGroup bind:value={themeMode}>
            <DropdownMenu.RadioItem value="light">
              <SunIcon />
              Light
            </DropdownMenu.RadioItem>
            <DropdownMenu.RadioItem value="dark">
              <MoonIcon />
              Dark
            </DropdownMenu.RadioItem>
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Group>

        <DropdownMenu.Separator />

        <DropdownMenu.Item>
          {#snippet child({ props })}
            <a href="/logout" class="flex w-full items-center gap-2" {...props}>
              <LogOutIcon />
              Log out
            </a>
          {/snippet}
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </Sidebar.MenuItem>
</Sidebar.Menu>