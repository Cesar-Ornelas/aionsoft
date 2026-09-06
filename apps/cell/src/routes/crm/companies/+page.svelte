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
  let draft = $state({ name: '', phone: '', postalCode: '', page: 1, pageSize: 25, sort: 'name' });
  let companyForm = $state({
    type: 'legal_entity',
    legalName: '',
    displayName: '',
    lifecycle: 'customer',
    phone: ''
  });

  $effect(() => {
    draft = { ...data.filters };
  });

  const activeFilters = $derived([
    data.filters.name && { key: 'name', label: `Name: ${data.filters.name}` },
    data.filters.phone && { key: 'phone', label: `Phone: ${data.filters.phone}` },
    data.filters.postalCode && { key: 'postalCode', label: `ZIP: ${data.filters.postalCode}` }
  ].filter(Boolean));

  function filterUrl(values, page = 1) {
    const params = new URLSearchParams();
    if (values.name?.trim()) params.set('name', values.name.trim());
    if (values.phone?.trim()) params.set('phone', values.phone.trim());
    if (values.postalCode?.trim()) params.set('postalCode', values.postalCode.trim());
    if (page > 1) params.set('page', String(page));
    return params.size ? `/crm/companies?${params}` : '/crm/companies';
  }

  async function applyFilters() {
    filterOpen = false;
    await goto(filterUrl(draft));
  }

  async function clearFilters() {
    draft = { name: '', phone: '', postalCode: '', page: 1, pageSize: 25, sort: 'name' };
    filterOpen = false;
    await goto('/crm/companies');
  }

  async function removeFilter(key) {
    const next = { ...data.filters, [key]: '' };
    draft = next;
    await goto(filterUrl(next));
  }

  async function createCompany() {
    formError = '';
    submitting = true;

    try {
      const response = await fetch('/crm/companies', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(companyForm)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to create company.');
      toast.success('Company created.');
      createOpen = false;
      await goto(`/crm/companies/${result.id}`);
    } catch (error) {
      formError = error.message;
      toast.error(formError);
    } finally {
      submitting = false;
    }
  }

  function displayName(company) {
    return company.displayName || company.legalName;
  }
</script>

<svelte:head><title>Companies | Aionsoft CRM</title></svelte:head>

<div class="flex flex-col gap-6">
  <header class="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
    <div class="flex flex-col gap-1">
      <p class="text-sm font-medium text-muted-foreground">CRM</p>
      <h1 class="text-2xl font-semibold text-foreground">Companies</h1>
      <p class="text-sm text-muted-foreground">{data.companies.totalItems} companies across legal entities and operating names</p>
    </div>
    <div class="flex items-center gap-2">
      <Sheet.Root bind:open={filterOpen}>
        <Button variant="outline" onclick={() => (filterOpen = true)}>
          <FilterIcon data-icon="inline-start" />
          Filters
          {#if activeFilters.length}<Badge variant="secondary">{activeFilters.length}</Badge>{/if}
        </Button>
        {#if activeFilters.length}<Button variant="ghost" size="icon" onclick={clearFilters} aria-label="Clear filters" title="Clear filters"><XIcon /></Button>{/if}
        <Sheet.Content side="right" class="w-full sm:max-w-md">
          <Sheet.Header>
            <Sheet.Title>Filter companies</Sheet.Title>
            <Sheet.Description>Find accounts by identity, phone, or any service address.</Sheet.Description>
          </Sheet.Header>
          <div class="px-4 py-6">
            <Field.FieldGroup>
              <Field.Field>
                <Field.FieldLabel for="filter-name">Name</Field.FieldLabel>
                <Input id="filter-name" bind:value={draft.name} placeholder="Legal or operating name" />
              </Field.Field>
              <Field.Field>
                <Field.FieldLabel for="filter-phone">Phone</Field.FieldLabel>
                <Input id="filter-phone" bind:value={draft.phone} placeholder="Account or contact phone" />
              </Field.Field>
              <Field.Field>
                <Field.FieldLabel for="filter-postal">ZIP or postal code</Field.FieldLabel>
                <Input id="filter-postal" bind:value={draft.postalCode} placeholder="Any company address" />
              </Field.Field>
            </Field.FieldGroup>
          </div>
          <Sheet.Footer>
            <Button variant="outline" onclick={clearFilters}>Clear</Button>
            <Button onclick={applyFilters}><SearchIcon data-icon="inline-start" />Apply filters</Button>
          </Sheet.Footer>
        </Sheet.Content>
      </Sheet.Root>

      <Dialog.Root bind:open={createOpen}>
        <Dialog.Trigger>
          {#snippet child({ props })}
            <Button {...props}><PlusIcon data-icon="inline-start" />New company</Button>
          {/snippet}
        </Dialog.Trigger>
        <Dialog.Content class="sm:max-w-lg">
          <Dialog.Header>
            <Dialog.Title>New company</Dialog.Title>
            <Dialog.Description>Create a legal entity or an operating DBA account.</Dialog.Description>
          </Dialog.Header>
          <Field.FieldGroup>
            <Field.Field>
              <Field.FieldLabel for="company-type">Company type</Field.FieldLabel>
              <Select.Root bind:value={companyForm.type}>
                <Select.Trigger id="company-type" class="w-full">{companyForm.type === 'dba' ? 'DBA / operating name' : 'Legal entity'}</Select.Trigger>
                <Select.Content>
                  <Select.Group>
                    <Select.Item value="legal_entity">Legal entity</Select.Item>
                    <Select.Item value="dba">DBA / operating name</Select.Item>
                  </Select.Group>
                </Select.Content>
              </Select.Root>
            </Field.Field>
            <Field.Field>
              <Field.FieldLabel for="legal-name">Legal name</Field.FieldLabel>
              <Input id="legal-name" bind:value={companyForm.legalName} aria-invalid={Boolean(formError)} />
            </Field.Field>
            <Field.Field>
              <Field.FieldLabel for="display-name">Display name</Field.FieldLabel>
              <Input id="display-name" bind:value={companyForm.displayName} placeholder="Optional operating name" />
            </Field.Field>
            <Field.Field>
              <Field.FieldLabel for="company-phone">Main phone</Field.FieldLabel>
              <Input id="company-phone" bind:value={companyForm.phone} type="tel" />
            </Field.Field>
            {#if formError}<Field.FieldError>{formError}</Field.FieldError>{/if}
          </Field.FieldGroup>
          <Dialog.Footer>
            <Button variant="outline" onclick={() => (createOpen = false)}>Cancel</Button>
            <Button onclick={createCompany} disabled={submitting}>{submitting ? 'Creating...' : 'Create company'}</Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  </header>

  {#if activeFilters.length}
    <div class="flex flex-wrap items-center gap-2" aria-label="Active filters">
      {#each activeFilters as filter (filter.key)}
        <button type="button" onclick={() => removeFilter(filter.key)} aria-label={`Remove ${filter.label} filter`}>
          <Badge variant="secondary">{filter.label} ×</Badge>
        </button>
      {/each}
      <Button variant="ghost" size="sm" onclick={clearFilters}>Clear all</Button>
    </div>
  {/if}

  <div class="overflow-hidden rounded-lg border border-border">
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>Account</Table.Head>
          <Table.Head>Type</Table.Head>
          <Table.Head>Lifecycle</Table.Head>
          <Table.Head>Phone</Table.Head>
          <Table.Head class="text-right">Updated</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each data.companies.items as company (company.id)}
          <Table.Row class="cursor-pointer" onclick={() => goto(`/crm/companies/${company.id}`)}>
            <Table.Cell>
              <div class="flex flex-col gap-0.5">
                <span class="font-medium text-foreground">{displayName(company)}</span>
                {#if company.displayName}<span class="text-xs text-muted-foreground">{company.legalName}</span>{/if}
              </div>
            </Table.Cell>
            <Table.Cell>{company.type === 'dba' ? 'DBA' : 'Legal entity'}</Table.Cell>
            <Table.Cell><Badge variant="outline">{company.lifecycle}</Badge></Table.Cell>
            <Table.Cell>{company.phone || '—'}</Table.Cell>
            <Table.Cell class="text-right text-muted-foreground">{company.updatedAt ? new Date(company.updatedAt).toLocaleDateString() : '—'}</Table.Cell>
          </Table.Row>
        {:else}
          <Table.Row>
            <Table.Cell colspan={5} class="h-32 text-center text-muted-foreground">No companies match the current filters.</Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  </div>

  {#if data.companies.totalPages > 1}
    <nav class="flex items-center justify-between" aria-label="Company pages">
      <p class="text-sm text-muted-foreground">Page {data.companies.page} of {data.companies.totalPages}</p>
      <div class="flex gap-2">
        <Button variant="outline" disabled={data.companies.page <= 1} onclick={() => goto(filterUrl(data.filters, data.companies.page - 1))}>Previous</Button>
        <Button variant="outline" disabled={data.companies.page >= data.companies.totalPages} onclick={() => goto(filterUrl(data.filters, data.companies.page + 1))}>Next</Button>
      </div>
    </nav>
  {/if}
</div>
