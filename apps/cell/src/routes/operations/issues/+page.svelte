<script>
  import { goto } from '$app/navigation';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import SearchIcon from '@lucide/svelte/icons/search';
  import * as Field from '$lib/components/ui/field';
  import * as Table from '$lib/components/ui/table';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';

  let { data } = $props();
  let draft = $state({ ...data.filters });

  $effect(() => { draft = { ...data.filters }; });

  function filterUrl(values) {
    const params = new URLSearchParams();
    for (const key of ['search', 'status', 'priority', 'type']) if (values[key]) params.set(key, values[key]);
    return params.size ? `/operations/issues?${params}` : '/operations/issues';
  }

  async function applyFilters() { await goto(filterUrl(draft)); }

</script>

<svelte:head><title>Issues | Aionsoft Operations</title></svelte:head>

<div class="flex flex-col gap-6">
  <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div><p class="text-sm font-medium text-muted-foreground">Operations</p><h1 class="text-2xl font-semibold text-foreground">Issues</h1><p class="text-sm text-muted-foreground">Track customer, provider, and internal issues through resolution.</p></div>
    <Button onclick={() => goto('/operations/issues/new')}><PlusIcon data-icon="inline-start" />New issue</Button>
  </header>

  <div class="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end"><Field.Field class="max-w-sm"><Field.FieldLabel for="issue-search">Search issues</Field.FieldLabel><Input id="issue-search" bind:value={draft.search} placeholder="Title or description" /></Field.Field><Field.Field><Field.FieldLabel for="issue-status">Status</Field.FieldLabel><select id="issue-status" class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" bind:value={draft.status}><option value="">All statuses</option><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option><option value="cancelled">Cancelled</option></select></Field.Field><Field.Field><Field.FieldLabel for="issue-priority-filter">Priority</Field.FieldLabel><select id="issue-priority-filter" class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" bind:value={draft.priority}><option value="">All priorities</option><option value="urgent">Urgent</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></Field.Field><Button onclick={applyFilters}><SearchIcon data-icon="inline-start" />Filter</Button></div>

  <div class="overflow-hidden rounded-lg border border-border"><Table.Root><Table.Header><Table.Row><Table.Head>Issue</Table.Head><Table.Head>Type</Table.Head><Table.Head>Priority</Table.Head><Table.Head>Status</Table.Head><Table.Head>Due</Table.Head><Table.Head class="text-right">Updated</Table.Head></Table.Row></Table.Header><Table.Body>{#each data.issues as issue (issue.id)}<Table.Row class="cursor-pointer" onclick={() => goto(`/operations/issues/${issue.id}`)}><Table.Cell><div class="flex flex-col gap-0.5"><span class="font-medium">{issue.title}</span>{#if issue.descriptionMarkdown}<span class="max-w-md truncate text-xs text-muted-foreground">{issue.descriptionMarkdown}</span>{/if}</div></Table.Cell><Table.Cell class="capitalize">{issue.type}</Table.Cell><Table.Cell><Badge variant={issue.priority === 'urgent' ? 'destructive' : issue.priority === 'high' ? 'secondary' : 'outline'}>{issue.priority}</Badge></Table.Cell><Table.Cell><Badge variant={issue.status === 'open' ? 'secondary' : 'outline'}>{issue.status.replace('_', ' ')}</Badge></Table.Cell><Table.Cell>{issue.dueDate ? new Date(issue.dueDate).toLocaleDateString() : '—'}</Table.Cell><Table.Cell class="text-right text-muted-foreground">{issue.updatedAt ? new Date(issue.updatedAt).toLocaleDateString() : '—'}</Table.Cell></Table.Row>{:else}<Table.Row><Table.Cell colspan={6} class="h-32 text-center text-muted-foreground">No issues match the current filters.</Table.Cell></Table.Row>{/each}</Table.Body></Table.Root></div>
</div>