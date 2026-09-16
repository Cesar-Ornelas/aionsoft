<script>
  import Settings2Icon from '@lucide/svelte/icons/settings-2';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import PencilIcon from '@lucide/svelte/icons/pencil';
  import ArchiveIcon from '@lucide/svelte/icons/archive';
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { toast } from '$lib/stores/toast.js';

  let { data } = $props();
  let variables = $state(data.variables ?? []);
  let dialogOpen = $state(false);
  let editing = $state(null);
  let submitting = $state(false);
  let refreshing = $state(false);
  let errorMessage = $state('');
  let form = $state({ label: '', key: '', value: '', description: '' });

  function resetForm() {
    form = { label: '', key: '', value: '', description: '' };
    errorMessage = '';
  }

  function openCreate() {
    editing = null;
    resetForm();
    dialogOpen = true;
  }

  function openEdit(variable) {
    editing = variable;
    form = { label: variable.label || '', key: variable.key || '', value: variable.value || '', description: variable.description || '' };
    errorMessage = '';
    dialogOpen = true;
  }

  async function refresh() {
    refreshing = true;
    try {
      const response = await fetch('/management/configuration');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to refresh configuration.');
      variables = result.variables ?? [];
    } catch (error) {
      toast.error(error.message);
    } finally {
      refreshing = false;
    }
  }

  async function submit() {
    if (submitting) return;
    submitting = true;
    errorMessage = '';
    try {
      const response = await fetch(editing ? `/management/configuration?id=${encodeURIComponent(editing.id)}` : '/management/configuration', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save document variable.');
      dialogOpen = false;
      resetForm();
      toast.success(editing ? 'Document variable updated.' : 'Document variable created.');
      await refresh();
    } catch (error) {
      errorMessage = error.message;
      toast.error(error.message);
    } finally {
      submitting = false;
    }
  }

  async function archive(variable) {
    if (!window.confirm(`Archive ${variable.label}? Existing documents that use it will keep their snapshots.`)) return;
    try {
      const response = await fetch(`/management/configuration?id=${encodeURIComponent(variable.id)}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to archive document variable.');
      toast.success('Document variable archived.');
      await refresh();
    } catch (error) {
      toast.error(error.message);
    }
  }
</script>

<svelte:head><title>Configuration | Aionsoft Cell</title></svelte:head>

<div class="flex flex-col gap-6">
  <section>
    <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-500"><Settings2Icon class="size-4" /> Management</div>
        <h1 class="mt-3 text-3xl font-semibold tracking-tight text-foreground">Configuration</h1>
        <p class="mt-2 max-w-2xl text-sm text-muted-foreground">Manage reusable workspace values used by document templates.</p>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="outline" size="icon" title="Refresh variables" aria-label="Refresh variables" onclick={refresh} disabled={refreshing}><RefreshCwIcon class={refreshing ? 'animate-spin' : ''} /></Button>
        <Dialog.Root bind:open={dialogOpen}>
          <Dialog.Trigger>
            {#snippet child({ props })}<Button {...props} onclick={openCreate}><PlusIcon data-icon="inline-start" />New variable</Button>{/snippet}
          </Dialog.Trigger>
          <Dialog.Content class="!w-[min(92vw,640px)] !max-w-[640px]">
            <Dialog.Header><Dialog.Title>{editing ? 'Edit document variable' : 'New document variable'}</Dialog.Title></Dialog.Header>
            <form class="space-y-4" onsubmit={(event) => { event.preventDefault(); submit(); }}>
              <div class="grid gap-4 sm:grid-cols-2">
                <label class="space-y-2"><span class="text-sm font-medium">Label</span><Input bind:value={form.label} placeholder="Company Name" required /></label>
                <label class="space-y-2"><span class="text-sm font-medium">Key</span><Input bind:value={form.key} placeholder="company_name" pattern="[a-z][a-z0-9_]*" required disabled={!!editing} /><span class="text-xs text-muted-foreground">Use lowercase letters, numbers, and underscores.</span></label>
              </div>
              <label class="block space-y-2"><span class="text-sm font-medium">Value</span><textarea bind:value={form.value} class="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring" placeholder="Aionsoft LLC" required></textarea></label>
              <label class="block space-y-2"><span class="text-sm font-medium">Description <span class="font-normal text-muted-foreground">(optional)</span></span><textarea bind:value={form.description} class="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring" placeholder="Used in document headers and footers."></textarea></label>
              {#if errorMessage}<p class="text-sm text-destructive">{errorMessage}</p>{/if}
              <Dialog.Footer><Button type="button" variant="outline" onclick={() => (dialogOpen = false)}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save variable'}</Button></Dialog.Footer>
            </form>
          </Dialog.Content>
        </Dialog.Root>
      </div>
    </div>
  </section>

  <section class="rounded-2xl border border-border bg-card shadow-sm">
    <div class="border-b border-border p-5"><h2 class="text-lg font-semibold">Global document variables</h2><p class="mt-1 text-sm text-muted-foreground">Insert these values in document editors with the <span class="font-mono">#</span> token.</p></div>
    {#if variables.length}
      <div class="divide-y divide-border">
        {#each variables as variable (variable.id)}
          <div class="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><h3 class="font-medium text-foreground">{variable.label}</h3><span class="rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">#{variable.key}</span></div><p class="mt-2 break-words text-sm text-foreground">{variable.value}</p>{#if variable.description}<p class="mt-1 text-xs text-muted-foreground">{variable.description}</p>{/if}</div>
            <div class="flex shrink-0 items-center gap-2"><Button variant="ghost" size="icon" title="Edit variable" aria-label="Edit variable" onclick={() => openEdit(variable)}><PencilIcon /></Button><Button variant="ghost" size="icon" title="Archive variable" aria-label="Archive variable" onclick={() => archive(variable)}><ArchiveIcon /></Button></div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center"><div class="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground"><Settings2Icon /></div><div><h3 class="font-semibold">No global variables yet</h3><p class="mt-1 max-w-sm text-sm text-muted-foreground">Create a reusable value such as a company name, address, or support email.</p></div><Button onclick={openCreate}><PlusIcon data-icon="inline-start" />Create your first variable</Button></div>
    {/if}
  </section>
</div>
