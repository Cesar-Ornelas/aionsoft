<script>
  import { goto } from '$app/navigation';
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
  import FileTextIcon from '@lucide/svelte/icons/file-text';
  import SaveIcon from '@lucide/svelte/icons/save';
  import * as Field from '$lib/components/ui/field';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Textarea } from '$lib/components/ui/textarea';
  import { toast } from '$lib/stores/toast.js';

  let template = $state({ name: '', description: '' });
  let errorMessage = $state('');
  let isSubmitting = $state(false);

  async function createTemplate() {
    if (!template.name.trim()) { errorMessage = 'Template name is required.'; return; }
    isSubmitting = true;
    errorMessage = '';
    try {
      const response = await fetch('/management/documents', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(template) });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || 'Unable to create document template.');
      toast.success('Document template created.');
      await goto(`/management/documents/${result.id}`);
    } catch (error) { errorMessage = error.message; toast.error(errorMessage); } finally { isSubmitting = false; }
  }
</script>

<div class="flex flex-col gap-6">
  <div class="flex items-center gap-3"><Button variant="ghost" size="icon" href="/management/documents" title="Back to document templates" aria-label="Back to document templates"><ArrowLeftIcon /></Button><div class="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground"><FileTextIcon /></div><div><div class="text-xs font-semibold uppercase tracking-[0.24em] text-sky-500">Documents</div><h1 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">New template</h1></div></div>
  <section class="max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-sm">
    <div class="mb-6 border-b border-border pb-5"><h2 class="text-lg font-semibold text-foreground">Template details</h2><p class="mt-1 text-sm text-muted-foreground">Create reusable document metadata first. Form fields and content can be added next.</p></div>
    <Field.FieldGroup><Field.Field><Field.FieldLabel for="template-name">Name</Field.FieldLabel><Input id="template-name" bind:value={template.name} placeholder="Service agreement" /></Field.Field><Field.Field><Field.FieldLabel for="template-description">Description</Field.FieldLabel><Textarea id="template-description" bind:value={template.description} placeholder="What is this template used for?" rows={4} /></Field.Field></Field.FieldGroup>
    {#if errorMessage}<p class="mt-4 text-sm text-destructive" role="alert">{errorMessage}</p>{/if}
    <div class="mt-6 flex justify-end gap-2 border-t border-border pt-5"><Button variant="outline" href="/management/documents">Cancel</Button><Button onclick={createTemplate} disabled={isSubmitting}><SaveIcon data-icon="inline-start" />{isSubmitting ? 'Creating...' : 'Create draft'}</Button></div>
  </section>
</div>
