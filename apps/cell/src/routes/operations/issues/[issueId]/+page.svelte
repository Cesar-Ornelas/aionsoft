<script>
  import { goto } from '$app/navigation';
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
  import SaveIcon from '@lucide/svelte/icons/save';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import PencilIcon from '@lucide/svelte/icons/pencil';
  import * as AlertDialog from '$lib/components/ui/alert-dialog';
  import * as Field from '$lib/components/ui/field';
  import IssueDescriptionEditor from '$lib/components/IssueDescriptionEditor.svelte';
  import IssueTagInput from '$lib/components/IssueTagInput.svelte';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { toast } from '$lib/stores/toast.js';

  let { data } = $props();
  let issue = $state(data.issue);
  let saving = $state(false);
  let formError = $state('');
  let form = $state({ ...data.issue });
  let tags = $state((data.issue.tags ?? []).map((tag) => tag.name));
  let comments = $state(structuredClone(data.comments ?? []));
  let commentBody = $state('');
  let editingCommentId = $state('');
  let editingBody = $state('');
  let commentError = $state('');
  let commentSubmitting = $state(false);
  let deletingCommentId = $state('');

  function escapeHtml(value) {
    return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  }

  function renderCommentMarkdown(value) {
    let html = escapeHtml(value).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/__([^_]+)__/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
    return html.replace(/\n/g, '<br>');
  }

  async function saveIssue() {
    saving = true;
    formError = '';
    try {
      const response = await fetch(`/operations/issues/${issue.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...form, tags }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save issue.');
      issue = result;
      form = { ...result };
      tags = result.tags.map((tag) => tag.name);
      toast.success('Issue updated.');
    } catch (error) {
      formError = error.message;
      toast.error(formError);
    } finally {
      saving = false;
    }
  }

  async function saveComment() {
    if (!commentBody.trim()) return;
    commentSubmitting = true;
    commentError = '';
    try {
      const response = await fetch(`/operations/issues/${issue.id}/comments`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ bodyMarkdown: commentBody }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to add comment.');
      comments = [...comments, result];
      commentBody = '';
    } catch (error) {
      commentError = error.message;
    } finally {
      commentSubmitting = false;
    }
  }

  async function saveEditedComment(comment) {
    if (!editingBody.trim()) return;
    commentSubmitting = true;
    commentError = '';
    try {
      const response = await fetch(`/operations/issues/${issue.id}/comments/${comment.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ bodyMarkdown: editingBody }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to update comment.');
      comments = comments.map((entry) => entry.id === comment.id ? result : entry);
      editingCommentId = '';
      editingBody = '';
    } catch (error) {
      commentError = error.message;
    } finally {
      commentSubmitting = false;
    }
  }

  async function deleteComment(comment) {
    deletingCommentId = comment.id;
    commentError = '';
    try {
      const response = await fetch(`/operations/issues/${issue.id}/comments/${comment.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to delete comment.');
      comments = comments.filter((entry) => entry.id !== comment.id && entry.parentId !== comment.id);
    } catch (error) {
      commentError = error.message;
    } finally {
      deletingCommentId = '';
    }
  }
</script>

<svelte:head><title>{issue.title} | Issues | Aionsoft</title></svelte:head>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-6">
  <header class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div class="flex min-w-0 items-start gap-3">
      <Button variant="ghost" size="icon" aria-label="Back to issues" title="Back to issues" onclick={() => goto('/operations/issues')}><ArrowLeftIcon /></Button>
      <div class="min-w-0">
        <p class="text-sm font-medium text-muted-foreground">Operations issue</p>
        <Input aria-label="Issue title" class="h-auto border-0 px-0 text-2xl font-semibold shadow-none focus-visible:ring-0" bind:value={form.title} />
        <div class="mt-2 flex flex-wrap gap-2"><Badge variant={issue.status === 'open' ? 'secondary' : 'outline'}>{issue.status.replace('_', ' ')}</Badge><Badge variant={issue.priority === 'urgent' ? 'destructive' : 'outline'}>{issue.priority}</Badge><Badge variant="outline">{issue.type}</Badge>{#each issue.tags as tag}<Badge variant="outline">{tag.name}</Badge>{/each}</div>
      </div>
    </div>
    <Button onclick={saveIssue} disabled={saving}><SaveIcon data-icon="inline-start" />{saving ? 'Saving...' : 'Save changes'}</Button>
  </header>

  <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
    <section class="flex flex-col gap-6">
      <Field.Field><Field.FieldLabel for="issue-description">Description</Field.FieldLabel><IssueDescriptionEditor value={form.descriptionMarkdown} onChange={(value) => (form.descriptionMarkdown = value)} /></Field.Field>
      <div class="border-t border-border pt-6">
        <h2 class="text-base font-semibold">Conversation</h2>
        {#if comments.length}
          <div class="mt-5 flex flex-col gap-4">
            {#each comments as comment (comment.id)}
              <article class="rounded-xl border border-border bg-card p-4">
                <header class="flex items-start justify-between gap-3">
                  <div><p class="text-sm font-medium text-foreground">{comment.authorName}</p><p class="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}{#if comment.edited} · edited{/if}</p></div>
                  {#if data.user?.id === comment.authorId}
                    <div class="flex items-center gap-1"><Button variant="ghost" size="icon-xs" title="Edit comment" aria-label="Edit comment" onclick={() => { editingCommentId = comment.id; editingBody = comment.bodyMarkdown; }}><PencilIcon /></Button><AlertDialog.Root><AlertDialog.Trigger>{#snippet child({ props })}<Button {...props} variant="ghost" size="icon-xs" title="Delete comment" aria-label="Delete comment"><Trash2Icon /></Button>{/snippet}</AlertDialog.Trigger><AlertDialog.Content><AlertDialog.Header><AlertDialog.Title>Delete this comment?</AlertDialog.Title><AlertDialog.Description>This permanently removes the comment from the Issue conversation.</AlertDialog.Description></AlertDialog.Header><AlertDialog.Footer><AlertDialog.Cancel>Cancel</AlertDialog.Cancel><AlertDialog.Action onclick={() => deleteComment(comment)} disabled={deletingCommentId === comment.id}>{deletingCommentId === comment.id ? 'Deleting...' : 'Delete comment'}</AlertDialog.Action></AlertDialog.Footer></AlertDialog.Content></AlertDialog.Root></div>
                  {/if}
                </header>
                {#if editingCommentId === comment.id}<IssueDescriptionEditor value={editingBody} onChange={(value) => (editingBody = value)} minHeight="min-h-32" /><div class="mt-2 flex justify-end gap-2"><Button variant="ghost" size="sm" onclick={() => (editingCommentId = '')}>Cancel</Button><Button size="sm" onclick={() => saveEditedComment(comment)} disabled={commentSubmitting}>Save edit</Button></div>{:else}<div class="comment-body mt-3 text-sm leading-6 text-foreground">{@html renderCommentMarkdown(comment.bodyMarkdown)}</div>{/if}
              </article>
            {/each}
          </div>
        {:else}<div class="mt-4 rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">No comments yet. Start the conversation below.</div>{/if}
        <div class="mt-5 rounded-xl border border-border bg-muted/20 p-4"><IssueDescriptionEditor value={commentBody} onChange={(value) => (commentBody = value)} placeholder="Leave a comment..." minHeight="min-h-32" /><div class="mt-3 flex justify-end"><Button onclick={saveComment} disabled={commentSubmitting || !commentBody.trim()}>{commentSubmitting ? 'Posting...' : 'Comment'}</Button></div></div>
        {#if commentError}<p class="mt-3 text-sm text-destructive" role="alert">{commentError}{#if commentError.includes('authenticated')} <a class="underline" href={`/login?redirect=/operations/issues/${issue.id}`}>Sign in</a>{/if}</p>{/if}
      </div>
      {#if formError}<Field.FieldError>{formError}</Field.FieldError>{/if}
    </section>
    <aside class="flex flex-col gap-5 border-t border-border pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0"><Field.Field><Field.FieldLabel for="issue-detail-status">Status</Field.FieldLabel><select id="issue-detail-status" class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" bind:value={form.status}><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option><option value="cancelled">Cancelled</option></select></Field.Field><Field.Field><Field.FieldLabel for="issue-detail-priority">Priority</Field.FieldLabel><select id="issue-detail-priority" class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" bind:value={form.priority}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></Field.Field><Field.Field><Field.FieldLabel for="issue-detail-type">Type</Field.FieldLabel><select id="issue-detail-type" class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" bind:value={form.type}><option value="customer">Customer</option><option value="provider">Provider</option><option value="internal">Internal</option></select></Field.Field><Field.Field><Field.FieldLabel for="issue-detail-due-date">Due date</Field.FieldLabel><Input id="issue-detail-due-date" type="date" bind:value={form.dueDate} /></Field.Field><Field.Field><Field.FieldLabel for="issue-detail-tags">Tags</Field.FieldLabel><IssueTagInput id="issue-detail-tags" bind:value={tags} placeholder="Type a tag and press Enter" /><Field.FieldDescription>Press Enter to add a tag.</Field.FieldDescription></Field.Field><div class="border-t border-border pt-4 text-sm text-muted-foreground"><p class="font-medium text-foreground">Labels and assignees</p><p class="mt-1">These issue relationships will be available here as the collaboration slice is added.</p></div></aside>
  </div>
</div>

<style>
  .border-dashed { display: none; }
  .comment-body :global(code) { border-radius: 0.25rem; background: hsl(var(--muted)); padding: 0.1rem 0.3rem; font-size: 0.85em; }
  .comment-body :global(a) { color: hsl(var(--primary)); text-decoration: underline; }
</style>