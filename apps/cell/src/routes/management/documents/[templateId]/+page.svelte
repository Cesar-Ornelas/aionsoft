<script>
  import { goto } from '$app/navigation';
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
  import EyeIcon from '@lucide/svelte/icons/eye';
  import FileTextIcon from '@lucide/svelte/icons/file-text';
  import SaveIcon from '@lucide/svelte/icons/save';
  import UploadCloudIcon from '@lucide/svelte/icons/upload-cloud';
  import * as Field from '$lib/components/ui/field';
  import * as Tabs from '$lib/components/ui/tabs';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import DocumentTemplateEditor from '$lib/components/DocumentTemplateEditor.svelte';
  import FormSchemaEditor from '$lib/components/FormSchemaEditor.svelte';
  import { renderDocumentHtml } from '$lib/documents/model/content.js';
  import { toast } from '$lib/stores/toast.js';

  let { data } = $props();
  let selectedFormVersionId = $state(data.versions?.[0]?.formVersionId ?? data.ownedFormVersions?.[0]?.id ?? '');
  let content = $state(data.versions?.[0]?.content ?? { type: 'doc', content: [{ type: 'paragraph' }] });
  let sampleData = $state(structuredClone(data.versions?.[0]?.sampleData ?? {}));
  let formFields = $state(structuredClone(data.ownedFormVersions?.[0]?.schema?.fields ?? []));
  let isSaving = $state(false);
  let errorMessage = $state('');
  let previewValues = $state({});
  let workspaceTab = $state('form');
  let dateFormat = $state('long');
  let editorApi = $state();
  let selectedFormVersion = $derived(data.ownedFormVersions?.find((version) => version.id === selectedFormVersionId));
  let availableFields = $derived(flattenFields(formFields));
  let latestVersion = $derived(data.versions?.[0] ?? null);

  function flattenFields(fields, result = []) { for (const field of fields) { result.push(field); if (field.fields) flattenFields(field.fields, result); } return result; }
  function handleEditorReady(api) { editorApi = api; }
  function renderPreviewHtml() {
    try {
      return renderDocumentHtml(content, { ...sampleData, ...previewValues }, { fields: formFields });
    } catch (error) {
      return '<p class="document-preview-error">Document preview is unavailable until its field references are resolved.</p>';
    }
  }

  function openDocumentPreview() {
    workspaceTab = 'preview';
  }

  async function saveDraft() {
    isSaving = true; errorMessage = '';
    try {
      const response = await fetch(`/management/documents/${data.template.id}/versions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content, sampleData, formSchema: { fields: formFields }, formVersionId: data.template.formId ? null : selectedFormVersionId || null }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || 'Unable to save document template.');
      toast.success(`Draft version ${result.versionNumber} saved.`);
      await goto(`/management/documents/${data.template.id}`, { invalidateAll: true, replaceState: true });
    } catch (error) { errorMessage = error.message; toast.error(errorMessage); } finally { isSaving = false; }
  }

  async function publish() {
    isSaving = true; errorMessage = '';
    try {
      const response = await fetch(`/management/documents/${data.template.id}/versions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'publish' }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || 'Unable to publish document template.');
      toast.success('Template published.');
      await goto(`/management/documents/${data.template.id}`, { invalidateAll: true, replaceState: true });
    } catch (error) { errorMessage = error.message; toast.error(errorMessage); } finally { isSaving = false; }
  }
</script>

