<script>
  import { goto } from '$app/navigation';
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
  import SaveIcon from '@lucide/svelte/icons/save';
  import * as Field from '$lib/components/ui/field';
  import IssueDescriptionEditor from '$lib/components/IssueDescriptionEditor.svelte';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { toast } from '$lib/stores/toast.js';

  let { data } = $props();
  let issue = $state(data.issue);
  let saving = $state(false);
  let formError = $state('');
  let form = $state({ ...data.issue });

  async function saveIssue() {
    saving = true;
    formError = '';
    try {
      const response = await fetch(`/operations/issues/${issue.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save issue.');
      issue = result;
      form = { ...result };
      toast.success('Issue updated.');
    } catch (error) {
      formError = error.message;
      toast.error(formError);
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head><title>{issue.title} | Issues | Aionsoft</title></svelte:head>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-6">
  <header class="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
    <div class="flex min-w-0 items-start gap-3"><Button variant="ghost" size="icon" aria-label="Back to issues" title="Back to issues" onclick={() => goto('/operations/issues')}><ArrowLeftIcon /></Button><div class="min-w-0"><p class="text-sm font-medium text-muted-foreground">Operations issue</p><Input aria-label="Issue title" class="h-auto border-0 px-0 text-2xl font-semibold shadow-none focus-visible:ring-0" bind:value={form.title} /><div class="mt-2 flex flex-wrap gap-2"><Badge variant={issue.status === 'open' ? 'secondary' : 'outline'}>{issue.status.replace('_', ' ')}</Badge><Badge variant={issue.priority === 'urgent' ? 'destructive' : 'outline'}>{issue.priority}</Badge><Badge variant="outline">{issue.type}</Badge></div></div></div>
    <Button onclick={saveIssue} disabled={saving}><SaveIcon data-icon="inline-start" />{saving ? 'Saving...' : 'Save changes'}</Button>
  </header>

  <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
    <section class="flex flex-col gap-6"><Field.Field><Field.FieldLabel for="issue-description">Description</Field.FieldLabel><IssueDescriptionEditor value={form.descriptionMarkdown} onChange={(value) => (form.descriptionMarkdown = value)} /></Field.Field><div class="border-t border-border pt-6"><h2 class="text-base font-semibold">Conversation</h2><div class="mt-4 rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">No comments yet.</div></div>{#if formError}<Field.FieldError>{formError}</Field.FieldError>{/if}</section>
    <aside class="flex flex-col gap-5 border-t border-border pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0"><Field.Field><Field.FieldLabel for="issue-detail-status">Status</Field.FieldLabel><select id="issue-detail-status" class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" bind:value={form.status}><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option><option value="cancelled">Cancelled</option></select></Field.Field><Field.Field><Field.FieldLabel for="issue-detail-priority">Priority</Field.FieldLabel><select id="issue-detail-priority" class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" bind:value={form.priority}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></Field.Field><Field.Field><Field.FieldLabel for="issue-detail-type">Type</Field.FieldLabel><select id="issue-detail-type" class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" bind:value={form.type}><option value="customer">Customer</option><option value="provider">Provider</option><option value="internal">Internal</option></select></Field.Field><Field.Field><Field.FieldLabel for="issue-detail-due-date">Due date</Field.FieldLabel><Input id="issue-detail-due-date" type="date" bind:value={form.dueDate} /></Field.Field><div class="border-t border-border pt-4 text-sm text-muted-foreground"><p class="font-medium text-foreground">Labels and assignees</p><p class="mt-1">These issue relationships will be available here as the collaboration slice is added.</p></div></aside>
  </div>
</div>