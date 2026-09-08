<script>
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { toast } from '$lib/stores/toast.js';

  let groups = $state([]);
  let isLoading = $state(true);
  let isSubmitting = $state(false);
  let isDeleting = $state(false);
  let formError = $state('');
  let showCreateDialog = $state(false);
  let showEditDialog = $state(false);
  let showDeleteDialog = $state(false);
  let editingGroup = $state(null);
  let deletingGroup = $state(null);
  let deleteConfirmationText = $state('');
  let copyState = $state('');

  let form = $state({
    name: '',
    slug: '',
    description: '',
    status: 'active'
  });

  async function loadGroups() {
    isLoading = true;
    try {
      const response = await fetch('/management/groups');
      const data = await response.json();
      groups = Array.isArray(data) ? data : [];
    } catch {
      groups = [];
    } finally {
      isLoading = false;
    }
  }

  function resetForm() {
    form = { name: '', slug: '', description: '', status: 'active' };
    formError = '';
  }

  function openCreateDialog() {
    editingGroup = null;
    showEditDialog = false;
    resetForm();
    showCreateDialog = true;
  }

  function closeCreateDialog() {
    showCreateDialog = false;
    editingGroup = null;
    resetForm();
  }

  function notifySuccess(message) {
    toast.success(message);
  }

  function notifyError(message) {
    toast.error(message);
  }

  function openEditDialog(group) {
    editingGroup = group;
    showCreateDialog = false;
    form = {
      name: group.name || '',
      slug: group.slug || '',
      description: group.description || '',
      status: group.status || 'active'
    };
    showEditDialog = true;
  }

  function closeEditDialog() {
    showEditDialog = false;
    editingGroup = null;
    resetForm();
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

  function openDeleteDialog(group) {
    deletingGroup = group;
    deleteConfirmationText = '';
    showDeleteDialog = true;
  }

  function closeDeleteDialog() {
    showDeleteDialog = false;
    deletingGroup = null;
    deleteConfirmationText = '';
  }

  function canDeleteGroup() {
    return !!deletingGroup && deletingGroup.name.trim() === deleteConfirmationText.trim();
  }

  async function submitGroup() {
    if (isSubmitting || !form.name.trim() || !form.slug.trim()) {
      return;
    }

    isSubmitting = true;
    formError = '';

    try {
      const endpoint = editingGroup ? `/management/groups?id=${encodeURIComponent(editingGroup.id)}` : '/management/groups';
      const method = editingGroup ? 'PATCH' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug.trim(),
          description: form.description.trim(),
          status: form.status
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || (editingGroup ? 'Unable to update group.' : 'Unable to create group.'));
      }

      if (editingGroup) {
        showEditDialog = false;
        closeEditDialog();
        notifySuccess('Group updated successfully.');
      } else {
        showCreateDialog = false;
        resetForm();
        notifySuccess('Group created successfully.');
      }

      await loadGroups();
    } catch (error) {
      const message = error?.message || (editingGroup ? 'Unable to update group.' : 'Unable to create group.');
      formError = message;
      notifyError(message);
    } finally {
      isSubmitting = false;
    }
  }

  async function deleteGroup(groupId) {
    if (!groupId || isDeleting) return;

    isDeleting = true;
    formError = '';

    try {
      const response = await fetch(`/management/groups?id=${encodeURIComponent(groupId)}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Unable to delete group.');
      }

      closeDeleteDialog();
      notifySuccess('Group deleted successfully.');
      await loadGroups();
    } catch (error) {
      const message = error?.message || 'Unable to delete group.';
      formError = message;
      notifyError(message);
    } finally {
      isDeleting = false;
    }
  }

  async function confirmDeleteGroup() {
    if (!deletingGroup || !canDeleteGroup()) return;
    await deleteGroup(deletingGroup.id);
  }

  loadGroups();
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between gap-4">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.24em] text-sky-500">Management</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">Groups</h1>
    </div>

    <Dialog.Root bind:open={showCreateDialog}>
      <Dialog.Trigger>
        {#snippet child({ props })}
          <Button type="button" {...props} onclick={openCreateDialog}>New group</Button>
        {/snippet}
      </Dialog.Trigger>

      <Dialog.Content class="!w-[min(92vw,640px)] !max-w-[640px]">
        <Dialog.Header>
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-500">Create</p>
            <Dialog.Title class="mt-2">New group</Dialog.Title>
          </div>
        </Dialog.Header>

        <div class="space-y-4 px-1">
          <div class="grid gap-4 md:grid-cols-2">
            <label class="space-y-2 text-sm">
              <span class="text-muted-foreground">Name</span>
              <input bind:value={form.name} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0" placeholder="Operations" />
            </label>

            <label class="space-y-2 text-sm">
              <span class="text-muted-foreground">Slug</span>
              <input bind:value={form.slug} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0" placeholder="operations" />
            </label>
          </div>

          <label class="space-y-2 text-sm">
            <span class="text-muted-foreground">Description</span>
            <input bind:value={form.description} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0" placeholder="Group description" />
          </label>

          <label class="space-y-2 text-sm">
            <span class="text-muted-foreground">Status</span>
            <select bind:value={form.status} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0">
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
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
          <Button type="button" disabled={isSubmitting} onclick={submitGroup}>
            {isSubmitting ? 'Saving...' : editingGroup ? 'Update group' : 'Save group'}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  </div>

  <div class="overflow-hidden rounded-2xl border border-border bg-card">
    {#if isLoading}
      <div class="p-6 text-sm text-muted-foreground">Loading groups...</div>
    {:else if groups.length === 0}
      <div class="p-6 text-sm text-muted-foreground">No groups configured yet.</div>
    {:else}
      <table class="min-w-full text-left text-sm">
        <thead class="border-b border-border bg-muted/30 text-muted-foreground">
          <tr>
            <th class="px-4 py-3 font-medium">Name</th>
            <th class="px-4 py-3 font-medium">Slug</th>
            <th class="px-4 py-3 font-medium">Description</th>
            <th class="px-4 py-3 font-medium">Status</th>
            <th class="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each groups as group (group.id)}
            <tr class="border-b border-border last:border-b-0">
              <td class="px-4 py-3 font-medium text-foreground">{group.name}</td>
              <td class="px-4 py-3 text-muted-foreground">{group.slug}</td>
              <td class="px-4 py-3 text-muted-foreground">{group.description || '—'}</td>
              <td class="px-4 py-3">
                <span class={group.status === 'active' ? 'rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-500' : 'rounded-full bg-slate-500/15 px-2 py-1 text-xs font-medium text-slate-400'}>
                  {group.status === 'active' ? 'Active' : 'Archived'}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onclick={() => openEditDialog(group)}
                    class="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onclick={() => openDeleteDialog(group)}
                    class="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs font-medium text-destructive disabled:cursor-not-allowed disabled:opacity-60"
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
        <Dialog.Title class="mt-2">Edit group</Dialog.Title>
      </div>
    </Dialog.Header>

    <div class="space-y-4 px-1">
      <div class="grid gap-4 md:grid-cols-2">
        <label class="space-y-2 text-sm">
          <span class="text-muted-foreground">Name</span>
          <input bind:value={form.name} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0" placeholder="Operations" />
        </label>

        <label class="space-y-2 text-sm">
          <span class="text-muted-foreground">Slug</span>
          <input bind:value={form.slug} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0" placeholder="operations" />
        </label>
      </div>

      <label class="space-y-2 text-sm">
        <span class="text-muted-foreground">Description</span>
        <input bind:value={form.description} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0" placeholder="Group description" />
      </label>

      <label class="space-y-2 text-sm">
        <span class="text-muted-foreground">Status</span>
        <select bind:value={form.status} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0">
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
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
      <Button type="button" disabled={isSubmitting} onclick={submitGroup}>
        {isSubmitting ? 'Saving...' : 'Update group'}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={showDeleteDialog}>
  <Dialog.Content class="!w-[min(92vw,500px)] !max-w-[500px]">
    <Dialog.Header>
      <div>
        <p class="text-[10px] font-semibold uppercase tracking-[0.24em] text-destructive">Delete</p>
        <Dialog.Title class="mt-2">Delete group</Dialog.Title>
      </div>
    </Dialog.Header>

    <div class="space-y-4">
      <p class="text-sm text-muted-foreground">
        This action cannot be undone. Please confirm the exact group name before deleting it.
      </p>

      {#if deletingGroup}
        <div class="rounded-xl border border-border bg-muted/20 p-3">
          <div class="flex items-center justify-between gap-3">
            <span class="font-medium text-foreground">{deletingGroup.name}</span>
            <Button type="button" variant="outline" size="sm" onclick={() => copyValue(deletingGroup.name)}>
              {copyState === 'Copied' ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      {/if}

      <label class="space-y-2 text-sm">
        <span class="text-muted-foreground">Type the exact group name to confirm</span>
        <input
          bind:value={deleteConfirmationText}
          class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0"
          placeholder="Operations"
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
      <Button type="button" variant="destructive" disabled={!canDeleteGroup() || isDeleting} onclick={confirmDeleteGroup}>
        {isDeleting ? 'Deleting...' : 'Delete group'}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
