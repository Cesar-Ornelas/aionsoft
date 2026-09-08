<script>
  import FileTextIcon from '@lucide/svelte/icons/file-text';
  import PlayIcon from '@lucide/svelte/icons/play';
  import * as Field from '$lib/components/ui/field';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Textarea } from '$lib/components/ui/textarea';
  import { toast } from '$lib/stores/toast.js';

  let { data } = $props();
  let templateVersionId = $state(data.publishedTemplates[0]?.id ?? '');
  let operationsAccountId = $state('');
  let valuesText = $state('{}');
  let generated = $state(null);
  let errorMessage = $state('');
  let isGenerating = $state(false);

  async function generate() {
    isGenerating = true; errorMessage = '';
    try {
      const values = JSON.parse(valuesText || '{}');
      const response = await fetch('/operations/documents', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ templateVersionId, operationsAccountId: operationsAccountId.trim() || null, values }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || 'Unable to generate document.');
      generated = result;
      toast.success('Document generated.');
    } catch (error) { errorMessage = error.message; toast.error(errorMessage); } finally { isGenerating = false; }
  }
</script>

<div class="flex flex-col gap-6">
  <div><div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-500"><FileTextIcon class="size-4" />Operations documents</div><h1 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">Generate a document</h1><p class="mt-2 text-sm text-muted-foreground">Use a published reusable template for an internal workflow or an Operations Account.</p></div>
  <div class="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
    <section class="rounded-2xl border border-border bg-card p-5 shadow-sm"><h2 class="text-lg font-semibold text-foreground">Document inputs</h2><Field.FieldGroup class="mt-5"><Field.Field><Field.FieldLabel for="template-version">Published template</Field.FieldLabel><select id="template-version" class="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground" bind:value={templateVersionId}>{#each data.publishedTemplates as version}<option value={version.id}>{version.templateName} · Version {version.versionNumber}</option>{/each}</select></Field.Field><Field.Field><Field.FieldLabel for="account-id">Operations Account ID <span class="font-normal text-muted-foreground">(optional)</span></Field.FieldLabel><Input id="account-id" bind:value={operationsAccountId} placeholder="Account record id" /></Field.Field><Field.Field><Field.FieldLabel for="values">Form values JSON</Field.FieldLabel><Textarea id="values" bind:value={valuesText} rows={10} class="font-mono text-sm" placeholder="Enter JSON form values" /><Field.FieldDescription>Use stable field IDs or keys from the source form.</Field.FieldDescription></Field.Field></Field.FieldGroup>{#if errorMessage}<p class="mt-4 text-sm text-destructive" role="alert">{errorMessage}</p>{/if}<Button class="mt-5 w-full" onclick={generate} disabled={isGenerating || !templateVersionId}><PlayIcon data-icon="inline-start" />{isGenerating ? 'Generating...' : 'Generate document'}</Button></section>
    <section class="rounded-2xl border border-border bg-card p-5 shadow-sm"><div class="flex items-center justify-between gap-3"><div><h2 class="text-lg font-semibold text-foreground">Preview</h2><p class="mt-1 text-sm text-muted-foreground">Generated HTML is saved with the pinned template and form versions.</p></div>{#if generated}<Badge variant="default">Generated</Badge>{/if}</div>{#if generated}<div class="mt-5 rounded-lg border border-border bg-background p-6" aria-label="Generated document preview">{@html generated.renderedHtml}</div>{:else}<div class="mt-5 flex min-h-80 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">Choose a template and generate a preview.</div>{/if}</section>
  </div>
  <section class="rounded-2xl border border-border bg-card p-5 shadow-sm"><h2 class="text-lg font-semibold text-foreground">Generated documents</h2>{#if data.documents.length}<div class="mt-4 flex flex-col divide-y divide-border">{#each data.documents as document}<div class="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><span class="font-medium text-foreground">{document.id}</span><Badge variant="secondary">{document.status}</Badge><span class="text-muted-foreground">{document.createdAt ? new Date(document.createdAt).toLocaleString() : 'Not available'}</span></div>{/each}</div>{:else}<p class="mt-3 text-sm text-muted-foreground">No generated documents yet.</p>{/if}</section>
</div>
