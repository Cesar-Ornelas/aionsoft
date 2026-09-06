<script>
  import { goto } from '$app/navigation';
  import FilterIcon from '@lucide/svelte/icons/list-filter';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import SearchIcon from '@lucide/svelte/icons/search';
  import XIcon from '@lucide/svelte/icons/x';
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Field from '$lib/components/ui/field';
  import * as Select from '$lib/components/ui/select';
  import * as Sheet from '$lib/components/ui/sheet';
  import * as Table from '$lib/components/ui/table';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { toast } from '$lib/stores/toast.js';

  let { data } = $props();
  let filterOpen = $state(false);
  let createOpen = $state(false);
  let submitting = $state(false);
  let formError = $state('');
  let draft = $state({ ...data.filters });
  let contactForm = $state({ firstName: '', lastName: '', jobTitle: '', email: '', phone: '', extension: '', accountId: '' });

  $effect(() => { draft = { ...data.filters }; });

  const activeFilters = $derived([
    data.filters.name && { key: 'name', label: `Name: ${data.filters.name}` },
    data.filters.email && { key: 'email', label: `Email: ${data.filters.email}` },
    data.filters.phone && { key: 'phone', label: `Phone: ${data.filters.phone}` },
    data.filters.jobTitle && { key: 'jobTitle', label: `Title: ${data.filters.jobTitle}` },
    data.filters.companyState !== 'all' && { key: 'companyState', label: data.filters.companyState === 'linked' ? 'Linked' : 'Unlinked' },
    data.filters.companyId && { key: 'companyId', label: `Company: ${companyName(data.filters.companyId)}` }
  ].filter(Boolean));

  function filterUrl(values) {
    const params = new URLSearchParams();
    for (const key of ['name', 'email', 'phone', 'jobTitle']) if (values[key]?.trim()) params.set(key, values[key].trim());
    if (values.companyState && values.companyState !== 'all') params.set('companyState', values.companyState);
    if (values.companyId?.trim()) params.set('companyId', values.companyId.trim());
    return params.size ? `/crm/contacts?${params}` : '/crm/contacts';
  }

  async function applyFilters() { filterOpen = false; await goto(filterUrl(draft)); }
  async function clearFilters() { draft = { name: '', email: '', phone: '', jobTitle: '', companyState: 'all', companyId: '' }; filterOpen = false; await goto('/crm/contacts'); }
  async function removeFilter(key) { const next = { ...data.filters, [key]: key === 'companyState' ? 'all' : '' }; draft = next; await goto(filterUrl(next)); }

  function companyName(id) {
    const company = data.companies.find((item) => item.id === id);
    return company ? company.displayName || company.legalName : 'Unknown company';
  }

  function resetForm() {
    contactForm = { firstName: '', lastName: '', jobTitle: '', email: '', phone: '', extension: '', accountId: '' };
    formError = '';
  }

  async function createContact() {
    submitting = true;
    formError = '';
    try {
      if (!contactForm.firstName.trim() || !contactForm.lastName.trim()) {
        throw new Error('First and last names are required.');
      }
      if (!contactForm.email.trim() && !contactForm.phone.trim()) {
        throw new Error('Add an email address or phone number.');
      }
      const response = await fetch('/crm/contacts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(contactForm) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to create contact.');
      toast.success('Contact created.');
      createOpen = false;
      await goto(`/crm/contacts/${result.id}`);
    } catch (error) { formError = error.message; toast.error(formError); }
    finally { submitting = false; }
  }
</script>

<svelte:head><title>Contacts | Aionsoft CRM</title></svelte:head>

