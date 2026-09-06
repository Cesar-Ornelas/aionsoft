<script>
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { toast } from '$lib/stores/toast.js';

  let roles = $state([]);
  let permissionOptions = $state([]);
  let isLoading = $state(true);
  let isSubmitting = $state(false);
  let isDeleting = $state(false);
  let formError = $state('');
  let showCreateDialog = $state(false);
  let showEditDialog = $state(false);
  let showDeleteDialog = $state(false);
  let editingRole = $state(null);
  let deletingRole = $state(null);
  let deleteConfirmationText = $state('');
  let copyState = $state('');

  let selectedPermissionCategory = $state('all');

  let form = $state({
    name: '',
    key: '',
    description: '',
    permissions: []
  });

  const permissionCategories = $derived(
    Array.from(
      new Set(
        permissionOptions
          .map((permission) => (permission.category && permission.category.trim()) || 'general')
          .filter(Boolean)
      )
    ).sort((left, right) => left.localeCompare(right))
  );

  const filteredPermissionOptions = $derived(
    selectedPermissionCategory === 'all'
      ? permissionOptions
      : permissionOptions.filter(
          (permission) =>
            ((permission.category && permission.category.trim()) || 'general') === selectedPermissionCategory
        )
  );

  async function loadRoles() {
    isLoading = true;
    try {
      const response = await fetch('/management/roles');
      const data = await response.json();
      roles = Array.isArray(data) ? data : [];
    } catch {
      roles = [];
    } finally {
      isLoading = false;
    }
  }

  async function loadPermissions() {
    try {
      const response = await fetch('/management/permissions');
      const data = await response.json();
      permissionOptions = Array.isArray(data) ? data : [];
    } catch {
      permissionOptions = [];
    }
  }

  function resetForm() {
    form = { name: '', key: '', description: '', permissions: [] };
    selectedPermissionCategory = 'all';
    formError = '';
  }

  function openCreateDialog() {
    editingRole = null;
    showEditDialog = false;
    resetForm();
    showCreateDialog = true;
  }

  function closeCreateDialog() {
    showCreateDialog = false;
    editingRole = null;
    resetForm();
  }

  function notifySuccess(message) {
    toast.success(message);
  }

  function notifyError(message) {
    toast.error(message);
  }

  function openEditDialog(role) {
    editingRole = role;
    showCreateDialog = false;
    form = {
      name: role.name || '',
      key: role.key || '',
      description: role.description || '',
      permissions: Array.isArray(role.permissions) ? [...role.permissions] : []
    };
    selectedPermissionCategory = 'all';
    showEditDialog = true;
  }

  function closeEditDialog() {
    showEditDialog = false;
    editingRole = null;
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

  function openDeleteDialog(role) {
    deletingRole = role;
    deleteConfirmationText = '';
    showDeleteDialog = true;
  }

  function closeDeleteDialog() {
    showDeleteDialog = false;
    deletingRole = null;
    deleteConfirmationText = '';
  }

  function canDeleteRole() {
    return !!deletingRole && deletingRole.name.trim() === deleteConfirmationText.trim();
  }

  async function submitRole() {
    if (isSubmitting || !form.name.trim() || !form.key.trim()) {
      return;
    }

    isSubmitting = true;
    formError = '';

    try {
      const endpoint = editingRole ? `/management/roles?id=${encodeURIComponent(editingRole.id)}` : '/management/roles';
      const method = editingRole ? 'PATCH' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          key: form.key.trim(),
          description: form.description.trim(),
          permissions: form.permissions
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || (editingRole ? 'Unable to update role.' : 'Unable to create role.'));
      }

      if (editingRole) {
        showEditDialog = false;
        closeEditDialog();
        notifySuccess('Role updated successfully.');
      } else {
        showCreateDialog = false;
        resetForm();
        notifySuccess('Role created successfully.');
      }

      await Promise.all([loadRoles(), loadPermissions()]);
    } catch (error) {
      const message = error?.message || (editingRole ? 'Unable to update role.' : 'Unable to create role.');
      formError = message;
      notifyError(message);
    } finally {
      isSubmitting = false;
    }
  }

  async function deleteRole(roleId) {
    if (!roleId || isDeleting) return;

    isDeleting = true;
    formError = '';

    try {
      const response = await fetch(`/management/roles?id=${encodeURIComponent(roleId)}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Unable to delete role.');
      }

      closeDeleteDialog();
      notifySuccess('Role deleted successfully.');
      await loadRoles();
    } catch (error) {
      const message = error?.message || 'Unable to delete role.';
      formError = message;
      notifyError(message);
    } finally {
      isDeleting = false;
    }
  }

  async function confirmDeleteRole() {
    if (!deletingRole || !canDeleteRole()) return;
    await deleteRole(deletingRole.id);
  }

  loadRoles();
  loadPermissions();
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.24em] text-sky-500">Management</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">Roles</h1>
    </div>

    <Dialog.Root bind:open={showCreateDialog}>
      <Dialog.Trigger>
        {#snippet child({ props })}
          <Button type="button" {...props} onclick={openCreateDialog}>New role</Button>
        {/snippet}
      </Dialog.Trigger>

      <Dialog.Content class="!w-[min(92vw,640px)] !max-w-[640px]">
        <Dialog.Header>
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-500">Create</p>
            <Dialog.Title class="mt-2">New role</Dialog.Title>
          </div>
        </Dialog.Header>

        <div class="space-y-4 px-1">
          <div class="grid gap-4 md:grid-cols-2">
            <label class="space-y-2 text-sm">
              <span class="text-muted-foreground">Name</span>
              <input bind:value={form.name} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0" placeholder="Operations lead" />
            </label>

            <label class="space-y-2 text-sm">
              <span class="text-muted-foreground">Key</span>
              <input bind:value={form.key} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0" placeholder="operations_lead" />
            </label>
          </div>

          <label class="space-y-2 text-sm">
            <span class="text-muted-foreground">Description</span>
            <input bind:value={form.description} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0" placeholder="Role description" />
          </label>

          <div class="space-y-3 text-sm">
            <div class="flex items-center justify-between gap-3">
              <span class="text-muted-foreground">Permissions</span>
              {#if permissionCategories.length}
                <span class="text-xs text-muted-foreground">{filteredPermissionOptions.length} shown</span>
              {/if}
            </div>

            {#if permissionOptions.length === 0}
              <div class="rounded-xl border border-dashed border-border bg-muted/20 p-3 text-sm text-muted-foreground">
                No permissions available yet. Add one from the Permissions page first.
              </div>
            {:else}
              <div class="space-y-3">
                <label class="block space-y-2">
                  <span class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Filter by category</span>
                  <select bind:value={selectedPermissionCategory} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0">
                    <option value="all">All categories</option>
                    {#each permissionCategories as category (category)}
                      <option value={category}>{category}</option>
                    {/each}
                  </select>
                </label>

                <div class="grid gap-2 rounded-xl border border-border bg-muted/20 p-3 sm:grid-cols-2">
                  {#each filteredPermissionOptions as permission (permission.id)}
                    <label class="flex items-center gap-2 rounded-lg border border-border bg-background p-2 text-sm text-foreground">
                      <input bind:group={form.permissions} type="checkbox" value={permission.key} class="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
                      <span class="block font-medium">{permission.name}</span>
                    </label>
                  {/each}
                </div>
              </div>
            {/if}
          </div>

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
          <Button type="button" disabled={isSubmitting} onclick={submitRole}>
            {isSubmitting ? 'Saving...' : editingRole ? 'Update role' : 'Save role'}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  </div>

  <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    {#if isLoading}
      <div class="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground md:col-span-2 xl:col-span-3">Loading roles...</div>
    {:else if roles.length === 0}
      <div class="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground md:col-span-2 xl:col-span-3">No roles configured yet.</div>
    {:else}
      {#each roles as role (role.id)}
        <div class="rounded-2xl border border-border bg-card p-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-foreground">{role.name}</h2>
              <p class="mt-1 text-sm text-muted-foreground">key: {role.key}</p>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                onclick={() => openEditDialog(role)}
                class="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground"
              >
                Edit
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onclick={() => openDeleteDialog(role)}
                class="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs font-medium text-destructive disabled:cursor-not-allowed disabled:opacity-60"
              >
                Delete
              </button>
            </div>
          </div>

          {#if role.description}
            <p class="mt-3 text-sm text-muted-foreground">{role.description}</p>
          {/if}

          {#if Array.isArray(role.permissions) && role.permissions.length}
            <p class="mt-4 text-sm text-foreground">Permissions: {role.permissions.join(', ')}</p>
          {:else}
            <p class="mt-4 text-sm text-foreground">Permissions: none</p>
          {/if}
        </div>
      {/each}
    {/if}
  </div>

</div>

<Dialog.Root bind:open={showEditDialog}>
  <Dialog.Content class="!w-[min(92vw,640px)] !max-w-[640px]">
    <Dialog.Header>
      <div>
        <p class="text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-500">Edit</p>
        <Dialog.Title class="mt-2">Edit role</Dialog.Title>
      </div>
    </Dialog.Header>

    <div class="space-y-4 px-1">
      <div class="grid gap-4 md:grid-cols-2">
        <label class="space-y-2 text-sm">
          <span class="text-muted-foreground">Name</span>
          <input bind:value={form.name} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0" placeholder="Operations lead" />
        </label>

        <label class="space-y-2 text-sm">
          <span class="text-muted-foreground">Key</span>
          <input bind:value={form.key} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0" placeholder="operations_lead" />
        </label>
      </div>

      <label class="space-y-2 text-sm">
        <span class="text-muted-foreground">Description</span>
        <input bind:value={form.description} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0" placeholder="Role description" />
      </label>

      <div class="space-y-3 text-sm">
        <div class="flex items-center justify-between gap-3">
          <span class="text-muted-foreground">Permissions</span>
          {#if permissionCategories.length}
            <span class="text-xs text-muted-foreground">{filteredPermissionOptions.length} shown</span>
          {/if}
        </div>

        {#if permissionOptions.length === 0}
          <div class="rounded-xl border border-dashed border-border bg-muted/20 p-3 text-sm text-muted-foreground">
            No permissions available yet. Add one from the Permissions page first.
          </div>
        {:else}
          <div class="space-y-3">
            <label class="block space-y-2">
              <span class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Filter by category</span>
              <select bind:value={selectedPermissionCategory} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0">
                <option value="all">All categories</option>
                {#each permissionCategories as category (category)}
                  <option value={category}>{category}</option>
                {/each}
              </select>
            </label>

            <div class="grid gap-2 rounded-xl border border-border bg-muted/20 p-3 sm:grid-cols-2">
              {#each filteredPermissionOptions as permission (permission.id)}
                <label class="flex items-center gap-2 rounded-lg border border-border bg-background p-2 text-sm text-foreground">
                  <input bind:group={form.permissions} type="checkbox" value={permission.key} class="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
                  <span class="block font-medium">{permission.name}</span>
                </label>
              {/each}
            </div>
          </div>
        {/if}
      </div>

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
      <Button type="button" disabled={isSubmitting} onclick={submitRole}>
        {isSubmitting ? 'Saving...' : 'Update role'}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={showDeleteDialog}>
  <Dialog.Content class="!w-[min(92vw,500px)] !max-w-[500px]">
    <Dialog.Header>
      <div>
        <p class="text-[10px] font-semibold uppercase tracking-[0.24em] text-destructive">Delete</p>
        <Dialog.Title class="mt-2">Delete role</Dialog.Title>
      </div>
    </Dialog.Header>

    <div class="space-y-4">
      <p class="text-sm text-muted-foreground">
        This action cannot be undone. Please confirm the exact role name before deleting it.
      </p>

      {#if deletingRole}
        <div class="rounded-xl border border-border bg-muted/20 p-3">
          <div class="flex items-center justify-between gap-3">
            <span class="font-medium text-foreground">{deletingRole.name}</span>
            <Button type="button" variant="outline" size="sm" onclick={() => copyValue(deletingRole.name)}>
              {copyState === 'Copied' ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      {/if}

      <label class="space-y-2 text-sm">
        <span class="text-muted-foreground">Type the exact role name to confirm</span>
        <input
          bind:value={deleteConfirmationText}
          class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0"
          placeholder="Operations lead"
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
      <Button type="button" variant="destructive" disabled={!canDeleteRole() || isDeleting} onclick={confirmDeleteRole}>
        {isDeleting ? 'Deleting...' : 'Delete role'}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
