<script>
  import { goto } from '$app/navigation';
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
  import CalendarDaysIcon from '@lucide/svelte/icons/calendar-days';
  import FileTextIcon from '@lucide/svelte/icons/file-text';
  import LinkIcon from '@lucide/svelte/icons/link';
  import MessageSquareIcon from '@lucide/svelte/icons/message-square';
  import NotebookPenIcon from '@lucide/svelte/icons/notebook-pen';
  import PencilIcon from '@lucide/svelte/icons/pencil';
  import ListTodoIcon from '@lucide/svelte/icons/list-todo';
  import Maximize2Icon from '@lucide/svelte/icons/maximize-2';
  import UnlinkIcon from '@lucide/svelte/icons/unlink';
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Field from '$lib/components/ui/field';
  import * as Sheet from '$lib/components/ui/sheet';
  import * as Table from '$lib/components/ui/table';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { toast } from '$lib/stores/toast.js';

  let { data } = $props();
  let form = $state({ name: '', description: '', status: 'active' });
  let editOpen = $state(false);
  let communicationsOpen = $state(false);
  let notesOpen = $state(false);
  let selectedCompanyId = $state('');
  let submitting = $state(false);
  let errorMessage = $state('');

  $effect(() => {
    form = { name: data.account.name, description: data.account.description, status: data.account.status };
  });

  async function request(url, options = {}) {
    const response = await fetch(url, options);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Unable to update account.');
    return result;
  }
  async function save() { submitting = true; errorMessage = ''; try { await request(`/operations/accounts/${data.account.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) }); editOpen = false; toast.success('Operations Account updated.'); await goto(`/operations/accounts/${data.account.id}`, { invalidateAll: true, replaceState: true }); } catch (error) { errorMessage = error.message; toast.error(errorMessage); } finally { submitting = false; } }
  async function archive() { if (!confirm('Archive this Operations Account? Linked companies will remain connected for history.')) return; try { await request(`/operations/accounts/${data.account.id}?action=archive`, { method: 'PATCH' }); toast.success('Operations Account archived.'); await goto(`/operations/accounts/${data.account.id}`, { invalidateAll: true, replaceState: true }); } catch (error) { toast.error(error.message); } }
  async function linkCompany() { if (!selectedCompanyId) return; try { await request(`/operations/accounts/${data.account.id}?action=link`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ companyId: selectedCompanyId }) }); selectedCompanyId = ''; toast.success('Company linked.'); await goto(`/operations/accounts/${data.account.id}`, { invalidateAll: true, replaceState: true }); } catch (error) { toast.error(error.message); } }
  async function unlinkCompany(companyId) { try { await request(`/operations/accounts/${data.account.id}?action=unlink&companyId=${companyId}`, { method: 'PATCH' }); toast.success('Company unlinked.'); await goto(`/operations/accounts/${data.account.id}`, { invalidateAll: true, replaceState: true }); } catch (error) { toast.error(error.message); } }
</script>

<svelte:head><title>{data.account.name} | Operations Accounts</title></svelte:head>

<div class="flex flex-col gap-6">
  <header class="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
    <div class="flex flex-col gap-3"><Button variant="ghost" size="sm" class="w-fit" onclick={() => goto('/operations/accounts')}><ArrowLeftIcon data-icon="inline-start" />Accounts</Button><div class="flex flex-wrap items-center gap-2"><h1 class="text-2xl font-semibold">{data.account.name}</h1><Badge variant={data.account.status === 'active' ? 'secondary' : 'outline'}>{data.account.status}</Badge></div>{#if data.account.description}<p class="max-w-2xl text-sm text-muted-foreground">{data.account.description}</p>{/if}</div>
    <div class="flex items-center gap-2">
    <Sheet.Root bind:open={communicationsOpen}>
      <Sheet.Trigger>
        {#snippet child({ props })}
          <Button {...props} variant="outline" size="icon" title="Communications" aria-label="Communications"><MessageSquareIcon /></Button>
        {/snippet}
      </Sheet.Trigger>
      <Sheet.Content side="right" class="w-full sm:max-w-md">
        <Sheet.Header>
          <Sheet.Title>Communications</Sheet.Title>
          <Sheet.Description>Messages, emails, and customer communication history for this account.</Sheet.Description>
        </Sheet.Header>
        <div class="flex flex-1 flex-col justify-between gap-6 py-6">
          <p class="text-sm text-muted-foreground">Communication history will appear here when this workspace is connected to customer messaging and email.</p>
          <Button variant="outline" onclick={() => goto(`/operations/accounts/${data.account.id}/communications`)}><Maximize2Icon data-icon="inline-start" />Open full page</Button>
        </div>
      </Sheet.Content>
    </Sheet.Root>
    <Sheet.Root bind:open={notesOpen}>
      <Sheet.Trigger>
        {#snippet child({ props })}
          <Button {...props} variant="outline" size="icon" title="Customer notes" aria-label="Customer notes"><NotebookPenIcon /></Button>
        {/snippet}
      </Sheet.Trigger>
      <Sheet.Content side="right" class="w-full sm:max-w-md">
        <Sheet.Header>
          <Sheet.Title>Customer notes</Sheet.Title>
          <Sheet.Description>Notes and account context for the customer team.</Sheet.Description>
        </Sheet.Header>
        <div class="flex flex-1 flex-col justify-between gap-6 py-6">
          <p class="text-sm text-muted-foreground">Customer notes will appear here when account notes are available.</p>
          <Button variant="outline" onclick={() => goto(`/operations/accounts/${data.account.id}/notes`)}><Maximize2Icon data-icon="inline-start" />Open full page</Button>
        </div>
      </Sheet.Content>
    </Sheet.Root>
    <Dialog.Root bind:open={editOpen}>
      <Dialog.Trigger>{#snippet child({ props })}<Button {...props} variant="outline" size="icon" title="Edit account" aria-label="Edit account"><PencilIcon /></Button>{/snippet}</Dialog.Trigger>
      <Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <Dialog.Header>
          <Dialog.Title>Edit Operations Account</Dialog.Title>
          <Dialog.Description>Update account details and manage the companies receiving service through this account.</Dialog.Description>
        </Dialog.Header>
        <Field.FieldGroup>
          <Field.Field><Field.FieldLabel for="operations-account-name">Name</Field.FieldLabel><Input id="operations-account-name" bind:value={form.name} required /></Field.Field>
          <Field.Field><Field.FieldLabel for="operations-account-description">Description</Field.FieldLabel><Input id="operations-account-description" bind:value={form.description} /></Field.Field>
          <Field.Field><Field.FieldLabel for="operations-account-status">Status</Field.FieldLabel><select id="operations-account-status" class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" bind:value={form.status}><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option></select></Field.Field>
          {#if errorMessage}<Field.FieldError>{errorMessage}</Field.FieldError>{/if}
        </Field.FieldGroup>
        <section class="flex flex-col gap-4 border-t border-border pt-5">
          <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"><div><h2 class="font-semibold">Linked companies</h2><p class="text-sm text-muted-foreground">Customer companies receiving service through this account.</p></div>{#if data.account.status !== 'archived'}<Button variant="outline" onclick={archive}>Archive account</Button>{/if}</div>
          {#if data.account.status === 'active'}
            <div class="flex flex-col gap-2 sm:flex-row"><select aria-label="Select a customer company" class="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm" bind:value={selectedCompanyId}><option value="">Select a customer company</option>{#each data.customerCompanies as company (company.id)}<option value={company.id}>{company.displayName || company.legalName}</option>{/each}</select><Button onclick={linkCompany} disabled={!selectedCompanyId}><LinkIcon data-icon="inline-start" />Link company</Button></div>
          {:else}
            <p class="text-sm text-muted-foreground">Only active accounts can receive new companies. Existing links remain available for history.</p>
          {/if}
          <div class="overflow-hidden rounded-md border border-border"><Table.Root><Table.Header><Table.Row><Table.Head>Company</Table.Head><Table.Head class="text-right">Action</Table.Head></Table.Row></Table.Header><Table.Body>{#each data.companies as company (company.id)}<Table.Row><Table.Cell><button class="font-medium hover:underline" onclick={() => goto(`/crm/companies/${company.id}`)}>{company.displayName || company.legalName}</button><p class="text-xs text-muted-foreground">{company.legalName}</p></Table.Cell><Table.Cell class="text-right"><Button variant="ghost" size="sm" onclick={() => unlinkCompany(company.id)} aria-label={`Unlink ${company.displayName || company.legalName}`}><UnlinkIcon data-icon="inline-start" />Unlink</Button></Table.Cell></Table.Row>{:else}<Table.Row><Table.Cell colspan={2} class="h-24 text-center text-sm text-muted-foreground">No companies linked yet.</Table.Cell></Table.Row>{/each}</Table.Body></Table.Root></div>
        </section>
        <Dialog.Footer><Button variant="outline" onclick={() => (editOpen = false)}>Cancel</Button><Button onclick={save} disabled={submitting}>{submitting ? 'Saving...' : 'Save changes'}</Button></Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
    </div>
  </header>

  <section class="grid gap-4 md:grid-cols-3">
    <div class="flex min-h-36 flex-col gap-3 rounded-lg border border-border p-5"><FileTextIcon class="text-muted-foreground" /><div><h2 class="font-semibold">Invoices</h2><p class="mt-1 text-sm text-muted-foreground">Open invoices and billing activity will appear here.</p></div></div>
    <div class="flex min-h-36 flex-col gap-3 rounded-lg border border-border p-5"><ListTodoIcon class="text-muted-foreground" /><div><h2 class="font-semibold">Important tasks</h2><p class="mt-1 text-sm text-muted-foreground">Account-level tasks and follow-ups will appear here.</p></div></div>
    <div class="flex min-h-36 flex-col gap-3 rounded-lg border border-border p-5"><CalendarDaysIcon class="text-muted-foreground" /><div><h2 class="font-semibold">Schedule</h2><p class="mt-1 text-sm text-muted-foreground">Important service dates and milestones will appear here.</p></div></div>
  </section>

</div>
