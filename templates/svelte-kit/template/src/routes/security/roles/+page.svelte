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

  function editPermissionsDrawerOpen() {
    return page.url.searchParams.has("editPermissions") || form?.intent === "updatePermissions";
  }

  let editPermissionsOpen = $state(false);

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

  function editPermissionsHref(roleId?: string) {
    const url = new URL(page.url);

    if (roleId) {
      url.searchParams.set("editPermissions", roleId);
    } else {
      url.searchParams.delete("editPermissions");
    }

    const search = url.searchParams.toString();
    return `${url.pathname}${search ? `?${search}` : ""}`;
  }

  function selectedRoleId() {
    return page.url.searchParams.get("editPermissions") ?? "";
  }

  function selectedPermissionIds() {
    if (form?.intent === "updatePermissions") {
      const values = form?.values as { permissionIds?: string[] } | undefined;
      return values?.permissionIds ?? [];
    }

    const rolePermissionIdsByRoleId = data.rolePermissionIdsByRoleId as Record<string, string[]>;
    return rolePermissionIdsByRoleId[selectedRoleId()] ?? [];
  }

  $effect(() => {
    if (editPermissionsDrawerOpen()) {
      editPermissionsOpen = true;
    }
  });

  $effect(() => {
    if (!editPermissionsOpen && page.url.searchParams.has("editPermissions")) {
      void goto(editPermissionsHref(), { keepFocus: true, noScroll: true, replaceState: true });
    }
  });

  function createRoleValues() {
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

  onMount(() => {
    if (data.notice) {
      toastSuccess("Role created", data.notice);
    }

    if (data.errorMessage) {
      toastError("Roles unavailable", data.errorMessage);
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
          <th class="px-4 py-3">Role</th>
          <th class="px-4 py-3">Description</th>
          <th class="px-4 py-3">Key</th>
          <th class="px-4 py-3 text-right">Permissions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border">
        {#if data.roles.length === 0}
          <tr>
            <td colspan="4" class="px-4 py-6 text-center text-muted-foreground">No roles are available yet.</td>
          </tr>
        {:else}
          {#each data.roles as role}
            <tr>
              <td class="px-4 py-3 font-medium">{role.name}</td>
              <td class="px-4 py-3 text-muted-foreground">{role.description || "No description"}</td>
              <td class="px-4 py-3 text-xs text-muted-foreground">{role.key}</td>
              <td class="px-4 py-3 text-right">
                <a href={editPermissionsHref(role.id)} aria-label="Edit permissions" title="Edit permissions">
                  <Button variant="outline" size="icon-sm">
                    <SquarePenIcon />
                    <span class="sr-only">Edit permissions</span>
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
      <a href={drawerHref(false)} class="absolute inset-0 bg-black/30" aria-label="Close new role dialog"></a>

      <div class="absolute inset-y-0 right-0 w-full max-w-xl overflow-y-auto border-s border-border bg-background p-6">
        <h2 class="text-xl font-semibold">Create role</h2>

        {#if form?.message}
          <p class="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{form.message}</p>
        {/if}

        <form method="POST" action="?/create" class="mt-4 space-y-4">
          <div>
            <label class="text-sm font-medium" for="name">Role name</label>
            <input
              id="name"
              name="name"
              value={createRoleValues()?.name ?? ""}
              class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Security Manager"
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
              placeholder="Describe what this role can manage"
            >{createRoleValues()?.description ?? ""}</textarea>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <a href={drawerHref(false)} class="rounded-md border border-border px-4 py-2 text-sm font-medium">Cancel</a>
            <button class="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">Save role</button>
          </div>
        </form>
      </div>
    </div>
  {/if}

  <Sheet.Root bind:open={editPermissionsOpen}>
    <Sheet.Content side="right" class="w-full max-w-xl overflow-y-auto p-0 [&>button]:hidden">
      <Sheet.Header class="p-6 pb-2">
        <Sheet.Title>Edit role permissions</Sheet.Title>
      </Sheet.Header>

      <div class="px-6 pb-6">
        {#if form?.intent === "updatePermissions" && form?.message}
          <p class="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{form.message}</p>
        {/if}

        <form method="POST" action="?/updatePermissions" class="mt-4 flex flex-col gap-4">
          <input type="hidden" name="roleId" value={selectedRoleId()} />

          <div class="flex flex-col gap-2">
            <p class="text-sm font-medium">Select permissions</p>
            {#if data.permissions.length === 0}
              <p class="text-sm text-muted-foreground">No permissions available.</p>
            {:else}
              {#each data.permissions as permission}
                <label class="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    name="permissionIds"
                    value={permission.id}
                    checked={selectedPermissionIds().includes(permission.id)}
                  />
                  <span class="font-medium">{permission.key}</span>
                  <span class="text-xs text-muted-foreground">{permission.name}</span>
                </label>
              {/each}
            {/if}
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <Sheet.Close>
              {#snippet child({ props })}
                <a href={editPermissionsHref()} class="rounded-md border border-border px-4 py-2 text-sm font-medium" {...props}>Cancel</a>
              {/snippet}
            </Sheet.Close>
            <button class="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">Save</button>
          </div>
        </form>
      </div>
    </Sheet.Content>
  </Sheet.Root>
</section>
