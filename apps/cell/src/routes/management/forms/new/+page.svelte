<script>
  import { goto } from '$app/navigation';
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
  import FilePenLineIcon from '@lucide/svelte/icons/file-pen-line';
  import SaveIcon from '@lucide/svelte/icons/save';
  import * as Field from '$lib/components/ui/field';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Textarea } from '$lib/components/ui/textarea';
  import { toast } from '$lib/stores/toast.js';

  let form = $state({ name: '', description: '', category: '' });
  let isSubmitting = $state(false);
  let errorMessage = $state('');

  async function createForm() {
    if (!form.name.trim()) {
      errorMessage = 'Form name is required.';
      return;
    }

    isSubmitting = true;
    errorMessage = '';
    try {
      const response = await fetch('/management/forms', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message || result?.error || 'Unable to create form.');
      toast.success('Form created.');
      await goto(`/management/forms/${result.id}`);
    } catch (error) {
      errorMessage = error.message;
      toast.error(errorMessage);
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="flex flex-col gap-6">
  <div class="flex flex-wrap items-center gap-3">
    <Button variant="ghost" size="icon" href="/management/forms" title="Back to forms" aria-label="Back to forms">
      <ArrowLeftIcon />
    </Button>
    <div>
      <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-500"><FilePenLineIcon class="size-4" />Form Builder</div>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">New form</h1>
    </div>
  </div>

  <section class="max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-sm">
    <div class="mb-6 border-b border-border pb-5">
      <h2 class="text-lg font-semibold text-foreground">Form details</h2>
      <p class="mt-1 text-sm text-muted-foreground">Start with the metadata for this form. You can add fields after the draft is created.</p>
    </div>

    <Field.FieldGroup>
      <Field.Field>
        <Field.FieldLabel for="form-name">Name</Field.FieldLabel>
        <Input id="form-name" bind:value={form.name} placeholder="Customer intake" aria-invalid={Boolean(errorMessage && !form.name.trim())} />
        <Field.FieldDescription>Use a clear name people will recognize in the Management workspace.</Field.FieldDescription>
      </Field.Field>
      <Field.Field>
        <Field.FieldLabel for="form-category">Category</Field.FieldLabel>
        <Input id="form-category" bind:value={form.category} placeholder="Operations" />
      </Field.Field>
      <Field.Field>
        <Field.FieldLabel for="form-description">Description</Field.FieldLabel>
        <Textarea id="form-description" bind:value={form.description} placeholder="What is this form used for?" rows={4} />
      </Field.Field>
    </Field.FieldGroup>

    {#if errorMessage}<p class="mt-4 text-sm text-destructive" role="alert">{errorMessage}</p>{/if}

    <div class="mt-6 flex flex-wrap justify-end gap-2 border-t border-border pt-5">
      <Button variant="outline" href="/management/forms">Cancel</Button>
      <Button onclick={createForm} disabled={isSubmitting}>
        <SaveIcon data-icon="inline-start" />
        {isSubmitting ? 'Creating...' : 'Create draft'}
      </Button>
    </div>
  </section>
</div>