<div class="flex flex-col gap-6">
  <div class="flex flex-wrap items-center justify-between gap-4">
    <div class="flex items-center gap-3">
      <Button variant="ghost" size="icon" href="/management/documents" title="Back to templates" aria-label="Back to templates"><ArrowLeftIcon /></Button>
      <div class="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground"><FileTextIcon /></div>
      <div><div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-500">Document template <Badge variant={data.template.status === 'published' ? 'default' : 'secondary'}>{data.template.status}</Badge></div><h1 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">{data.template.name}</h1></div>
    </div>
    <div class="flex gap-2"><Button variant="outline" onclick={() => (workspaceTab = workspaceTab === 'preview' ? 'document' : 'preview')}><EyeIcon data-icon="inline-start" />{workspaceTab === 'preview' ? 'Edit' : 'Preview'}</Button>{#if latestVersion && !latestVersion.isPublished}<Button variant="outline" onclick={publish} disabled={isSaving}><UploadCloudIcon data-icon="inline-start" />Publish</Button>{/if}<Button onclick={saveDraft} disabled={isSaving}><SaveIcon data-icon="inline-start" />{isSaving ? 'Saving...' : 'Save draft'}</Button></div>
  </div>

  <section class="rounded-2xl border border-border bg-card p-4 shadow-sm lg:p-6">
    <Tabs.Root bind:value={workspaceTab}>
      <Tabs.List class="w-full sm:w-fit">
        <Tabs.Trigger value="form" class="flex-1 cursor-pointer sm:flex-none">Form</Tabs.Trigger>
        <Tabs.Trigger value="sample" class="flex-1 cursor-pointer sm:flex-none">Sample data</Tabs.Trigger>
        <Tabs.Trigger value="document" class="flex-1 cursor-pointer sm:flex-none">Document</Tabs.Trigger>
        <Tabs.Trigger value="preview" class="flex-1 cursor-pointer sm:flex-none">Preview</Tabs.Trigger>
        <Tabs.Trigger value="history" class="flex-1 cursor-pointer sm:flex-none">History</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="form" class="pt-6">
        {#if data.ownedForm}
          <FormSchemaEditor fields={formFields} onChange={(nextFields) => (formFields = nextFields)} onPreviewValuesChange={(nextValues) => (previewValues = nextValues)} onPreviewDocument={openDocumentPreview} />
        {:else}
          <div class="rounded-xl border border-dashed border-border px-6 py-12 text-center"><p class="font-medium text-foreground">This is a legacy template</p><p class="mt-2 text-sm text-muted-foreground">Its form remains managed through the standalone Form Builder.</p></div>
        {/if}
      </Tabs.Content>

      <Tabs.Content value="sample" class="pt-6">
        {#if data.ownedForm}
          <FormSchemaEditor fields={formFields} sampleMode sampleValues={sampleData} onPreviewValuesChange={(nextValues) => (sampleData = nextValues)} onPreviewDocument={openDocumentPreview} />
          <details class="mt-4 rounded-xl border border-border bg-muted/20 p-4"><summary class="cursor-pointer text-sm font-medium text-foreground">View sample data JSON</summary><pre class="mt-3 overflow-x-auto text-xs text-muted-foreground">{JSON.stringify(sampleData, null, 2)}</pre></details>
        {:else}
          <div class="rounded-xl border border-dashed border-border px-6 py-12 text-center"><p class="font-medium text-foreground">Sample data is unavailable for legacy templates</p><p class="mt-2 text-sm text-muted-foreground">Select or migrate the form package before creating a saved fixture.</p></div>
        {/if}
      </Tabs.Content>

      <Tabs.Content value="document" class="pt-6">
        <div class="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <section class="min-w-0">
            <div class="mb-3 flex items-center justify-between gap-4"><div><h2 class="text-lg font-semibold text-foreground">Document canvas</h2><p class="text-sm text-muted-foreground">Write the reusable template and add fields where values should be filled in.</p></div><span class="hidden text-xs text-muted-foreground sm:inline">Type @ to insert a field</span></div>
            <DocumentTemplateEditor content={content} availableFields={availableFields} {dateFormat} onChange={(nextContent) => (content = nextContent)} onEditorReady={handleEditorReady} />
          </section>

          <aside class="rounded-xl border border-border bg-muted/20 p-5 xl:sticky xl:top-6">
            {#if data.ownedForm}<div><p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Owned form</p><p class="mt-2 font-medium text-foreground">{data.ownedForm.name}</p><p class="mt-1 text-sm text-muted-foreground">Edit fields from the Form tab.</p></div>{:else}<Field.Field><Field.FieldLabel for="form-version">Source form version</Field.FieldLabel><select id="form-version" class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" bind:value={selectedFormVersionId}><option value="">Static template without a form</option>{#each data.publishedFormVersions as version}<option value={version.id}>{version.formName} · Version {version.versionNumber}</option>{/each}</select><Field.FieldDescription>Legacy templates can continue using published form versions.</Field.FieldDescription></Field.Field>{/if}
            <div class="mt-6 border-t border-border pt-5"><p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Insert field</p>{#if selectedFormVersion}<p class="mt-2 text-sm text-muted-foreground">Click a field or type @ in the canvas.</p>{#if availableFields.some((field) => field.type === 'date')}<Field.Field class="mt-4"><Field.FieldLabel for="date-format">Date format</Field.FieldLabel><select id="date-format" class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" bind:value={dateFormat}><option value="long">September 7, 2026</option><option value="medium">Sep 7, 2026</option><option value="short">09/07/2026</option><option value="numeric">9/7/2026</option><option value="iso">2026-09-07</option></select><Field.FieldDescription>Applies when you insert a date field.</Field.FieldDescription></Field.Field>{/if}<div class="mt-4 flex max-h-[32rem] flex-col gap-2 overflow-y-auto">{#each availableFields as field}<Button variant="outline" size="sm" class="h-auto min-h-10 justify-start py-2 text-left" onclick={() => editorApi?.insertField(field)}><span class="truncate">@{field.label}</span><span class="ml-auto shrink-0 text-xs text-muted-foreground">{field.fieldKey || field.id}</span></Button>{/each}</div>{:else}<p class="mt-3 text-sm text-muted-foreground">Add fields from the Form tab before inserting them.</p>{/if}</div>
          </aside>
        </div>
      </Tabs.Content>

      <Tabs.Content value="preview" class="pt-6">
        <div class="mb-4 flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100"><EyeIcon class="size-4" /><span>Document preview uses values from Sample data when available.</span></div>
        <div class="document-preview min-h-[42rem] px-2 py-4 text-base leading-8 text-foreground lg:min-h-[54rem] lg:px-6 lg:py-6">{@html renderPreviewHtml()}</div>
      </Tabs.Content>

      <Tabs.Content value="history" class="pt-6">
        <div><h2 class="text-lg font-semibold text-foreground">Version history</h2><p class="mt-1 text-sm text-muted-foreground">Published revisions stay immutable while draft package changes remain editable.</p></div>
        <div class="mt-4 flex flex-col divide-y divide-border">{#each data.versions as version}<div class="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><span class="font-medium text-foreground">Version {version.versionNumber}</span><Badge variant={version.isPublished ? 'default' : 'secondary'}>{version.status}</Badge><span class="text-muted-foreground">{version.createdAt ? new Date(version.createdAt).toLocaleString() : 'Not available'}</span></div>{/each}{#if !data.versions.length}<p class="py-3 text-sm text-muted-foreground">No saved versions yet.</p>{/if}</div>
      </Tabs.Content>
    </Tabs.Root>
    {#if errorMessage}<p class="mt-4 text-sm text-destructive" role="alert">{errorMessage}</p>{/if}
  </section>

</div>

<style>
  .document-preview :global(h1), .document-preview :global(h2), .document-preview :global(h3) { margin: 1.25rem 0 0.75rem; font-weight: 650; line-height: 1.25; }
  .document-preview :global(h1) { font-size: 2rem; }
  .document-preview :global(h2) { font-size: 1.5rem; }
  .document-preview :global(h3) { font-size: 1.25rem; }
  .document-preview :global(p) { margin: 0.75rem 0; }
  .document-preview :global(ul), .document-preview :global(ol) { margin: 0.75rem 0; padding-left: 1.75rem; }
  .document-preview :global(ul) { list-style: disc; }
  .document-preview :global(ol) { list-style: decimal; }
  .document-preview :global(blockquote) { border-left: 3px solid hsl(var(--border)); padding-left: 1rem; color: hsl(var(--muted-foreground)); }
  .document-preview :global(hr) { margin: 1.5rem 0; border-color: hsl(var(--border)); }
  .document-preview :global(.document-table) { margin: 1rem 0; }
  .document-preview :global(.document-preview-error) { color: hsl(var(--destructive)); }
</style>
