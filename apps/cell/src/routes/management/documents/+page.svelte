<script>
  import { goto } from '$app/navigation';
  import FileTextIcon from '@lucide/svelte/icons/file-text';
  import DownloadIcon from '@lucide/svelte/icons/download';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import SearchIcon from '@lucide/svelte/icons/search';
  import UploadIcon from '@lucide/svelte/icons/upload';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { toast } from '$lib/stores/toast.js';

  let { data } = $props();
  let query = $state('');
  let importInput = $state();
  let isImporting = $state(false);
  let filteredTemplates = $derived(data.templates.filter((template) => `${template.name} ${template.description}`.toLowerCase().includes(query.toLowerCase())));
  const statusVariant = (status) => status === 'published' ? 'default' : status === 'archived' ? 'destructive' : 'secondary';

  async function importPackage(event) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    isImporting = true;
    try {
      const bundle = JSON.parse(await file.text());
      const response = await fetch('/management/documents/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(bundle)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to import document package.');
      toast.success('Document package imported.');
      await goto(`/management/documents/${result.template.id}`);
    } catch (error) {
      toast.error(error.message || 'Unable to import document package.');
    } finally {
      isImporting = false;
    }
  }
</script>

<div class="flex flex-col gap-6">
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div>
      <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-500"><FileTextIcon class="size-4" />Documents</div>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">Document templates</h1>
      <p class="mt-2 max-w-2xl text-sm text-muted-foreground">Build reusable documents that can be filled from published forms or used as internal templates.</p>
    </div>
    <div class="flex flex-wrap gap-2">
      <input bind:this={importInput} type="file" accept="application/json,.json" class="hidden" onchange={importPackage} />
      <Button variant="outline" onclick={() => importInput?.click()} disabled={isImporting}><UploadIcon data-icon="inline-start" />{isImporting ? 'Importing...' : 'Import package'}</Button>
      <Button href="/management/documents/new"><PlusIcon data-icon="inline-start" />New template</Button>
    </div>
  </div>

  <section class="rounded-2xl border border-border bg-card shadow-sm">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
      <div class="relative min-w-64 flex-1"><SearchIcon class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input class="pl-9" bind:value={query} placeholder="Search templates" aria-label="Search document templates" /></div>
      <span class="text-sm text-muted-foreground">{filteredTemplates.length} templates</span>
    </div>
    {#if filteredTemplates.length}
      <div class="divide-y divide-border">
        {#each filteredTemplates as template (template.id)}
          <a href={`/management/documents/${template.id}`} class="flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/40">
            <div class="min-w-0"><div class="flex items-center gap-2"><h2 class="truncate font-medium text-foreground">{template.name}</h2><Badge variant={statusVariant(template.status)}>{template.status}</Badge></div><p class="mt-1 truncate text-sm text-muted-foreground">{template.description || 'No description yet.'}</p></div>
            <span class="text-sm text-muted-foreground">{template.updatedAt ? new Date(template.updatedAt).toLocaleDateString() : 'Not available'}</span>
          </a>
        {/each}
      </div>
    {:else}
      <div class="px-6 py-16 text-center"><FileTextIcon class="mx-auto size-10 text-muted-foreground/60" /><h2 class="mt-4 text-lg font-semibold text-foreground">No document templates yet</h2><p class="mt-2 text-sm text-muted-foreground">Create a reusable template for internal documents or account workflows.</p><Button class="mt-5" href="/management/documents/new"><PlusIcon data-icon="inline-start" />Create template</Button></div>
    {/if}
  </section>
</div>
