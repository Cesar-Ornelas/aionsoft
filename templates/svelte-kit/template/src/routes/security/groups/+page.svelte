<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { Button } from "$lib/components/ui/button";
  import * as Sheet from "$lib/components/ui/sheet";
  import type { ActionData, PageData } from "./$types";
  import { toastError, toastSuccess } from "$lib/stores/toast";

  let { data, form }: { data: PageData; form: ActionData | null | undefined } = $props();

  function drawerOpen() {
    return page.url.searchParams.get("new") === "1" || form?.intent === "create";
  }

  function editUsersDrawerOpen() {
    return page.url.searchParams.has("editUsers") || form?.intent === "updateUsers";
  }

  function editRolesDrawerOpen() {
    return page.url.searchParams.has("editRoles") || form?.intent === "updateRoles";
  }

  let editUsersOpen = $state(false);
  let editRolesOpen = $state(false);

  function drawerHref(open: boolean) {
    const url = new URL(page.url);

    if (open) {
      url.searchParams.set("new", "1");
    } else {
      url.searchParams.delete("new");
    }

    const search = url.searchParams.toString();
    return `${url.pathname}${search ? `?${search}` : ""}`;
  }

  function editUsersHref(groupId?: string) {
    const url = new URL(page.url);

    if (groupId) {
      url.searchParams.set("editUsers", groupId);
    } else {
      url.searchParams.delete("editUsers");
    }

    const search = url.searchParams.toString();
    return `${url.pathname}${search ? `?${search}` : ""}`;
  }

  function editRolesHref(groupId?: string) {
    const url = new URL(page.url);

    if (groupId) {
      url.searchParams.set("editRoles", groupId);
    } else {
      url.searchParams.delete("editRoles");
    }

    const search = url.searchParams.toString();
    return `${url.pathname}${search ? `?${search}` : ""}`;
  }

  function selectedUsersGroupId() {
    return page.url.searchParams.get("editUsers") ?? "";
  }

  function selectedRolesGroupId() {
    return page.url.searchParams.get("editRoles") ?? "";
  }

  function selectedUserIds() {
    if (form?.intent === "updateUsers") {
      const values = form?.values as { userIds?: string[] } | undefined;
      return values?.userIds ?? [];
    }

    const map = data.groupUserIdsByGroupId as Record<string, string[]>;
    return map[selectedUsersGroupId()] ?? [];
  }

  function selectedRoleIds() {
    if (form?.intent === "updateRoles") {
      const values = form?.values as { roleIds?: string[] } | undefined;
      return values?.roleIds ?? [];
    }

    const map = data.groupRoleIdsByGroupId as Record<string, string[]>;
    return map[selectedRolesGroupId()] ?? [];
  }

  function createGroupValues() {
    if (form?.intent !== "create") {
      return undefined;
    }

    return form.values as
      | {
          name?: string;
          description?: string;
        }
      | undefined;
  }

  $effect(() => {
    if (editUsersDrawerOpen()) {
      editUsersOpen = true;
    }
  });

  $effect(() => {
    if (editRolesDrawerOpen()) {
      editRolesOpen = true;
    }
  });

  $effect(() => {
    if (!editUsersOpen && page.url.searchParams.has("editUsers")) {
      void goto(editUsersHref(), { keepFocus: true, noScroll: true, replaceState: true });
    }
  });

  $effect(() => {
    if (!editRolesOpen && page.url.searchParams.has("editRoles")) {
      void goto(editRolesHref(), { keepFocus: true, noScroll: true, replaceState: true });
    }
  });

  onMount(() => {
    if (data.notice) {
      toastSuccess("Groups updated", data.notice);
    }

    if (data.errorMessage) {
      toastError("Groups unavailable", data.errorMessage);
    }
  });
</script>

