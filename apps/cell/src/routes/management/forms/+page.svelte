<script>
  import { goto } from '$app/navigation';
  import ArchiveIcon from '@lucide/svelte/icons/archive';
  import FilePenLineIcon from '@lucide/svelte/icons/file-pen-line';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import SearchIcon from '@lucide/svelte/icons/search';
  import * as Table from '$lib/components/ui/table';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';

  let { data } = $props();
  let search = $state('');
  let isRefreshing = $state(false);

  const filteredForms = $derived(
    (data.forms ?? []).filter((form) => {
      const query = search.trim().toLowerCase();
      return !query || `${form.name} ${form.description} ${form.category}`.toLowerCase().includes(query);
    })
  );

  const statusVariant = (status) => status === 'published' ? 'default' : status === 'deleted' ? 'destructive' : 'secondary';

  async function refresh() {
    isRefreshing = true;
    await goto('/management/forms', { invalidateAll: true, replaceState: true });
    isRefreshing = false;
  }
</script>

<div class="flex flex-col gap-6">
  <section>
    <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-500">
          <FilePenLineIcon class="size-4" />
          Management
        </div>
        <h1 class="mt-3 text-3xl font-semibold tracking-tight text-foreground">Form Builder</h1>
        <p class="mt-2 max-w-2xl text-sm text-muted-foreground">Design workspace forms, manage review status, and publish immutable versions.</p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" title="Refresh forms" aria-label="Refresh forms" onclick={refresh} disabled={isRefreshing}>
          <RefreshCwIcon class={isRefreshing ? 'animate-spin' : ''} />
        </Button>
        <Button href="/management/forms/new">
          <PlusIcon data-icon="inline-start" />
          New form
        </Button>
      </div>
    </div>
  </section>

  <section class="rounded-2xl border border-border bg-card shadow-sm">
    <div class="flex flex-col gap-4 border-b border-border p-5 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 class="text-lg font-semibold text-foreground">Forms</h2>
        <p class="mt-1 text-sm text-muted-foreground">{data.forms?.length ?? 0} total forms</p>
      </div>
      <div class="relative w-full md:max-w-xs">
        <SearchIcon class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input bind:value={search} class="pl-9" placeholder="Search forms" aria-label="Search forms" />
      </div>
    </div>

    {#if filteredForms.length}
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Form</Table.Head>
            <Table.Head>Category</Table.Head>
            <Table.Head>Status</Table.Head>
            <Table.Head>Updated</Table.Head>
            <Table.Head><span class="sr-only">Actions</span></Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each filteredForms as form (form.id)}
            <Table.Row>
              <Table.Cell>
                <div class="flex items-center gap-3">
                  <div class="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <FilePenLineIcon />
                  </div>
                  <div>
                    <p class="font-medium text-foreground">{form.name}</p>
                    {#if form.description}<p class="max-w-md truncate text-xs text-muted-foreground">{form.description}</p>{/if}
                  </div>
                </div>
              </Table.Cell>
              <Table.Cell class="text-muted-foreground">{form.category || 'Uncategorized'}</Table.Cell>
              <Table.Cell><Badge variant={statusVariant(form.status)}>{form.status.replace('_', ' ')}</Badge></Table.Cell>
              <Table.Cell class="text-muted-foreground">{form.updatedAt ? new Date(form.updatedAt).toLocaleDateString() : 'Not available'}</Table.Cell>
              <Table.Cell class="text-right">
                <Button variant="ghost" size="sm" href={`/management/forms/${form.id}`}>Open</Button>
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    {:else}
      <div class="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <div class="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          {#if search}<SearchIcon />{:else}<ArchiveIcon />{/if}
        </div>
        <div>
          <h3 class="font-semibold text-foreground">{search ? 'No forms match your search' : 'No forms yet'}</h3>
          <p class="mt-1 max-w-sm text-sm text-muted-foreground">{search ? 'Try a different name, category, or description.' : 'Create your first form to begin building a reusable workspace workflow.'}</p>
        </div>
        {#if !search}<Button href="/management/forms/new"><PlusIcon data-icon="inline-start" />Create your first form</Button>{/if}
      </div>
    {/if}
  </section>
</div>