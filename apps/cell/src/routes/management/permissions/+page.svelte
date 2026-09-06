<script>
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { toast } from '$lib/stores/toast.js';

  let permissions = $state([]);
  let isLoading = $state(true);
  let isSubmitting = $state(false);
  let formError = $state('');
  let showCreateDialog = $state(false);
  let showEditDialog = $state(false);
  let showDeleteDialog = $state(false);
  let editingPermission = $state(null);
  let deletingPermission = $state(null);
  let deleteConfirmationText = $state('');
  let copyState = $state('');

  let form = $state({
    name: '',
    key: '',
    description: '',
    category: 'general'
  });

  async function loadPermissions() {
    isLoading = true;
    try {
      const response = await fetch('/management/permissions');
      const data = await response.json();
      permissions = Array.isArray(data) ? data : [];
    } catch {
      permissions = [];
    } finally {
      isLoading = false;
    }
  }

  async function copyValue(value) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      copyState = 'Copied';
      setTimeout(() => {
        copyState = '';
      }, 1200);
    } catch {
      copyState = 'Copy failed';
      setTimeout(() => {
        copyState = '';
      }, 1200);
    }
  }

  function resetForm() {
    form = { name: '', key: '', description: '', category: 'general' };
    formError = '';
  }

  function openCreateDialog() {
    editingPermission = null;
    showEditDialog = false;
    resetForm();
    showCreateDialog = true;
  }

  function closeCreateDialog() {
    showCreateDialog = false;
    editingPermission = null;
    resetForm();
  }

  function notifySuccess(message) {
    toast.success(message);
  }

  function notifyError(message) {
    toast.error(message);
  }

  function openEditDialog(permission) {
    editingPermission = permission;
    showCreateDialog = false;
    form = {
      name: permission.name || '',
      key: permission.key || '',
      description: permission.description || '',
      category: permission.category || 'general'
    };
    showEditDialog = true;
  }

  function closeEditDialog() {
    showEditDialog = false;
    editingPermission = null;
    resetForm();
  }

  async function submitPermission() {
    if (isSubmitting || !form.name.trim() || !form.key.trim()) {
      return;
    }

    isSubmitting = true;
    formError = '';

    try {
      const endpoint = editingPermission ? `/management/permissions?id=${encodeURIComponent(editingPermission.id)}` : '/management/permissions';
      const method = editingPermission ? 'PATCH' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          key: form.key.trim(),
          description: form.description.trim(),
          category: form.category.trim()
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || (editingPermission ? 'Unable to update permission.' : 'Unable to create permission.'));
      }

      if (editingPermission) {
        showEditDialog = false;
        closeEditDialog();
        notifySuccess('Permission updated successfully.');
      } else {
        showCreateDialog = false;
        resetForm();
        notifySuccess('Permission created successfully.');
      }

      await loadPermissions();
    } catch (error) {
      const message = error?.message || (editingPermission ? 'Unable to update permission.' : 'Unable to create permission.');
      formError = message;
      notifyError(message);
    } finally {
      isSubmitting = false;
    }
  }

  function openDeleteDialog(permission) {
    deletingPermission = permission;
    deleteConfirmationText = '';
    showDeleteDialog = true;
  }

  function closeDeleteDialog() {
    showDeleteDialog = false;
    deletingPermission = null;
    deleteConfirmationText = '';
  }

  function canDeletePermission() {
    return !!deletingPermission && deletingPermission.name.trim() === deleteConfirmationText.trim();
  }

  async function deletePermission(permissionId) {
    if (!permissionId) return;

    try {
      const response = await fetch(`/management/permissions?id=${encodeURIComponent(permissionId)}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Unable to delete permission.');
      }

      closeDeleteDialog();
      notifySuccess('Permission deleted successfully.');
      await loadPermissions();
    } catch (error) {
      const message = error?.message || 'Unable to delete permission.';
      formError = message;
      notifyError(message);
    }
  }

  loadPermissions();
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.24em] text-sky-500">Management</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">Permissions</h1>
    </div>

    <Dialog.Root bind:open={showCreateDialog}>
      <Dialog.Trigger>
        {#snippet child({ props })}
          <Button type="button" {...props} onclick={openCreateDialog}>New permission</Button>
        {/snippet}
      </Dialog.Trigger>

      <Dialog.Content class="!w-[min(92vw,640px)] !max-w-[640px]">
        <Dialog.Header>
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-500">Create</p>
            <Dialog.Title class="mt-2">New permission</Dialog.Title>
          </div>
        </Dialog.Header>

        <div class="space-y-4 px-1">
          <div class="grid gap-4 md:grid-cols-2">
            <label class="space-y-2 text-sm">
              <span class="text-muted-foreground">Name</span>
              <input bind:value={form.name} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0" placeholder="View companies" />
            </label>

            <label class="space-y-2 text-sm">
              <span class="text-muted-foreground">Key</span>
              <input bind:value={form.key} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0" placeholder="companies.read" />
            </label>
          </div>

          <label class="space-y-2 text-sm">
            <span class="text-muted-foreground">Description</span>
            <input bind:value={form.description} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0" placeholder="View company records" />
          </label>

          <label class="space-y-2 text-sm">
            <span class="text-muted-foreground">Category</span>
            <input bind:value={form.category} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0" placeholder="companies" />
          </label>

          {#if formError}
            <p class="text-sm text-destructive">{formError}</p>
          {/if}
        </div>

        <Dialog.Footer class="pt-2">
          <Dialog.Close>
            {#snippet child({ props })}
              <Button type="button" variant="outline" {...props}>Cancel</Button>
            {/snippet}
          </Dialog.Close>
          <Button type="button" disabled={isSubmitting} onclick={submitPermission}>
            {isSubmitting ? 'Saving...' : editingPermission ? 'Update permission' : 'Save permission'}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  </div>

  <div class="overflow-hidden rounded-2xl border border-border bg-card">
    {#if isLoading}
      <div class="p-6 text-sm text-muted-foreground">Loading permissions...</div>
    {:else if permissions.length === 0}
      <div class="p-6 text-sm text-muted-foreground">No permissions configured yet.</div>
    {:else}
      <table class="min-w-full text-left text-sm">
        <thead class="border-b border-border bg-muted/30 text-muted-foreground">
          <tr>
            <th class="px-4 py-3 font-medium">Name</th>
            <th class="px-4 py-3 font-medium">Key</th>
            <th class="px-4 py-3 font-medium">Category</th>
            <th class="px-4 py-3 font-medium">Description</th>
            <th class="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each permissions as permission (permission.id)}
            <tr class="border-b border-border last:border-b-0">
              <td class="px-4 py-3 font-medium text-foreground">{permission.name}</td>
              <td class="px-4 py-3 text-muted-foreground">{permission.key}</td>
              <td class="px-4 py-3 text-muted-foreground">{permission.category || '—'}</td>
              <td class="px-4 py-3 text-muted-foreground">{permission.description || '—'}</td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onclick={() => openEditDialog(permission)}
                    class="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onclick={() => openDeleteDialog(permission)}
                    class="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs font-medium text-destructive"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>

</div>

<Dialog.Root bind:open={showEditDialog}>
  <Dialog.Content class="!w-[min(92vw,640px)] !max-w-[640px]">
    <Dialog.Header>
      <div>
        <p class="text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-500">Edit</p>
        <Dialog.Title class="mt-2">Edit permission</Dialog.Title>
      </div>
    </Dialog.Header>

    <div class="space-y-4 px-1">
      <div class="grid gap-4 md:grid-cols-2">
        <label class="space-y-2 text-sm">
          <span class="text-muted-foreground">Name</span>
          <input bind:value={form.name} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0" placeholder="View companies" />
        </label>

        <label class="space-y-2 text-sm">
          <span class="text-muted-foreground">Key</span>
          <input bind:value={form.key} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0" placeholder="companies.read" />
        </label>
      </div>

      <label class="space-y-2 text-sm">
        <span class="text-muted-foreground">Description</span>
        <input bind:value={form.description} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0" placeholder="View company records" />
      </label>

      <label class="space-y-2 text-sm">
        <span class="text-muted-foreground">Category</span>
        <input bind:value={form.category} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0" placeholder="companies" />
      </label>

      {#if formError}
        <p class="text-sm text-destructive">{formError}</p>
      {/if}
    </div>

    <Dialog.Footer class="pt-2">
      <Dialog.Close>
        {#snippet child({ props })}
          <Button type="button" variant="outline" {...props} onclick={closeEditDialog}>Cancel</Button>
        {/snippet}
      </Dialog.Close>
      <Button type="button" disabled={isSubmitting} onclick={submitPermission}>
        {isSubmitting ? 'Saving...' : 'Update permission'}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={showDeleteDialog}>
  <Dialog.Content class="!w-[min(92vw,500px)] !max-w-[500px]">
    <Dialog.Header>
      <div>
        <p class="text-[10px] font-semibold uppercase tracking-[0.24em] text-destructive">Delete</p>
        <Dialog.Title class="mt-2">Delete permission</Dialog.Title>
      </div>
    </Dialog.Header>

    <div class="space-y-4">
      <p class="text-sm text-muted-foreground">
        This action cannot be undone. Please confirm the exact permission name before deleting it.
      </p>

      {#if deletingPermission}
        <div class="rounded-xl border border-border bg-muted/20 p-3">
          <div class="flex items-center justify-between gap-3">
            <span class="font-medium text-foreground">{deletingPermission.name}</span>
            <Button type="button" variant="outline" size="sm" onclick={() => copyValue(deletingPermission.name)}>
              {copyState === 'Copied' ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      {/if}

      <label class="space-y-2 text-sm">
        <span class="text-muted-foreground">Type the exact permission name to confirm</span>
        <input
          bind:value={deleteConfirmationText}
          class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0"
          placeholder="View companies"
        />
      </label>

      {#if formError}
        <p class="text-sm text-destructive">{formError}</p>
      {/if}
    </div>

    <Dialog.Footer class="pt-2">
      <Dialog.Close>
        {#snippet child({ props })}
          <Button type="button" variant="outline" {...props} onclick={closeDeleteDialog}>Cancel</Button>
        {/snippet}
      </Dialog.Close>
      <Button type="button" variant="destructive" disabled={!canDeletePermission()} onclick={() => deletePermission(deletingPermission?.id)}>
        Delete permission
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
