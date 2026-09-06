<script>
  import { goto } from '$app/navigation';
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
  import LinkIcon from '@lucide/svelte/icons/link';
  import UnlinkIcon from '@lucide/svelte/icons/unlink';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import * as AlertDialog from '$lib/components/ui/alert-dialog';
  import * as Field from '$lib/components/ui/field';
  import * as Select from '$lib/components/ui/select';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { toast } from '$lib/stores/toast.js';

  let { data } = $props();
  let saving = $state(false);
  let form = $state({ ...data.contact });

  $effect(() => { form = { ...data.contact }; });

  function companyName(id) {
    const company = data.companies.find((item) => item.id === id);
    return company ? company.displayName || company.legalName : 'Unknown company';
  }

  async function request(options = {}) {
    saving = true;
    try {
      const response = await fetch(`/crm/contacts/${data.contact.id}`, options);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The CRM request failed.');
      return result;
    } catch (error) { toast.error(error.message); throw error; }
    finally { saving = false; }
  }

  async function saveContact() {
    try {
      await request({ method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ firstName: form.firstName, lastName: form.lastName, jobTitle: form.jobTitle, email: form.email, phone: form.phone, extension: form.extension }) });
      toast.success('Contact updated.');
      await goto(`/crm/contacts/${data.contact.id}`, { invalidateAll: true, replaceState: true });
    } catch {}
  }

  async function changeCompany(accountId) {
    try {
      await request({ method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...form, accountId }) });
      toast.success(accountId ? 'Contact linked to company.' : 'Contact unlinked.');
      await goto(`/crm/contacts/${data.contact.id}`, { invalidateAll: true, replaceState: true });
    } catch { form.accountId = data.contact.accountId || ''; }
  }

  async function removeContact() {
    try {
      await request({ method: 'DELETE' });
      toast.success('Contact removed.');
      await goto('/crm/contacts');
    } catch {}
  }
</script>

<svelte:head><title>{data.contact.firstName} {data.contact.lastName} | Aionsoft CRM</title></svelte:head>

<div class="flex flex-col gap-6">
  <header class="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
    <div class="flex flex-col gap-2"><Button variant="ghost" size="sm" class="w-fit" onclick={() => goto('/crm/contacts')}><ArrowLeftIcon data-icon="inline-start" />Contacts</Button><div class="flex flex-wrap items-center gap-2"><h1 class="text-2xl font-semibold">{data.contact.firstName} {data.contact.lastName}</h1>{#if data.contact.accountId}<Badge variant="secondary">{companyName(data.contact.accountId)}</Badge>{:else}<Badge variant="outline">Unlinked</Badge>{/if}</div><p class="text-sm text-muted-foreground">{data.contact.jobTitle || 'Sales contact'}</p></div>
    <AlertDialog.Root><AlertDialog.Trigger>{#snippet child({ props })}<Button {...props} variant="outline"><Trash2Icon data-icon="inline-start" />Delete</Button>{/snippet}</AlertDialog.Trigger><AlertDialog.Content><AlertDialog.Header><AlertDialog.Title>Delete this contact?</AlertDialog.Title><AlertDialog.Description>This removes the contact from CRM. Company-linked primary contacts must be reassigned first.</AlertDialog.Description></AlertDialog.Header><AlertDialog.Footer><AlertDialog.Cancel>Cancel</AlertDialog.Cancel><AlertDialog.Action onclick={removeContact}>Delete contact</AlertDialog.Action></AlertDialog.Footer></AlertDialog.Content></AlertDialog.Root>
  </header>

  <section class="max-w-2xl"><Field.FieldGroup>
    <div class="grid gap-4 sm:grid-cols-2"><Field.Field><Field.FieldLabel for="detail-first">First name</Field.FieldLabel><Input id="detail-first" bind:value={form.firstName} /></Field.Field><Field.Field><Field.FieldLabel for="detail-last">Last name</Field.FieldLabel><Input id="detail-last" bind:value={form.lastName} /></Field.Field></div>
    <Field.Field><Field.FieldLabel for="detail-job-title">Job title</Field.FieldLabel><Input id="detail-job-title" bind:value={form.jobTitle} /></Field.Field>
    <Field.Field><Field.FieldLabel for="detail-email">Email</Field.FieldLabel><Input id="detail-email" bind:value={form.email} type="email" /></Field.Field>
    <div class="grid gap-4 sm:grid-cols-2"><Field.Field><Field.FieldLabel for="detail-phone">Phone</Field.FieldLabel><Input id="detail-phone" bind:value={form.phone} type="tel" /></Field.Field><Field.Field><Field.FieldLabel for="detail-extension">Extension</Field.FieldLabel><Input id="detail-extension" bind:value={form.extension} /></Field.Field></div>
    <Button class="w-fit" onclick={saveContact} disabled={saving}>Save changes</Button>
  </Field.FieldGroup></section>

  <section class="max-w-2xl border-t border-border pt-6"><div class="flex items-center justify-between gap-4"><div><h2 class="font-semibold">Company relationship</h2><p class="text-sm text-muted-foreground">Keep this contact unlinked while the sales relationship is still being qualified.</p></div>{#if data.contact.accountId}<Badge variant="secondary">Linked</Badge>{:else}<Badge variant="outline">Unlinked</Badge>{/if}</div>
    <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"><Field.Field class="min-w-0 flex-1"><Field.FieldLabel for="detail-company">Company</Field.FieldLabel><Select.Root value={form.accountId || ''} onValueChange={changeCompany}><Select.Trigger id="detail-company" class="w-full">{form.accountId ? companyName(form.accountId) : 'Select a company'}</Select.Trigger><Select.Content><Select.Group>{#each data.companies as company (company.id)}<Select.Item value={company.id}>{companyName(company.id)}</Select.Item>{/each}</Select.Group></Select.Content></Select.Root></Field.Field>{#if data.contact.accountId}<Button variant="outline" onclick={() => changeCompany('')} disabled={saving}><UnlinkIcon data-icon="inline-start" />Unlink</Button>{:else}<Button variant="outline" disabled={!data.companies.length || saving}><LinkIcon data-icon="inline-start" />Choose a company above</Button>{/if}</div>
  </section>
</div>
