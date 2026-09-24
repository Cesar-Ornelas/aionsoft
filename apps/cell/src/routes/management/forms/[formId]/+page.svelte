<script>
  import { goto } from '$app/navigation';
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
  import FilePenLineIcon from '@lucide/svelte/icons/file-pen-line';
  import GitBranchIcon from '@lucide/svelte/icons/git-branch';
  import SaveIcon from '@lucide/svelte/icons/save';
  import UploadCloudIcon from '@lucide/svelte/icons/upload-cloud';
  import * as Table from '$lib/components/ui/table';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import FormSchemaEditor from '$lib/components/FormSchemaEditor.svelte';
  import { toast } from '$lib/stores/toast.js';

  let { data } = $props();
  let fields = $state(structuredClone(data.versions?.[0]?.schema?.fields ?? []));
  let isSaving = $state(false);
  let saveError = $state('');
  let latestVersion = $derived(data.versions?.[0] ?? null);
  const statusVariant = (status) => status === 'published' ? 'default' : status === 'deleted' ? 'destructive' : 'secondary';

  async function saveDraft() {
    isSaving = true;
    saveError = '';
    try {
      const response = await fetch(`/management/forms/${data.form.id}/versions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fields })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || 'Unable to save form draft.');
      toast.success(`Draft version ${result.versionNumber} saved.`);
      await goto(`/management/forms/${data.form.id}`, { invalidateAll: true, replaceState: true });
    } catch (error) {
      saveError = error.message;
      toast.error(saveError);
    } finally {
      isSaving = false;
    }
  }

  async function publishDraft() {
    if (!latestVersion || latestVersion.isPublished) return;
    isSaving = true;
    saveError = '';
    try {
      const response = await fetch(`/management/forms/${data.form.id}/versions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'publish', versionId: latestVersion.id })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || 'Unable to publish form version.');
      toast.success(`Version ${result.versionNumber} published and available to Documents.`);
      await goto(`/management/forms/${data.form.id}`, { invalidateAll: true, replaceState: true });
    } catch (error) {
      saveError = error.message;
      toast.error(saveError);
    } finally {
      isSaving = false;
    }
  }
</script>

<div class="flex flex-col gap-6">
  <div class="flex flex-wrap items-center gap-3">
    <Button variant="ghost" size="icon" href="/management/forms" title="Back to forms" aria-label="Back to forms">
      <ArrowLeftIcon />
    </Button>
    <div class="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground"><FilePenLineIcon /></div>
    <div>
      <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-500">Form Builder <Badge variant={statusVariant(data.form.status)}>{data.form.status.replace('_', ' ')}</Badge></div>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">{data.form.name}</h1>
    </div>
  </div>

  <div class="flex flex-col gap-6">
    <div class="flex flex-wrap justify-end gap-2">
      <Button size="sm" onclick={saveDraft} disabled={isSaving}><SaveIcon data-icon="inline-start" />{isSaving ? 'Saving...' : 'Save draft'}</Button>
      {#if latestVersion && !latestVersion.isPublished}<Button variant="outline" size="sm" onclick={publishDraft} disabled={isSaving}><UploadCloudIcon data-icon="inline-start" />Publish</Button>{/if}
    </div>
    <FormSchemaEditor {fields} onChange={(nextFields) => (fields = nextFields)} />
    {#if saveError}<p class="rounded-md border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">{saveError}</p>{/if}

    <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
    <section class="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div class="flex items-start gap-3">
        <GitBranchIcon class="mt-0.5 text-sky-500" />
        <div>
          <h2 class="text-lg font-semibold text-foreground">Version history</h2>
          <p class="mt-1 text-sm text-muted-foreground">Published versions stay immutable. New schema changes will create draft revisions.</p>
        </div>
      </div>

      {#if data.versions.length}
        <Table.Root class="mt-6">
          <Table.Header>
            <Table.Row><Table.Head>Version</Table.Head><Table.Head>Status</Table.Head><Table.Head>Created</Table.Head></Table.Row>
          </Table.Header>
          <Table.Body>
            {#each data.versions as version (version.id)}
              <Table.Row>
                <Table.Cell class="font-medium text-foreground">Version {version.versionNumber}</Table.Cell>
                <Table.Cell><Badge variant={statusVariant(version.status)}>{version.status.replace('_', ' ')}</Badge></Table.Cell>
                <Table.Cell class="text-muted-foreground">{version.createdAt ? new Date(version.createdAt).toLocaleDateString() : 'Not available'}</Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      {:else}
        <div class="mt-6 rounded-xl border border-dashed border-border px-6 py-10 text-center">
          <p class="font-medium text-foreground">No versions yet</p>
          <p class="mt-1 text-sm text-muted-foreground">The schema editor will create the first draft version here.</p>
        </div>
      {/if}
    </section>

    <aside class="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 class="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Form details</h2>
      <dl class="mt-5 flex flex-col gap-4 text-sm">
        <div><dt class="text-muted-foreground">Category</dt><dd class="mt-1 font-medium text-foreground">{data.form.category || 'Uncategorized'}</dd></div>
        <div><dt class="text-muted-foreground">Description</dt><dd class="mt-1 text-foreground">{data.form.description || 'No description'}</dd></div>
        <div><dt class="text-muted-foreground">Last updated</dt><dd class="mt-1 text-foreground">{data.form.updatedAt ? new Date(data.form.updatedAt).toLocaleDateString() : 'Not available'}</dd></div>
      </dl>
    </aside>
  </div>
</div>
</div>