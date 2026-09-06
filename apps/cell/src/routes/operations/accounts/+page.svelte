<script>
  import { goto } from '$app/navigation';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import SearchIcon from '@lucide/svelte/icons/search';
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Field from '$lib/components/ui/field';
  import * as Table from '$lib/components/ui/table';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { toast } from '$lib/stores/toast.js';

  let { data } = $props();
  let createOpen = $state(false);
  let submitting = $state(false);
  let formError = $state('');
  let form = $state({ name: '', description: '' });
  let draft = $state({ ...data.filters });

  $effect(() => { draft = { ...data.filters }; });

  function resetForm() { form = { name: '', description: '' }; formError = ''; }
  function accountUrl(values) {
    const params = new URLSearchParams();
    if (values.name?.trim()) params.set('name', values.name.trim());
    if (values.status) params.set('status', values.status);
    return params.size ? `/operations/accounts?${params}` : '/operations/accounts';
  }
  async function applyFilters() { await goto(accountUrl(draft)); }
  async function clearFilters() { draft = { name: '', status: '' }; await goto('/operations/accounts'); }
  async function createAccount() {
    submitting = true;
    formError = '';
    try {
      const response = await fetch('/operations/accounts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to create account.');
      toast.success('Operations Account created.');
      createOpen = false;
      await goto(`/operations/accounts/${result.id}`);
    } catch (error) { formError = error.message; toast.error(formError); }
    finally { submitting = false; }
  }
</script>

<svelte:head><title>Accounts | Aionsoft Operations</title></svelte:head>

<div class="flex flex-col gap-6">
  <header class="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
    <div class="flex flex-col gap-1"><p class="text-sm font-medium text-muted-foreground">Operations</p><h1 class="text-2xl font-semibold text-foreground">Accounts</h1><p class="text-sm text-muted-foreground">Service accounts grouping customer companies for delivery.</p></div>
    <Dialog.Root bind:open={createOpen} onOpenChange={(open) => { if (open) resetForm(); }}>
      <Dialog.Trigger>{#snippet child({ props })}<Button {...props}><PlusIcon data-icon="inline-start" />New account</Button>{/snippet}</Dialog.Trigger>
      <Dialog.Content class="sm:max-w-lg"><Dialog.Header><Dialog.Title>New Operations Account</Dialog.Title><Dialog.Description>Create the service relationship now and link customer companies afterward.</Dialog.Description></Dialog.Header>
        <Field.FieldGroup><Field.Field><Field.FieldLabel for="operations-account-name">Account name</Field.FieldLabel><Input id="operations-account-name" bind:value={form.name} placeholder="Service account name" /></Field.Field><Field.Field><Field.FieldLabel for="operations-account-description">Description <span class="text-muted-foreground">(optional)</span></Field.FieldLabel><Input id="operations-account-description" bind:value={form.description} placeholder="Optional operating context" /></Field.Field>{#if formError}<Field.FieldError>{formError}</Field.FieldError>{/if}</Field.FieldGroup>
        <Dialog.Footer><Button variant="outline" onclick={() => (createOpen = false)}>Cancel</Button><Button onclick={createAccount} disabled={submitting}>{submitting ? 'Creating...' : 'Create account'}</Button></Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  </header>

  <div class="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end"><Field.Field class="max-w-sm"><Field.FieldLabel for="operations-account-search">Search accounts</Field.FieldLabel><Input id="operations-account-search" bind:value={draft.name} placeholder="Account name" /></Field.Field><Button onclick={applyFilters}><SearchIcon data-icon="inline-start" />Search</Button>{#if data.filters.name || data.filters.status}<Button variant="ghost" onclick={clearFilters}>Clear</Button>{/if}</div>

  <div class="overflow-hidden rounded-lg border border-border"><Table.Root><Table.Header><Table.Row><Table.Head>Account</Table.Head><Table.Head>Status</Table.Head><Table.Head class="text-right">Updated</Table.Head></Table.Row></Table.Header><Table.Body>
    {#each data.accounts.items as account (account.id)}<Table.Row class="cursor-pointer" onclick={() => goto(`/operations/accounts/${account.id}`)}><Table.Cell class="font-medium">{account.name}</Table.Cell><Table.Cell><Badge variant={account.status === 'active' ? 'secondary' : 'outline'}>{account.status}</Badge></Table.Cell><Table.Cell class="text-right text-muted-foreground">{account.updatedAt ? new Date(account.updatedAt).toLocaleDateString() : '—'}</Table.Cell></Table.Row>{:else}<Table.Row><Table.Cell colspan={3} class="h-32 text-center text-muted-foreground">No Operations Accounts match the current filters.</Table.Cell></Table.Row>{/each}
  </Table.Body></Table.Root></div>
</div>
