<script>
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { toast } from '$lib/stores/toast.js';

  let users = $state([]);
  let isLoading = $state(true);
  let showCreateDialog = $state(false);
  let showEditDialog = $state(false);
  let editingUser = $state(null);
  let showDeleteDialog = $state(false);
  let deletingUser = $state(null);
  let deleteConfirmationText = $state('');
  let copyState = $state('');
  let formError = $state('');
  let isSubmitting = $state(false);
  let avatarFile = $state(null);

  let form = $state({
    name: '',
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    timezone: 'UTC',
    status: 'Active'
  });

  const statusOptions = ['Active', 'Pending', 'Inactive'];

  async function loadUsers() {
    isLoading = true;

    try {
      const response = await fetch('/management/users');
      const data = await response.json();
      users = Array.isArray(data) ? data : [];
    } catch {
      users = [];
    } finally {
      isLoading = false;
    }
  }

  function resetForm() {
    form = {
      name: '',
      email: '',
      username: '',
      first_name: '',
      last_name: '',
      timezone: 'UTC',
      status: 'Active'
    };
    avatarFile = null;
    formError = '';
  }

  function openCreateDialog() {
    editingUser = null;
    showEditDialog = false;
    resetForm();
    showCreateDialog = true;
  }

  function openEditDialog(user) {
    editingUser = user;
    showCreateDialog = false;
    form = {
      name: user.name || '',
      email: user.email || '',
      username: user.username || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      timezone: user.timezone || 'UTC',
      status: user.status || 'Active'
    };
    avatarFile = null;
    formError = '';
    showEditDialog = true;
  }

  function closeCreateDialog() {
    showCreateDialog = false;
    resetForm();
  }

  function closeEditDialog() {
    showEditDialog = false;
    editingUser = null;
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

  function openDeleteDialog(user) {
    deletingUser = user;
    deleteConfirmationText = '';
    showDeleteDialog = true;
  }

  function closeDeleteDialog() {
    showDeleteDialog = false;
    deletingUser = null;
    deleteConfirmationText = '';
  }

  function canDeleteUser() {
    return !!deletingUser && deletingUser.name.trim() === deleteConfirmationText.trim();
  }

  function validateUserForm() {
    if (!form.name.trim()) {
      return 'User name is required.';
    }

    if (!form.email.trim()) {
      return 'Email is required.';
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(form.email.trim())) {
      return 'Enter a valid email address.';
    }

    return '';
  }

  function handleAvatarChange(event) {
    const file = event?.target?.files?.[0] ?? null;
    avatarFile = file;
  }

  async function submitUser() {
    const error = validateUserForm();
    if (error) {
      formError = error;
      toast.error(error);
      return;
    }

    isSubmitting = true;
    formError = '';

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        username: form.username.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        timezone: form.timezone.trim(),
        status: form.status
      };

      const endpoint = editingUser ? `/management/users?id=${encodeURIComponent(editingUser.id)}` : '/management/users';
      const method = editingUser ? 'PATCH' : 'POST';
      const useMultipart = Boolean(avatarFile);
      const body = useMultipart ? new FormData() : JSON.stringify(payload);

      if (useMultipart) {
        Object.entries(payload).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            body.append(key, value);
          }
        });

        if (!editingUser) {
          body.append('password', 'Welcome123!');
          body.append('passwordConfirm', 'Welcome123!');
        }

        if (avatarFile) {
          body.append('avatar', avatarFile);
        }
      } else {
        if (!editingUser) {
          payload.password = 'Welcome123!';
          payload.passwordConfirm = payload.password;
        }
      }

      const requestOptions = { method };
      if (useMultipart) {
        requestOptions.body = body;
      } else {
        requestOptions.headers = { 'content-type': 'application/json' };
        requestOptions.body = JSON.stringify(payload);
      }

      const response = await fetch(endpoint, requestOptions);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Unable to save user.');
      }

      if (editingUser) {
        toast.success('User updated successfully.');
        closeEditDialog();
      } else {
        toast.success('User created successfully.');
        closeCreateDialog();
      }

      await loadUsers();
    } catch (error) {
      const msg = error?.message || 'Unable to save user.';
      formError = msg;
      toast.error(msg);
    } finally {
      isSubmitting = false;
    }
  }

  async function deleteUser(userId) {
    if (!userId) return;

    try {
      const response = await fetch(`/management/users?id=${encodeURIComponent(userId)}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Unable to delete user.');
      }

      closeDeleteDialog();
      toast.success('User deleted successfully.');
      await loadUsers();
    } catch (error) {
      const msg = error?.message || 'Unable to delete user.';
      toast.error(msg);
    }
  }

  loadUsers();
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between gap-4">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.24em] text-sky-500">Management</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">Users</h1>
    </div>
    <Dialog.Root bind:open={showCreateDialog}>
      <Dialog.Trigger>
        {#snippet child({ props })}
          <button type="button" {...props} onclick={openCreateDialog} class="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Add user</button>
        {/snippet}
      </Dialog.Trigger>

      <Dialog.Content class="!w-[min(92vw,560px)] !max-w-[560px]">
        <Dialog.Header>
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-500">Create</p>
            <Dialog.Title class="mt-2">Add user</Dialog.Title>
          </div>
        </Dialog.Header>

        <div class="space-y-4 px-1">
          <div class="grid gap-4 md:grid-cols-2">
            <label class="space-y-2 text-sm">
              <span class="text-muted-foreground">Name</span>
              <input bind:value={form.name} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0" placeholder="Jordan Smith" />
            </label>

            <label class="space-y-2 text-sm">
              <span class="text-muted-foreground">Email</span>
              <input bind:value={form.email} type="email" class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0" placeholder="jordan@aionsoft.local" />
            </label>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <label class="space-y-2 text-sm">
              <span class="text-muted-foreground">Username</span>
              <input bind:value={form.username} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0" placeholder="jordansmith" />
            </label>

            <label class="space-y-2 text-sm">
              <span class="text-muted-foreground">Status</span>
              <select bind:value={form.status} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0">
                {#each statusOptions as status (status)}
                  <option value={status}>{status}</option>
                {/each}
              </select>
            </label>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <label class="space-y-2 text-sm">
              <span class="text-muted-foreground">First name</span>
              <input bind:value={form.first_name} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0" placeholder="Jordan" />
            </label>

            <label class="space-y-2 text-sm">
              <span class="text-muted-foreground">Last name</span>
              <input bind:value={form.last_name} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0" placeholder="Smith" />
            </label>
          </div>

          <div class="grid gap-4 md:grid-cols-1">
            <label class="space-y-2 text-sm">
              <span class="text-muted-foreground">Timezone</span>
              <input bind:value={form.timezone} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0" placeholder="UTC" />
            </label>
          </div>

          <label class="space-y-2 text-sm">
            <span class="text-muted-foreground">Avatar image</span>
            <input type="file" accept="image/*" onchange={handleAvatarChange} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0 file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground" />
          </label>

          {#if formError}
            <p class="text-sm text-destructive">{formError}</p>
          {/if}
        </div>

        <Dialog.Footer class="pt-2">
          <Dialog.Close>
            {#snippet child({ props })}
              <Button type="button" variant="outline" {...props} onclick={closeCreateDialog}>Cancel</Button>
            {/snippet}
          </Dialog.Close>
          <Button type="button" disabled={isSubmitting} onclick={submitUser}>
            {isSubmitting ? 'Saving...' : 'Save user'}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  </div>

  <div class="overflow-hidden rounded-2xl border border-border bg-card">
    {#if isLoading}
      <div class="p-6 text-sm text-muted-foreground">Loading users...</div>
    {:else if users.length === 0}
      <div class="p-6 text-sm text-muted-foreground">No users found.</div>
    {:else}
      <table class="min-w-full text-left text-sm">
        <thead class="border-b border-border bg-muted/30 text-muted-foreground">
          <tr>
            <th class="px-4 py-3 font-medium">Name</th>
            <th class="px-4 py-3 font-medium">Email</th>
            <th class="px-4 py-3 font-medium">Status</th>
            <th class="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each users as user (user.id)}
            <tr class="border-b border-border last:border-b-0">
              <td class="px-4 py-3 font-medium text-foreground">{user.name}</td>
              <td class="px-4 py-3 text-muted-foreground">{user.email}</td>
              <td class="px-4 py-3">
                <span class={user.status === 'Active' ? 'rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-500' : user.status === 'Pending' ? 'rounded-full bg-blue-500/15 px-2 py-1 text-xs font-medium text-blue-500' : 'rounded-full bg-slate-500/15 px-2 py-1 text-xs font-medium text-slate-300'}>
                  {user.status || 'Active'}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onclick={() => openEditDialog(user)}
                    class="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onclick={() => openDeleteDialog(user)}
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
  <Dialog.Content class="!w-[min(92vw,560px)] !max-w-[560px]">
    <Dialog.Header>
      <div>
        <p class="text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-500">Edit</p>
        <Dialog.Title class="mt-2">Edit user</Dialog.Title>
      </div>
    </Dialog.Header>

    <div class="space-y-4 px-1">
      <div class="grid gap-4 md:grid-cols-2">
        <label class="space-y-2 text-sm">
          <span class="text-muted-foreground">Name</span>
          <input bind:value={form.name} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0" placeholder="Jordan Smith" />
        </label>

        <label class="space-y-2 text-sm">
          <span class="text-muted-foreground">Email</span>
          <input bind:value={form.email} type="email" class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0" placeholder="jordan@aionsoft.local" />
        </label>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <label class="space-y-2 text-sm">
          <span class="text-muted-foreground">Username</span>
          <input bind:value={form.username} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0" placeholder="jordansmith" />
        </label>

        <label class="space-y-2 text-sm">
          <span class="text-muted-foreground">Status</span>
          <select bind:value={form.status} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0">
            {#each statusOptions as status (status)}
              <option value={status}>{status}</option>
            {/each}
          </select>
        </label>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <label class="space-y-2 text-sm">
          <span class="text-muted-foreground">First name</span>
          <input bind:value={form.first_name} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0" placeholder="Jordan" />
        </label>

        <label class="space-y-2 text-sm">
          <span class="text-muted-foreground">Last name</span>
          <input bind:value={form.last_name} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0" placeholder="Smith" />
        </label>
      </div>

      <div class="grid gap-4 md:grid-cols-1">
        <label class="space-y-2 text-sm">
          <span class="text-muted-foreground">Timezone</span>
          <input bind:value={form.timezone} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0" placeholder="UTC" />
        </label>
      </div>

      <label class="space-y-2 text-sm">
        <span class="text-muted-foreground">Avatar image</span>
        <input type="file" accept="image/*" onchange={handleAvatarChange} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0 file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground" />
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
      <Button type="button" disabled={isSubmitting} onclick={submitUser}>
        {isSubmitting ? 'Saving...' : 'Update user'}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={showDeleteDialog}>
  <Dialog.Content class="!w-[min(92vw,500px)] !max-w-[500px]">
    <Dialog.Header>
      <div>
        <p class="text-[10px] font-semibold uppercase tracking-[0.24em] text-destructive">Delete</p>
        <Dialog.Title class="mt-2">Delete user</Dialog.Title>
      </div>
    </Dialog.Header>

    <div class="space-y-4">
      <p class="text-sm text-muted-foreground">
        This action cannot be undone. Please confirm the exact user name before deleting it.
      </p>

      {#if deletingUser}
        <div class="rounded-xl border border-border bg-muted/20 p-3">
          <div class="flex items-center justify-between gap-3">
            <span class="font-medium text-foreground">{deletingUser.name}</span>
            <Button type="button" variant="outline" size="sm" onclick={() => copyValue(deletingUser.name)}>
              {copyState === 'Copied' ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      {/if}

      <label class="space-y-2 text-sm">
        <span class="text-muted-foreground">Type the exact user name to confirm</span>
        <input
          bind:value={deleteConfirmationText}
          class="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-0"
          placeholder="Aionsoft Admin"
        />
      </label>
    </div>

    <Dialog.Footer class="pt-2">
      <Dialog.Close>
        {#snippet child({ props })}
          <Button type="button" variant="outline" {...props} onclick={closeDeleteDialog}>Cancel</Button>
        {/snippet}
      </Dialog.Close>
      <Button type="button" variant="destructive" disabled={!canDeleteUser()} onclick={() => deleteUser(deletingUser?.id)}>
        Delete user
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
