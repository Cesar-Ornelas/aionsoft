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

  function editDescriptionDrawerOpen() {
    return page.url.searchParams.has("editDescription") || form?.intent === "updateDescription";
  }

  let editDescriptionOpen = $state(false);

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

  function editDescriptionHref(permissionId?: string) {
    const url = new URL(page.url);

    if (permissionId) {
      url.searchParams.set("editDescription", permissionId);
    } else {
      url.searchParams.delete("editDescription");
    }

    const search = url.searchParams.toString();
    return `${url.pathname}${search ? `?${search}` : ""}`;
  }

  function selectedPermissionId() {
    return page.url.searchParams.get("editDescription") ?? "";
  }

  function selectedPermissionDescription() {
    if (form?.intent === "updateDescription") {
      const values = form.values as { description?: string } | undefined;
      return values?.description ?? "";
    }

    const selectedPermission = data.permissions.find((permission) => permission.id === selectedPermissionId());
    return selectedPermission?.description ?? "";
  }

  function selectedPermission() {
    return data.permissions.find((permission) => permission.id === selectedPermissionId()) ?? null;
  }

  function createPermissionValues() {
    if (form?.intent !== "create") {
      return undefined;
    }

    return form.values as
      | {
          key?: string;
          description?: string;
        }
      | undefined;
  }

  $effect(() => {
    if (editDescriptionDrawerOpen()) {
      editDescriptionOpen = true;
    }
  });

  $effect(() => {
    if (!editDescriptionOpen && page.url.searchParams.has("editDescription")) {
      void goto(editDescriptionHref(), { keepFocus: true, noScroll: true, replaceState: true });
    }
  });

  onMount(() => {
    if (data.notice) {
      toastSuccess("Permission created", data.notice);
    }

    if (data.errorMessage) {
      toastError("Permissions unavailable", data.errorMessage);
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
          <th class="px-4 py-3">Permission</th>
          <th class="px-4 py-3">Description</th>
          <th class="px-4 py-3">Name</th>
          <th class="px-4 py-3 text-right">Edit</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border">
        {#if data.permissions.length === 0}
          <tr>
            <td colspan="4" class="px-4 py-6 text-center text-muted-foreground">No permissions are available yet.</td>
          </tr>
        {:else}
          {#each data.permissions as permission}
            <tr>
              <td class="px-4 py-3 font-medium">{permission.key}</td>
              <td class="px-4 py-3 text-muted-foreground">{permission.description || "No description"}</td>
              <td class="px-4 py-3 text-muted-foreground">{permission.name}</td>
              <td class="px-4 py-3 text-right">
                <a href={editDescriptionHref(permission.id)} aria-label="Edit description" title="Edit description">
                  <Button variant="outline" size="icon-sm">
                    <SquarePenIcon />
                    <span class="sr-only">Edit description</span>
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
      <a href={drawerHref(false)} class="absolute inset-0 bg-black/30" aria-label="Close new permission dialog"></a>

      <div class="absolute inset-y-0 right-0 w-full max-w-xl overflow-y-auto border-s border-border bg-background p-6">
        <h2 class="text-xl font-semibold">Create permission</h2>

        {#if form?.message}
          <p class="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{form.message}</p>
        {/if}

        <form method="POST" action="?/create" class="mt-4 space-y-4">
          <div>
            <label class="text-sm font-medium" for="key">Permission key</label>
            <input
              id="key"
              name="key"
              value={createPermissionValues()?.key ?? ""}
              class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="manage:users"
            />
            {#if form?.errors?.key}
              <p class="mt-1 text-sm text-rose-600">{form.errors.key}</p>
            {/if}
          </div>

          <div>
            <label class="text-sm font-medium" for="description">Description</label>
            <textarea
              id="description"
              name="description"
              rows="4"
              class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Describe what this permission allows"
            >{createPermissionValues()?.description ?? ""}</textarea>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <a href={drawerHref(false)} class="rounded-md border border-border px-4 py-2 text-sm font-medium">Cancel</a>
            <button class="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">Save permission</button>
          </div>
        </form>
      </div>
    </div>
  {/if}

  <Sheet.Root bind:open={editDescriptionOpen}>
    <Sheet.Content side="right" class="w-full max-w-xl overflow-y-auto p-0 [&>button]:hidden">
      <Sheet.Header class="p-6 pb-2">
        <Sheet.Title>Edit Permissions</Sheet.Title>
      </Sheet.Header>

      <div class="px-6 pb-6">
        {#if selectedPermission()}
          {@const permission = selectedPermission()!}
          <p class="mt-2 text-sm font-medium text-foreground">{permission.name}</p>
        {/if}

        {#if form?.intent === "updateDescription" && form?.message}
          <p class="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{form.message}</p>
        {/if}

        <form method="POST" action="?/updateDescription" class="mt-4 flex flex-col gap-4">
          <input type="hidden" name="permissionId" value={selectedPermissionId()} />

          <div>
            <label class="text-sm font-medium" for="edit-description">Description</label>
            <textarea
              id="edit-description"
              name="description"
              rows="5"
              class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Describe what this permission allows"
            >{selectedPermissionDescription()}</textarea>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <Sheet.Close>
              {#snippet child({ props })}
                <a href={editDescriptionHref()} class="rounded-md border border-border px-4 py-2 text-sm font-medium" {...props}>Cancel</a>
              {/snippet}
            </Sheet.Close>
            <button class="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">Save</button>
          </div>
        </form>
      </div>
    </Sheet.Content>
  </Sheet.Root>
</section>