<section class="space-y-4">
  {#if data.errorMessage}
    <p class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{data.errorMessage}</p>
  {/if}

  <div class="overflow-hidden rounded-xl border border-border bg-card">
    <table class="min-w-full divide-y divide-border text-sm">
      <thead class="bg-muted/40 text-left text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <tr>
          <th class="px-4 py-3">Group</th>
          <th class="px-4 py-3">Description</th>
          <th class="px-4 py-3 text-right">Members</th>
          <th class="px-4 py-3 text-right">Roles</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border">
        {#if data.groups.length === 0}
          <tr>
            <td colspan="4" class="px-4 py-6 text-center text-muted-foreground">No groups are available yet.</td>
          </tr>
        {:else}
          {#each data.groups as group}
            <tr>
              <td class="px-4 py-3 font-medium">{group.name}</td>
              <td class="px-4 py-3 text-muted-foreground">{group.description || "No description"}</td>
              <td class="px-4 py-3 text-right">
                <a href={editUsersHref(group.id)}>
                  <Button variant="outline" size="sm">Members</Button>
                </a>
              </td>
              <td class="px-4 py-3 text-right">
                <a href={editRolesHref(group.id)}>
                  <Button variant="outline" size="sm">Roles</Button>
                </a>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  {#if drawerOpen()}
    <div class="fixed inset-0 z-50">
      <a href={drawerHref(false)} class="absolute inset-0 bg-black/30" aria-label="Close new group dialog"></a>

      <div class="absolute inset-y-0 right-0 w-full max-w-xl overflow-y-auto border-s border-border bg-background p-6">
        <h2 class="text-xl font-semibold">Create group</h2>

        {#if form?.message}
          <p class="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{form.message}</p>
        {/if}

        <form method="POST" action="?/create" class="mt-4 space-y-4">
          <div>
            <label class="text-sm font-medium" for="name">Group name</label>
            <input
              id="name"
              name="name"
              value={createGroupValues()?.name ?? ""}
              class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Operations Team"
            />
            {#if form?.errors?.name}
              <p class="mt-1 text-sm text-rose-600">{form.errors.name}</p>
            {/if}
          </div>

          <div>
            <label class="text-sm font-medium" for="description">Description</label>
            <textarea
              id="description"
              name="description"
              rows="4"
              class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Describe who belongs to this group"
            >{createGroupValues()?.description ?? ""}</textarea>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <a href={drawerHref(false)} class="rounded-md border border-border px-4 py-2 text-sm font-medium">Cancel</a>
            <button class="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">Save</button>
          </div>
        </form>
      </div>
    </div>
  {/if}

  <Sheet.Root bind:open={editUsersOpen}>
    <Sheet.Content side="right" class="w-full max-w-xl overflow-y-auto p-0 [&>button]:hidden">
      <Sheet.Header class="p-6 pb-2">
        <Sheet.Title>Edit group members</Sheet.Title>
      </Sheet.Header>

      <div class="px-6 pb-6">
        {#if form?.intent === "updateUsers" && form?.message}
          <p class="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{form.message}</p>
        {/if}

        <form method="POST" action="?/updateUsers" class="mt-4 flex flex-col gap-4">
          <input type="hidden" name="groupId" value={selectedUsersGroupId()} />

          <div class="flex flex-col gap-2">
            <p class="text-sm font-medium">Select users</p>
            {#if data.users.length === 0}
              <p class="text-sm text-muted-foreground">No users available.</p>
            {:else}
              {#each data.users as user}
                <label class="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    name="userIds"
                    value={user.id}
                    checked={selectedUserIds().includes(user.id)}
                  />
                  <span class="font-medium">{user.displayName || user.email || user.logtoUserId}</span>
                  <span class="text-xs text-muted-foreground">{user.logtoUserId}</span>
                </label>
              {/each}
            {/if}
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <Sheet.Close>
              {#snippet child({ props })}
                <a href={editUsersHref()} class="rounded-md border border-border px-4 py-2 text-sm font-medium" {...props}>Cancel</a>
              {/snippet}
            </Sheet.Close>
            <button class="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">Save</button>
          </div>
        </form>
      </div>
    </Sheet.Content>
  </Sheet.Root>

  <Sheet.Root bind:open={editRolesOpen}>
    <Sheet.Content side="right" class="w-full max-w-xl overflow-y-auto p-0 [&>button]:hidden">
      <Sheet.Header class="p-6 pb-2">
        <Sheet.Title>Edit group roles</Sheet.Title>
      </Sheet.Header>

      <div class="px-6 pb-6">
        {#if form?.intent === "updateRoles" && form?.message}
          <p class="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{form.message}</p>
        {/if}

        <form method="POST" action="?/updateRoles" class="mt-4 flex flex-col gap-4">
          <input type="hidden" name="groupId" value={selectedRolesGroupId()} />

          <div class="flex flex-col gap-2">
            <p class="text-sm font-medium">Select roles</p>
            {#if data.roles.length === 0}
              <p class="text-sm text-muted-foreground">No roles available.</p>
            {:else}
              {#each data.roles as role}
                <label class="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    name="roleIds"
                    value={role.id}
                    checked={selectedRoleIds().includes(role.id)}
                  />
                  <span class="font-medium">{role.name}</span>
                  <span class="text-xs text-muted-foreground">{role.key}</span>
                </label>
              {/each}
            {/if}
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <Sheet.Close>
              {#snippet child({ props })}
                <a href={editRolesHref()} class="rounded-md border border-border px-4 py-2 text-sm font-medium" {...props}>Cancel</a>
              {/snippet}
            </Sheet.Close>
            <button class="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">Save</button>
          </div>
        </form>
      </div>
    </Sheet.Content>
  </Sheet.Root>
</section>
