<script>
  import { onMount } from 'svelte';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';

  let isApplying = $state(false);
  let applyError = $state('');
  let applyResult = $state(null);
  let migrations = $state([]);
  let selectedMigration = $state(null);
  let showPreview = $state(false);

  function getStatusPill(status) {
    const normalized = String(status || 'pending').toLowerCase();

    switch (normalized) {
      case 'applied':
        return 'bg-emerald-500/15 text-emerald-500';
      case 'failed':
        return 'bg-red-500/15 text-red-500';
      default:
        return 'bg-amber-500/15 text-amber-500';
    }
  }

  async function loadMigrations() {
    try {
      const response = await fetch('/management/migrations');
      const data = await response.json();
      migrations = Array.isArray(data?.migrations) ? data.migrations : [];

      if (!migrations.length) {
        selectedMigration = null;
        return;
      }

      selectedMigration =
        migrations.find((migration) => migration.version === selectedMigration?.version) || migrations[0];
    } catch {
      migrations = [];
      selectedMigration = null;
    }
  }

  async function applyMigration() {
    if (isApplying || !selectedMigration?.payload) return;

    isApplying = true;
    applyError = '';
    applyResult = null;

    try {
      const response = await fetch('/management/migrations', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({ payload: selectedMigration.payload })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Migration failed.');
      }

      applyResult = result;
      showPreview = false;
      await loadMigrations();
    } catch (error) {
      applyError = error?.message || 'Unable to apply migration.';
    } finally {
      isApplying = false;
    }
  }

  onMount(() => {
    loadMigrations();
  });
</script>

<Dialog.Root bind:open={showPreview}>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-sky-500">Management</p>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">Migrations</h1>
      </div>
      <Dialog.Trigger>
        {#snippet child({ props })}
          <Button type="button" {...props}>Run pending</Button>
        {/snippet}
      </Dialog.Trigger>
    </div>

    <div class="overflow-hidden rounded-2xl border border-border bg-card">
      <table class="min-w-full text-left text-sm">
        <thead class="border-b border-border bg-muted/30 text-muted-foreground">
          <tr>
            <th class="px-4 py-3 font-medium">Migration</th>
            <th class="px-4 py-3 font-medium">Version</th>
            <th class="px-4 py-3 font-medium">Status</th>
            <th class="px-4 py-3 font-medium">Applied</th>
            <th class="px-4 py-3 font-medium">Preview</th>
          </tr>
        </thead>
        <tbody>
          {#if migrations.length === 0}
            <tr>
              <td colspan="5" class="px-4 py-6 text-center text-muted-foreground">No migrations found.</td>
            </tr>
          {:else}
            {#each migrations as migration}
              <tr class="border-b border-border last:border-b-0">
                <td class="px-4 py-3 font-medium text-foreground">{migration.name}</td>
                <td class="px-4 py-3 text-muted-foreground">{migration.version}</td>
                <td class="px-4 py-3">
                  <span class={`rounded-full px-2 py-1 text-xs font-medium ${getStatusPill(migration.status)}`}>
                    {migration.status ? migration.status.charAt(0).toUpperCase() + migration.status.slice(1) : 'Pending'}
                  </span>
                </td>
                <td class="px-4 py-3 text-muted-foreground">{migration.applied_at ? new Date(migration.applied_at).toLocaleString() : '—'}</td>
                <td class="px-4 py-3">
                  <Dialog.Trigger>
                    {#snippet child({ props })}
                      <button
                        type="button"
                        class="text-sm font-medium text-sky-500"
                        {...props}
                        onclick={() => {
                          selectedMigration = migration;
                          showPreview = true;
                        }}
                      >
                        View
                      </button>
                    {/snippet}
                  </Dialog.Trigger>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>

  {#if selectedMigration}
    <Dialog.Content class="!w-[min(98vw,1440px)] !max-w-[1440px]">
      <Dialog.Header>
        <div>
          <p class="text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-500">Migration preview</p>
          <Dialog.Title class="mt-2">{selectedMigration.name}</Dialog.Title>
        </div>
      </Dialog.Header>

      <div class="space-y-4 px-6 pb-6">
        <Dialog.Description class="sr-only text-muted-foreground">
          Review the migration payload before applying it.
        </Dialog.Description>

        <div class="grid gap-4 md:grid-cols-2">
          <div class="rounded-lg border border-border bg-muted/40 p-5">
            <p class="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Version</p>
            <p class="mt-2.5 font-medium text-foreground">{selectedMigration.version}</p>
          </div>
          <div class="rounded-lg border border-border bg-muted/40 p-5">
            <p class="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Status</p>
            <p class="mt-2.5 font-medium text-foreground">{selectedMigration.status ? selectedMigration.status.charAt(0).toUpperCase() + selectedMigration.status.slice(1) : 'Pending'}</p>
          </div>
        </div>

        <div class="rounded-lg border border-border bg-background p-5">
          <p class="mb-4 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Payload</p>
          <div class="max-h-[50vh] overflow-auto rounded-md border border-border bg-[#0b1020] p-4" style="overflow-x: auto; scrollbar-gutter: stable both-edges;">
            <pre class="m-0 min-w-[640px] whitespace-pre-wrap break-words text-sm leading-6 text-foreground">{JSON.stringify(selectedMigration.payload, null, 2)}</pre>
          </div>
        </div>
      </div>

      <Dialog.Footer>
        <Dialog.Close>
          {#snippet child({ props })}
            <Button type="button" variant="outline" {...props}>Cancel</Button>
          {/snippet}
        </Dialog.Close>
        <Button type="button" disabled={isApplying} aria-busy={isApplying} onclick={applyMigration}>
          {#if isApplying}
            <span class="inline-flex items-center gap-2">
              <span class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
              Applying...
            </span>
          {:else}
            Apply migration
          {/if}
        </Button>
      </Dialog.Footer>

      {#if applyError}
        <p class="px-6 pb-2 text-sm text-destructive">{applyError}</p>
      {/if}

      {#if applyResult}
        <div class="px-6 pb-6 text-sm text-muted-foreground">
          <p class="font-medium text-foreground">Migration complete</p>
          <p class="mt-1">Created: {applyResult.created} · Updated: {applyResult.updated} · Skipped: {applyResult.skipped}</p>
        </div>
      {/if}
    </Dialog.Content>
  {/if}
</Dialog.Root>
