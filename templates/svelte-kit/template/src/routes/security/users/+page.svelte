<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { Button } from "$lib/components/ui/button";
  import type { ActionData, PageData } from "./$types";
  import * as Sheet from "$lib/components/ui/sheet";
  import { toastError, toastSuccess } from "$lib/stores/toast";
  import SquarePenIcon from "@lucide/svelte/icons/square-pen";

  let { data, form }: { data: PageData; form: ActionData | null | undefined } = $props();

  function drawerOpen() {
    return page.url.searchParams.get("new") === "1" || form?.intent === "create";
  }

  function editRolesDrawerOpen() {
    return page.url.searchParams.has("editRoles") || form?.intent === "updateRoles";
  }

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

  function editRolesHref(userId?: string) {
    const url = new URL(page.url);

    if (userId) {
      url.searchParams.set("editRoles", userId);
    } else {
      url.searchParams.delete("editRoles");
    }

    const search = url.searchParams.toString();
    return `${url.pathname}${search ? `?${search}` : ""}`;
  }

  function selectedUserId() {
    return page.url.searchParams.get("editRoles") ?? "";
  }

  function selectedRoleIds() {
    if (form?.intent === "updateRoles") {
      const values = form?.values as { roleIds?: string[] } | undefined;
      return values?.roleIds ?? [];
    }

    const userRoleIdsByUserId = data.userRoleIdsByUserId as Record<string, string[]>;
    return userRoleIdsByUserId[selectedUserId()] ?? [];
  }

  $effect(() => {
    if (editRolesDrawerOpen()) {
      editRolesOpen = true;
    }
  });

  $effect(() => {
    if (!editRolesOpen && page.url.searchParams.has("editRoles")) {
      void goto(editRolesHref(), { keepFocus: true, noScroll: true, replaceState: true });
    }
  });

  function createUserValues() {
    if (form?.intent !== "create") {
      return undefined;
    }

    return form.values as
      | {
          logtoUserId?: string;
          displayName?: string;
          email?: string;
        }
      | undefined;
  }

  onMount(() => {
    if (data.notice) {
      toastSuccess("User created", data.notice);
    }

    if (data.errorMessage) {
      toastError("Users unavailable", data.errorMessage);
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
          <th class="px-4 py-3">Name</th>
          <th class="px-4 py-3">Email</th>
          <th class="px-4 py-3">Logto User ID</th>
          <th class="px-4 py-3 text-right">Roles</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border">
        {#if data.users.length === 0}
          <tr>
            <td colspan="4" class="px-4 py-6 text-center text-muted-foreground">No users are available yet.</td>
          </tr>
        {:else}
          {#each data.users as user}
            <tr>
              <td class="px-4 py-3 font-medium">{user.displayName || "No name"}</td>
              <td class="px-4 py-3 text-muted-foreground">{user.email || "No email"}</td>
              <td class="px-4 py-3 text-xs text-muted-foreground">{user.logtoUserId}</td>
              <td class="px-4 py-3 text-right">
                <a href={editRolesHref(user.id)} aria-label="Edit roles" title="Edit roles">
                  <Button variant="outline" size="icon-sm">
                    <SquarePenIcon />
                    <span class="sr-only">Edit roles</span>
                  </Button>
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
      <a href={drawerHref(false)} class="absolute inset-0 bg-black/30" aria-label="Close new user dialog"></a>

      <div class="absolute inset-y-0 right-0 w-full max-w-xl overflow-y-auto border-s border-border bg-background p-6">
        <h2 class="text-xl font-semibold">Create user</h2>

        {#if form?.message}
          <p class="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{form.message}</p>
        {/if}

        <form method="POST" action="?/create" class="mt-4 space-y-4">
          <div>
            <label class="text-sm font-medium" for="logtoUserId">Logto user ID</label>
            <input
              id="logtoUserId"
              name="logtoUserId"
              value={createUserValues()?.logtoUserId ?? ""}
              class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="logto|abc123"
            />
            {#if form?.errors?.logtoUserId}
              <p class="mt-1 text-sm text-rose-600">{form.errors.logtoUserId}</p>
            {/if}
          </div>

          <div>
            <label class="text-sm font-medium" for="displayName">Display name</label>
            <input
              id="displayName"
              name="displayName"
              value={createUserValues()?.displayName ?? ""}
              class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Alex Rivera"
            />
          </div>

          <div>
            <label class="text-sm font-medium" for="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={createUserValues()?.email ?? ""}
              class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="alex@aionsoft.io"
            />
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <a href={drawerHref(false)} class="rounded-md border border-border px-4 py-2 text-sm font-medium">Cancel</a>
            <button class="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">Save user</button>
          </div>
        </form>
      </div>
    </div>
  {/if}

  <Sheet.Root bind:open={editRolesOpen}>
    <Sheet.Content side="right" class="w-full max-w-xl overflow-y-auto p-0 [&>button]:hidden">
      <Sheet.Header class="p-6 pb-2">
        <Sheet.Title>Edit user roles</Sheet.Title>
      </Sheet.Header>

      <div class="px-6 pb-6">
        {#if form?.intent === "updateRoles" && form?.message}
          <p class="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{form.message}</p>
        {/if}

        <form method="POST" action="?/updateRoles" class="mt-4 flex flex-col gap-4">
          <input type="hidden" name="userId" value={selectedUserId()} />

          <div class="flex flex-col gap-2">
            <p class="text-sm font-medium">Select roles</p>
            {#if data.roles.length === 0}
              <p class="text-sm text-muted-foreground">No roles available.</p>
            {:else}
              {#each data.roles as role}
                <label class="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                  <input type="checkbox" name="roleIds" value={role.id} checked={selectedRoleIds().includes(role.id)} />
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
