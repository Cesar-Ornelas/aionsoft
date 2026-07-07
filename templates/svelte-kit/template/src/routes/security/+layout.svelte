<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import type { Snippet } from "svelte";
  import { page } from "$app/state";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import * as Tabs from "$lib/components/ui/tabs";
  import { toastError, toastSuccess } from "$lib/stores/toast";
  import EllipsisVerticalIcon from "@lucide/svelte/icons/ellipsis-vertical";

  let importDialogOpen = $state(false);
  let exportDialogOpen = $state(false);

  let { children }: { children?: Snippet } = $props();

  const tabs = [
    { href: "/security", label: "Users", createHref: "/security?new=1", createLabel: "Add user" },
    { href: "/security/roles", label: "Roles", createHref: "/security/roles?new=1", createLabel: "Add role" },
    { href: "/security/groups", label: "Groups", createHref: "/security/groups?new=1", createLabel: "Add group" },
    {
      href: "/security/permissions",
      label: "Permissions",
      createHref: "/security/permissions?new=1",
      createLabel: "Add permission"
    }
  ];

  function isActive(href: string) {
    if (href === "/security") {
      return page.url.pathname === "/security" || page.url.pathname.startsWith("/security/users");
    }

    return page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
  }

  function getActiveTab() {
    return tabs.find((tab) => isActive(tab.href)) ?? tabs[0];
  }

  function importReasonLabel(reason: string | null) {
    if (reason === "missing-file") {
      return "Choose a JSON file before importing.";
    }

    if (reason === "invalid-json") {
      return "The selected file is not valid JSON.";
    }

    if (reason === "invalid-format") {
      return "The selected file does not match the expected export format.";
    }

    return "The import failed.";
  }

  onMount(() => {
    const imported = page.url.searchParams.get("imported");

    if (imported === "1") {
      toastSuccess("Security imported", "Users, roles, groups, and permissions were imported.");
    }

    if (imported === "0") {
      toastError("Import failed", importReasonLabel(page.url.searchParams.get("importReason")));
    }
  });

  function closeActionsDialogs() {
    importDialogOpen = false;
    exportDialogOpen = false;
  }
</script>

<div class="space-y-6">
  <div class="flex flex-wrap items-center justify-end gap-2">
    <a href={getActiveTab().createHref} aria-label={getActiveTab().createLabel} title={getActiveTab().createLabel}>
      <Button size="icon" class="rounded-full text-base">+</Button>
    </a>

    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Button variant="outline" size="icon" {...props}>
            <EllipsisVerticalIcon />
            <span class="sr-only">Open security actions</span>
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end">
        <DropdownMenu.Group>
          <DropdownMenu.Item onclick={() => {
            closeActionsDialogs();
            exportDialogOpen = true;
          }}>
            Export JSON
          </DropdownMenu.Item>
          <DropdownMenu.Item onclick={() => {
            closeActionsDialogs();
            importDialogOpen = true;
          }}>
            Import JSON
          </DropdownMenu.Item>
        </DropdownMenu.Group>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </div>

  <Dialog.Root bind:open={exportDialogOpen}>
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>Export security JSON</Dialog.Title>
        <Dialog.Description>
          Download users, roles, groups, permissions, and assignments as a JSON file.
        </Dialog.Description>
      </Dialog.Header>

      <Dialog.Footer>
        <Dialog.Close>
          {#snippet child({ props })}
            <Button variant="outline" {...props}>Cancel</Button>
          {/snippet}
        </Dialog.Close>
        <a href="/security/transfer" download>
          <Button>Download JSON</Button>
        </a>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>

  <Dialog.Root bind:open={importDialogOpen}>
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>Import security JSON</Dialog.Title>
        <Dialog.Description>
          Upload a security export file to import users, roles, groups, permissions, and assignments.
        </Dialog.Description>
      </Dialog.Header>

      <form method="POST" action="/security/transfer" enctype="multipart/form-data" class="flex flex-col gap-4">
        <input type="hidden" name="redirectTo" value={page.url.pathname} />
        <input
          type="file"
          name="file"
          accept="application/json,.json"
          required
          class="rounded-md border border-border bg-background px-3 py-2 text-sm"
        />

        <Dialog.Footer>
          <Dialog.Close>
            {#snippet child({ props })}
              <Button type="button" variant="outline" {...props}>Cancel</Button>
            {/snippet}
          </Dialog.Close>
          <Button type="submit">Import JSON</Button>
        </Dialog.Footer>
      </form>
    </Dialog.Content>
  </Dialog.Root>

  <Tabs.Root value={getActiveTab().href}>
    <Tabs.List>
      {#each tabs as tab}
        <Tabs.Trigger
          value={tab.href}
          onclick={() => {
            if (!isActive(tab.href)) {
              void goto(tab.href);
            }
          }}
        >
          {tab.label}
        </Tabs.Trigger>
      {/each}
    </Tabs.List>
  </Tabs.Root>

  {@render children?.()}
</div>
