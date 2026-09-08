<script>
  import { goto } from '$app/navigation';
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
  import SaveIcon from '@lucide/svelte/icons/save';
  import * as Field from '$lib/components/ui/field';
  import IssueDescriptionEditor from '$lib/components/IssueDescriptionEditor.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { toast } from '$lib/stores/toast.js';

  let submitting = $state(false);
  let formError = $state('');
  let form = $state({ title: '', descriptionMarkdown: '', type: 'internal', priority: 'medium', dueDate: '' });

  async function createIssue() {
    submitting = true;
    formError = '';
    try {
      const response = await fetch('/operations/issues', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to create issue.');
      toast.success('Issue created.');
      await goto(`/operations/issues/${result.id}`);
    } catch (error) {
      formError = error.message;
      toast.error(formError);
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head><title>New issue | Aionsoft Operations</title></svelte:head>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-6">
  <header class="flex items-center justify-between">
    <div class="flex items-start gap-3">
      <Button variant="ghost" size="icon" aria-label="Back to issues" title="Back to issues" onclick={() => goto('/operations/issues')}><ArrowLeftIcon /></Button>
      <div><p class="text-sm font-medium text-muted-foreground">Operations issue</p><h1 class="text-2xl font-semibold text-foreground">New issue</h1><p class="mt-1 text-sm text-muted-foreground">Describe the problem and set its initial ownership details.</p></div>
    </div>
    <Button onclick={createIssue} disabled={submitting || !form.title}><SaveIcon data-icon="inline-start" />{submitting ? 'Creating...' : 'Create issue'}</Button>
  </header>

  <div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
    <main class="min-w-0">
      <Field.Field>
        <Field.FieldLabel for="new-issue-title">Title</Field.FieldLabel>
        <Input id="new-issue-title" class="h-auto border-0 px-0 text-2xl font-semibold shadow-none focus-visible:ring-0" bind:value={form.title} placeholder="What needs attention?" />
      </Field.Field>
      <Field.Field class="mt-8">
        <Field.FieldLabel for="new-issue-description">Description</Field.FieldLabel>
        <IssueDescriptionEditor value={form.descriptionMarkdown} onChange={(value) => (form.descriptionMarkdown = value)} minHeight="min-h-96" />
      </Field.Field>
      {#if formError}<Field.FieldError class="mt-4">{formError}</Field.FieldError>{/if}
    </main>

    <aside class="flex flex-col gap-5 border-t border-border pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
      <Field.Field><Field.FieldLabel for="new-issue-type">Type</Field.FieldLabel><select id="new-issue-type" class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" bind:value={form.type}><option value="customer">Customer</option><option value="provider">Provider</option><option value="internal">Internal</option></select></Field.Field>
      <Field.Field><Field.FieldLabel for="new-issue-priority">Priority</Field.FieldLabel><select id="new-issue-priority" class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" bind:value={form.priority}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></Field.Field>
      <Field.Field><Field.FieldLabel for="new-issue-due-date">Due date <span class="text-muted-foreground">(optional)</span></Field.FieldLabel><Input id="new-issue-due-date" type="date" bind:value={form.dueDate} /></Field.Field>
      <div class="border-t border-border pt-4 text-sm text-muted-foreground">Tags, assignees, and company relationships can be added from the issue detail.</div>
    </aside>
  </div>
</div>