<div class="flex flex-col gap-6">
  <header class="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
    <div class="flex flex-col gap-1">
      <p class="text-sm font-medium text-muted-foreground">CRM</p>
      <h1 class="text-2xl font-semibold text-foreground">Contacts</h1>
      <p class="text-sm text-muted-foreground">People you are evaluating, engaging, or supporting across the sales process.</p>
    </div>
    <div class="flex items-center gap-2">
      <Sheet.Root bind:open={filterOpen}>
        <Button variant="outline" onclick={() => (filterOpen = true)}><FilterIcon data-icon="inline-start" />Filters {#if activeFilters.length}<Badge variant="secondary">{activeFilters.length}</Badge>{/if}</Button>
        {#if activeFilters.length}<Button variant="ghost" size="icon" onclick={clearFilters} aria-label="Clear filters" title="Clear filters"><XIcon /></Button>{/if}
        <Sheet.Content side="right" class="w-full sm:max-w-md">
          <Sheet.Header><Sheet.Title>Filter contacts</Sheet.Title><Sheet.Description>Find people by identity, contact details, or company link.</Sheet.Description></Sheet.Header>
          <div class="px-4 py-6"><Field.FieldGroup>
            <Field.Field><Field.FieldLabel for="contact-filter-name">Name</Field.FieldLabel><Input id="contact-filter-name" bind:value={draft.name} placeholder="First or last name" /></Field.Field>
            <Field.Field><Field.FieldLabel for="contact-filter-email">Email</Field.FieldLabel><Input id="contact-filter-email" bind:value={draft.email} /></Field.Field>
            <Field.Field><Field.FieldLabel for="contact-filter-phone">Phone</Field.FieldLabel><Input id="contact-filter-phone" bind:value={draft.phone} /></Field.Field>
            <Field.Field><Field.FieldLabel for="contact-filter-title">Job title</Field.FieldLabel><Input id="contact-filter-title" bind:value={draft.jobTitle} /></Field.Field>
            <Field.Field><Field.FieldLabel for="contact-filter-company-name">Company</Field.FieldLabel><select id="contact-filter-company-name" class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30" value={draft.companyId} onchange={(event) => (draft.companyId = event.currentTarget.value)}><option value="">All active companies</option>{#each data.companies as company (company.id)}<option value={company.id}>{companyName(company.id)}</option>{/each}</select></Field.Field>
            <Field.Field><Field.FieldLabel for="contact-filter-company">Company link</Field.FieldLabel><Select.Root bind:value={draft.companyState}><Select.Trigger id="contact-filter-company" class="w-full">{draft.companyState === 'linked' ? 'Linked to a company' : draft.companyState === 'unlinked' ? 'Not linked yet' : 'All contacts'}</Select.Trigger><Select.Content><Select.Group><Select.Item value="all">All contacts</Select.Item><Select.Item value="linked">Linked to a company</Select.Item><Select.Item value="unlinked">Not linked yet</Select.Item></Select.Group></Select.Content></Select.Root></Field.Field>
          </Field.FieldGroup></div>
          <Sheet.Footer><Button variant="outline" onclick={clearFilters}>Clear</Button><Button onclick={applyFilters}><SearchIcon data-icon="inline-start" />Apply filters</Button></Sheet.Footer>
        </Sheet.Content>
      </Sheet.Root>
      <Dialog.Root bind:open={createOpen} onOpenChange={(open) => { if (open) resetForm(); }}>
        <Dialog.Trigger>{#snippet child({ props })}<Button {...props}><PlusIcon data-icon="inline-start" />New contact</Button>{/snippet}</Dialog.Trigger>
        <Dialog.Content class="sm:max-w-lg"><Dialog.Header><Dialog.Title>New contact</Dialog.Title><Dialog.Description>Add someone before the company relationship is fully known, or link them now.</Dialog.Description></Dialog.Header>
          <Field.FieldGroup>
            <div class="grid gap-4 sm:grid-cols-2"><Field.Field><Field.FieldLabel for="contact-first">First name <span class="text-destructive">*</span></Field.FieldLabel><Input id="contact-first" bind:value={contactForm.firstName} required /></Field.Field><Field.Field><Field.FieldLabel for="contact-last">Last name <span class="text-destructive">*</span></Field.FieldLabel><Input id="contact-last" bind:value={contactForm.lastName} required /></Field.Field></div>
            <Field.Field><Field.FieldLabel for="contact-job-title">Job title <span class="text-muted-foreground">(optional)</span></Field.FieldLabel><Input id="contact-job-title" bind:value={contactForm.jobTitle} /></Field.Field>
            <Field.Field><Field.FieldLabel for="contact-email">Email <span class="text-muted-foreground">(email or phone required)</span></Field.FieldLabel><Input id="contact-email" bind:value={contactForm.email} type="email" /></Field.Field>
            <div class="grid gap-4 sm:grid-cols-2"><Field.Field><Field.FieldLabel for="contact-phone">Phone <span class="text-muted-foreground">(email or phone required)</span></Field.FieldLabel><Input id="contact-phone" bind:value={contactForm.phone} type="tel" /></Field.Field><Field.Field><Field.FieldLabel for="contact-extension">Extension <span class="text-muted-foreground">(optional)</span></Field.FieldLabel><Input id="contact-extension" bind:value={contactForm.extension} /></Field.Field></div>
            <Field.Field><Field.FieldLabel for="contact-company">Company <span class="text-muted-foreground">(optional)</span></Field.FieldLabel><Select.Root bind:value={contactForm.accountId}><Select.Trigger id="contact-company" class="w-full">{contactForm.accountId ? companyName(contactForm.accountId) : 'Leave unlinked'}</Select.Trigger><Select.Content><Select.Group><Select.Item value="">Leave unlinked</Select.Item>{#each data.companies as company (company.id)}<Select.Item value={company.id}>{companyName(company.id)}</Select.Item>{/each}</Select.Group></Select.Content></Select.Root></Field.Field>
            {#if formError}<Field.FieldError>{formError}</Field.FieldError>{/if}
          </Field.FieldGroup>
          <Dialog.Footer><Button variant="outline" onclick={() => (createOpen = false)}>Cancel</Button><Button onclick={createContact} disabled={submitting}>{submitting ? 'Creating...' : 'Create contact'}</Button></Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  </header>

  {#if activeFilters.length}<div class="flex flex-wrap items-center gap-2" aria-label="Active filters">{#each activeFilters as filter (filter.key)}<button type="button" onclick={() => removeFilter(filter.key)} aria-label={`Remove ${filter.label} filter`}><Badge variant="secondary">{filter.label} x</Badge></button>{/each}<Button variant="ghost" size="sm" onclick={clearFilters}>Clear all</Button></div>{/if}

  <div class="overflow-hidden rounded-lg border border-border"><Table.Root><Table.Header><Table.Row><Table.Head>Name</Table.Head><Table.Head>Job title</Table.Head><Table.Head>Email</Table.Head><Table.Head>Company</Table.Head><Table.Head class="text-right">Phone</Table.Head></Table.Row></Table.Header><Table.Body>
    {#each data.contacts as contact (contact.id)}<Table.Row class="cursor-pointer" onclick={() => goto(`/crm/contacts/${contact.id}`)}><Table.Cell class="font-medium">{contact.firstName} {contact.lastName}</Table.Cell><Table.Cell>{contact.jobTitle || '—'}</Table.Cell><Table.Cell>{contact.email || '—'}</Table.Cell><Table.Cell>{#if contact.accountId}{companyName(contact.accountId)}{:else}<Badge variant="outline">Unlinked</Badge>{/if}</Table.Cell><Table.Cell class="text-right">{contact.phone || '—'}{contact.extension ? ` ext. ${contact.extension}` : ''}</Table.Cell></Table.Row>
    {:else}<Table.Row><Table.Cell colspan={5} class="h-32 text-center text-muted-foreground">No contacts match the current filters.</Table.Cell></Table.Row>{/each}
  </Table.Body></Table.Root></div>
</div>
