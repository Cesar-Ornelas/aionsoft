<script>
  import { goto } from '$app/navigation';
  import FilterIcon from '@lucide/svelte/icons/list-filter';
  import PencilIcon from '@lucide/svelte/icons/pencil';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import SearchIcon from '@lucide/svelte/icons/search';
  import ArchiveIcon from '@lucide/svelte/icons/archive';
  import CopyIcon from '@lucide/svelte/icons/copy';
  import TagsIcon from '@lucide/svelte/icons/tags';
  import XIcon from '@lucide/svelte/icons/x';
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Field from '$lib/components/ui/field';
  import * as Sheet from '$lib/components/ui/sheet';
  import * as Table from '$lib/components/ui/table';
  import * as Tabs from '$lib/components/ui/tabs';
  import IssueDescriptionEditor from '$lib/components/IssueDescriptionEditor.svelte';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { toast } from '$lib/stores/toast.js';

  let { data } = $props();
  let filterOpen = $state(false);
  let dialogOpen = $state(false);
  let submitting = $state(false);
  let formError = $state('');
  let editingService = $state(null);
  let pricingService = $state(null);
  let pricingOffers = $state([]);
  let pricingOpen = $state(false);
  let pricingSubmitting = $state(false);
  let pricingError = $state('');
  let editingOffer = $state(null);
  let offerLoading = $state(false);
  let serviceTab = $state('details');
  let pricingForm = $state({ name: '', billingBasis: 'fixed', unitLabel: 'project', salePrice: '0.00', internalCost: '0.00' });
  let filters = $state({ search: '', status: '', page: 1, pageSize: 25 });
  let form = $state({ name: '', description: '', code: '', billingBasis: 'fixed', unitLabel: 'project', customerPrice: '0.00', internalCost: '0.00', currency: 'USD', status: 'active' });

  $effect(() => {
    filters = { ...data.filters };
  });

  const activeFilters = $derived([
    data.filters.search && { key: 'search', label: `Search: ${data.filters.search}` },
    data.filters.status && { key: 'status', label: `Status: ${data.filters.status}` }
  ].filter(Boolean));

  function filterUrl(values, page = 1) {
    const params = new URLSearchParams();
    if (values.search?.trim()) params.set('search', values.search.trim());
    if (values.status) params.set('status', values.status);
    if (page > 1) params.set('page', String(page));
    return params.size ? `/catalog/services?${params}` : '/catalog/services';
  }

  async function applyFilters() {
    filterOpen = false;
    await goto(filterUrl(filters));
  }

  async function clearFilters() {
    filters = { search: '', status: '', page: 1, pageSize: 25 };
    filterOpen = false;
    await goto('/catalog/services');
  }

  async function removeFilter(key) {
    const next = { ...data.filters, [key]: '' };
    filters = next;
    await goto(filterUrl(next));
  }

  function money(cents, currency = 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format((Number(cents) || 0) / 100);
  }

  function resetForm() {
    form = { name: '', description: '', code: '', billingBasis: 'fixed', unitLabel: 'project', customerPrice: '0.00', internalCost: '0.00', currency: 'USD', status: 'active' };
    formError = '';
    editingService = null;
    editingOffer = null;
    serviceTab = 'details';
  }

  function openCreate() {
    resetForm();
    dialogOpen = true;
  }

  function duplicateCode(code) {
    const suffix = '-COPY';
    return `${String(code || 'SERVICE').slice(0, 32 - suffix.length)}${suffix}`;
  }

  async function openDuplicate(service) {
    editingService = null;
    editingOffer = null;
    form = {
      name: `${service.name} (copy)`,
      description: service.description,
      code: duplicateCode(service.code),
      billingBasis: 'fixed',
      unitLabel: 'project',
      customerPrice: (service.customerPriceCents / 100).toFixed(2),
      internalCost: (service.internalCostCents / 100).toFixed(2),
      currency: service.currency,
      status: 'active'
    };
    formError = '';
    serviceTab = 'details';
    offerLoading = true;
    dialogOpen = true;
    try {
      const response = await fetch(`/catalog/services/${service.id}/offers`);
      if (!response.ok) throw new Error('Unable to load pricing offer.');
      const offer = (await response.json())[0];
      if (offer) {
        form.billingBasis = offer.billingBasis;
        form.unitLabel = offer.unitLabel;
        form.customerPrice = (offer.salePriceCents / 100).toFixed(2);
        form.internalCost = (offer.internalCostCents / 100).toFixed(2);
        form.currency = offer.currency;
      }
    } catch (error) {
      formError = error.message;
    } finally {
      offerLoading = false;
    }
  }

  async function openEdit(service) {
    editingService = service;
    editingOffer = null;
    form = {
      name: service.name,
      description: service.description,
      code: service.code,
      billingBasis: 'fixed',
      unitLabel: 'project',
      customerPrice: (service.customerPriceCents / 100).toFixed(2),
      internalCost: (service.internalCostCents / 100).toFixed(2),
      currency: service.currency,
      status: service.status
    };
    formError = '';
    serviceTab = 'details';
    offerLoading = true;
    dialogOpen = true;
    try {
      const response = await fetch(`/catalog/services/${service.id}/offers`);
      if (!response.ok) throw new Error('Unable to load pricing offer.');
      const offers = await response.json();
      const offer = offers[0];
      if (offer) {
        editingOffer = offer;
        form.billingBasis = offer.billingBasis;
        form.unitLabel = offer.unitLabel;
        form.customerPrice = (offer.salePriceCents / 100).toFixed(2);
        form.internalCost = (offer.internalCostCents / 100).toFixed(2);
        form.currency = offer.currency;
      }
    } catch (error) {
      formError = error.message;
    } finally {
      offerLoading = false;
    }
  }

  function openPricing(service) {
    pricingService = service;
    pricingOffers = [];
    pricingError = '';
    pricingForm = { name: `${service.name} standard`, billingBasis: 'fixed', unitLabel: 'project', salePrice: '0.00', internalCost: '0.00' };
    pricingOpen = true;
    fetch(`/catalog/services/${service.id}/offers`).then(async (response) => {
      if (!response.ok) throw new Error('Unable to load pricing offers.');
      pricingOffers = await response.json();
    }).catch((error) => { pricingError = error.message; });
  }

  function unitPlaceholder() {
    return { fixed: 'project', hourly: 'hour', daily: 'day', per_unit: 'item', recurring: 'month' }[pricingForm.billingBasis];
  }

  async function savePricingOffer() {
    pricingSubmitting = true;
    pricingError = '';
    try {
      const response = await fetch(`/catalog/services/${pricingService.id}/offers`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
        name: pricingForm.name,
        billingBasis: pricingForm.billingBasis,
        unitLabel: pricingForm.unitLabel || unitPlaceholder(),
        salePriceCents: Math.round(Number(pricingForm.salePrice) * 100),
        internalCostCents: Math.round(Number(pricingForm.internalCost) * 100)
      }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to create pricing offer.');
      pricingOffers = [...pricingOffers, result];
      toast.success('Pricing offer added.');
      pricingForm = { name: `${pricingService.name} standard`, billingBasis: 'fixed', unitLabel: 'project', salePrice: '0.00', internalCost: '0.00' };
    } catch (error) {
      pricingError = error.message;
      toast.error(pricingError);
    } finally {
      pricingSubmitting = false;
    }
  }

  async function saveService() {
    submitting = true;
    formError = '';
    try {
      const payload = {
        name: form.name,
        description: form.description,
        code: form.code,
        customerPriceCents: Math.round(Number(form.customerPrice) * 100),
        internalCostCents: Math.round(Number(form.internalCost) * 100),
        currency: form.currency,
        status: form.status,
        ...(!editingService && { priceOffers: [{
          name: `${form.name} standard`,
          billingBasis: form.billingBasis,
          unitLabel: form.unitLabel,
          salePriceCents: Math.round(Number(form.customerPrice) * 100),
          internalCostCents: Math.round(Number(form.internalCost) * 100),
          currency: form.currency
        }] })
      };
      const url = editingService ? `/catalog/services/${editingService.id}` : '/catalog/services';
      const response = await fetch(url, { method: editingService ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save service.');
      if (editingService) {
        const offerResponse = editingOffer
          ? await fetch(`/catalog/services/${editingService.id}/offers`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
            offerId: editingOffer.id,
            name: editingOffer.name,
            billingBasis: form.billingBasis,
            unitLabel: form.unitLabel,
            salePriceCents: Math.round(Number(form.customerPrice) * 100),
            internalCostCents: Math.round(Number(form.internalCost) * 100),
            currency: form.currency
          }) })
          : await fetch(`/catalog/services/${editingService.id}/offers`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
            name: `${form.name} standard`,
            billingBasis: form.billingBasis,
            unitLabel: form.unitLabel,
            salePriceCents: Math.round(Number(form.customerPrice) * 100),
            internalCostCents: Math.round(Number(form.internalCost) * 100),
            currency: form.currency
          }) });
        const offerResult = await offerResponse.json();
        if (!offerResponse.ok) throw new Error(offerResult.error || 'Unable to save pricing offer.');
      }
      toast.success(editingService ? 'Service updated.' : 'Service created.');
      dialogOpen = false;
      await goto('/catalog/services', { invalidateAll: true, replaceState: true });
    } catch (error) {
      formError = error.message;
      toast.error(formError);
    } finally {
      submitting = false;
    }
  }

  async function archiveService(service) {
    if (!confirm(`Archive ${service.name}? It will remain available for historical references.`)) return;
    try {
      const response = await fetch(`/catalog/services/${service.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'archive' }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to archive service.');
      toast.success('Service archived.');
      await goto(filterUrl(data.filters), { invalidateAll: true, replaceState: true });
    } catch (error) {
      toast.error(error.message);
    }
  }
</script>

<svelte:head><title>Services & Pricing | Aionsoft</title></svelte:head>

<div class="flex flex-col gap-6">
  <header class="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
    <div class="flex flex-col gap-1">
      <p class="text-sm font-medium text-muted-foreground">Sales</p>
      <h1 class="text-2xl font-semibold text-foreground">Services & Pricing</h1>
      <p class="text-sm text-muted-foreground">Manage reusable services, sale prices, and internal delivery costs.</p>
    </div>
    <div class="flex items-center gap-2">
      <Sheet.Root bind:open={filterOpen}>
        <Button variant="outline" onclick={() => (filterOpen = true)}><FilterIcon data-icon="inline-start" />Filters{#if activeFilters.length}<Badge variant="secondary">{activeFilters.length}</Badge>{/if}</Button>
        {#if activeFilters.length}<Button variant="ghost" size="icon" onclick={clearFilters} aria-label="Clear filters" title="Clear filters"><XIcon /></Button>{/if}
        <Sheet.Content side="right" class="w-full sm:max-w-md">
          <Sheet.Header><Sheet.Title>Filter services</Sheet.Title><Sheet.Description>Find services by name, description, code, or lifecycle.</Sheet.Description></Sheet.Header>
          <div class="px-4 py-6"><Field.FieldGroup>
            <Field.Field><Field.FieldLabel for="catalog-search">Search</Field.FieldLabel><Input id="catalog-search" bind:value={filters.search} placeholder="Name, description, or code" /></Field.Field>
            <Field.Field><Field.FieldLabel for="catalog-status">Status</Field.FieldLabel><select id="catalog-status" class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" bind:value={filters.status}><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option></select></Field.Field>
          </Field.FieldGroup></div>
          <Sheet.Footer><Button variant="outline" onclick={clearFilters}>Clear</Button><Button onclick={applyFilters}><SearchIcon data-icon="inline-start" />Apply filters</Button></Sheet.Footer>
        </Sheet.Content>
      </Sheet.Root>
      <Button onclick={openCreate}><PlusIcon data-icon="inline-start" />New service</Button>
    </div>
  </header>

  {#if activeFilters.length}<div class="flex flex-wrap items-center gap-2" aria-label="Active filters">{#each activeFilters as filter (filter.key)}<button type="button" onclick={() => removeFilter(filter.key)} aria-label={`Remove ${filter.label} filter`}><Badge variant="secondary">{filter.label} ×</Badge></button>{/each}<Button variant="ghost" size="sm" onclick={clearFilters}>Clear all</Button></div>{/if}

  <div class="overflow-hidden rounded-lg border border-border">
    <Table.Root>
      <Table.Header><Table.Row><Table.Head>Service</Table.Head><Table.Head>Code / SKU</Table.Head><Table.Head>Status</Table.Head><Table.Head>Legacy price</Table.Head><Table.Head>Pricing offers</Table.Head><Table.Head class="text-right">Actions</Table.Head></Table.Row></Table.Header>
      <Table.Body>
        {#each data.services.items as service (service.id)}
          <Table.Row>
            <Table.Cell><div class="flex flex-col gap-0.5"><span class="font-medium text-foreground">{service.name}</span>{#if service.description}<span class="max-w-sm truncate text-xs text-muted-foreground">{service.description}</span>{/if}</div></Table.Cell>
            <Table.Cell class="font-mono text-sm">{service.code}</Table.Cell>
            <Table.Cell><Badge variant={service.status === 'active' ? 'secondary' : 'outline'}>{service.status}</Badge></Table.Cell>
            <Table.Cell>{money(service.customerPriceCents, service.currency)}</Table.Cell>
            <Table.Cell><Button variant="outline" size="sm" onclick={() => openPricing(service)}><TagsIcon data-icon="inline-start" />Manage</Button></Table.Cell>
            <Table.Cell><div class="flex justify-end gap-1"><Button variant="ghost" size="icon" title={`Duplicate ${service.name}`} aria-label={`Duplicate ${service.name}`} onclick={() => openDuplicate(service)}><CopyIcon /></Button><Button variant="ghost" size="icon" title={`Edit ${service.name}`} aria-label={`Edit ${service.name}`} onclick={() => openEdit(service)}><PencilIcon /></Button>{#if service.status !== 'archived'}<Button variant="ghost" size="icon" title={`Archive ${service.name}`} aria-label={`Archive ${service.name}`} onclick={() => archiveService(service)}><ArchiveIcon /></Button>{/if}</div></Table.Cell>
          </Table.Row>
        {:else}<Table.Row><Table.Cell colspan={6} class="h-32 text-center text-muted-foreground">No services match the current filters.</Table.Cell></Table.Row>{/each}
      </Table.Body>
    </Table.Root>
  </div>

  {#if data.services.totalPages > 1}<nav class="flex items-center justify-between" aria-label="Service pages"><p class="text-sm text-muted-foreground">Page {data.services.page} of {data.services.totalPages}</p><div class="flex gap-2"><Button variant="outline" disabled={data.services.page <= 1} onclick={() => goto(filterUrl(data.filters, data.services.page - 1))}>Previous</Button><Button variant="outline" disabled={data.services.page >= data.services.totalPages} onclick={() => goto(filterUrl(data.filters, data.services.page + 1))}>Next</Button></div></nav>{/if}

  <Dialog.Root bind:open={dialogOpen}>
    <Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <Dialog.Header><Dialog.Title>{editingService ? 'Edit service' : 'New service'}</Dialog.Title><Dialog.Description>Keep customer pricing separate from your internal cost to deliver the service.</Dialog.Description></Dialog.Header>
      <Tabs.Root bind:value={serviceTab}>
        <Tabs.List class="w-full">
          <Tabs.Trigger value="details" class="flex-1 cursor-pointer">Details</Tabs.Trigger>
          <Tabs.Trigger value="billing" class="flex-1 cursor-pointer">Billing</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="details" class="pt-6">
          <Field.FieldGroup>
            <Field.Field><Field.FieldLabel for="service-name">Service name</Field.FieldLabel><Input id="service-name" bind:value={form.name} required /></Field.Field>
            <Field.Field><Field.FieldLabel for="service-description">Description</Field.FieldLabel><IssueDescriptionEditor value={form.description} onChange={(value) => (form.description = value)} minHeight="min-h-56" /></Field.Field>
            <Field.Field><Field.FieldLabel for="service-status">Status</Field.FieldLabel><select id="service-status" class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" bind:value={form.status}><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option></select></Field.Field>
          </Field.FieldGroup>
        </Tabs.Content>
        <Tabs.Content value="billing" class="pt-6">
          <Field.FieldGroup>
            <Field.Field><Field.FieldLabel for="service-code">Code / SKU</Field.FieldLabel><Input id="service-code" bind:value={form.code} placeholder="SERVICE-001" required /><Field.FieldDescription>Use a stable internal code for quotes and future invoices.</Field.FieldDescription></Field.Field>
            <div class="grid gap-3 sm:grid-cols-2"><Field.Field><Field.FieldLabel for="service-billing-basis">Billing basis</Field.FieldLabel><select id="service-billing-basis" class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" bind:value={form.billingBasis}><option value="fixed">Fixed</option><option value="hourly">Hourly</option><option value="daily">Daily</option><option value="per_unit">Per unit</option><option value="recurring">Recurring</option></select></Field.Field><Field.Field><Field.FieldLabel for="service-unit-label">Unit label</Field.FieldLabel><Input id="service-unit-label" bind:value={form.unitLabel} placeholder="project, hour, day, item, or month" required /></Field.Field></div>
            <div class="grid gap-3 sm:grid-cols-2"><Field.Field><Field.FieldLabel for="service-sale-price">Sale amount (USD)</Field.FieldLabel><Input id="service-sale-price" type="number" min="0" step="0.01" bind:value={form.customerPrice} required /><Field.FieldDescription>Charged per {form.unitLabel || 'unit'}.</Field.FieldDescription></Field.Field><Field.Field><Field.FieldLabel for="service-internal-cost">Internal cost (USD)</Field.FieldLabel><Input id="service-internal-cost" type="number" min="0" step="0.01" bind:value={form.internalCost} /><Field.FieldDescription>Optional. Leave blank when delivery cost is not known yet.</Field.FieldDescription></Field.Field></div>
            <Field.Field><Field.FieldLabel for="service-currency">Currency</Field.FieldLabel><select id="service-currency" class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" bind:value={form.currency}><option value="USD">USD</option></select></Field.Field>
          </Field.FieldGroup>
        </Tabs.Content>
      </Tabs.Root>
      {#if formError}<Field.FieldError class="mt-4">{formError}</Field.FieldError>{/if}
      <Dialog.Footer><Button variant="outline" onclick={() => (dialogOpen = false)}>Cancel</Button><Button onclick={saveService} disabled={submitting || offerLoading || !form.name || !form.code}>{offerLoading ? 'Loading pricing...' : submitting ? 'Saving...' : editingService ? 'Save changes' : 'Create service'}</Button></Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>

  <Dialog.Root bind:open={pricingOpen}>
    <Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <Dialog.Header><Dialog.Title>Pricing offers{#if pricingService} for {pricingService.name}{/if}</Dialog.Title><Dialog.Description>Keep each commercial billing basis separate so fixed work, usage, and recurring services can coexist.</Dialog.Description></Dialog.Header>
      <div class="flex flex-col gap-3">
        {#each pricingOffers as offer (offer.id)}
          <div class="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"><div><p class="font-medium">{offer.name}</p><p class="text-muted-foreground">{money(offer.salePriceCents, offer.currency)} / {offer.unitLabel} · {offer.billingBasis}</p></div><span class="text-muted-foreground">Cost {money(offer.internalCostCents, offer.currency)}</span></div>
        {:else}<p class="text-sm text-muted-foreground">No pricing offers yet. Add the first one below.</p>{/each}
      </div>
      <Field.FieldGroup>
        <div class="grid gap-3 sm:grid-cols-2"><Field.Field><Field.FieldLabel for="offer-name">Offer name</Field.FieldLabel><Input id="offer-name" bind:value={pricingForm.name} /></Field.Field><Field.Field><Field.FieldLabel for="offer-basis">Billing basis</Field.FieldLabel><select id="offer-basis" class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" bind:value={pricingForm.billingBasis} onchange={() => (pricingForm.unitLabel = unitPlaceholder())}><option value="fixed">Fixed</option><option value="hourly">Hourly</option><option value="daily">Daily</option><option value="per_unit">Per unit</option><option value="recurring">Recurring</option></select></Field.Field></div>
        <div class="grid gap-3 sm:grid-cols-3"><Field.Field><Field.FieldLabel for="offer-unit">Unit label</Field.FieldLabel><Input id="offer-unit" bind:value={pricingForm.unitLabel} placeholder={unitPlaceholder()} /></Field.Field><Field.Field><Field.FieldLabel for="offer-sale-price">Sale amount (USD)</Field.FieldLabel><Input id="offer-sale-price" type="number" min="0" step="0.01" bind:value={pricingForm.salePrice} /></Field.Field><Field.Field><Field.FieldLabel for="offer-internal-cost">Internal cost (USD)</Field.FieldLabel><Input id="offer-internal-cost" type="number" min="0" step="0.01" bind:value={pricingForm.internalCost} /></Field.Field></div>
        {#if pricingError}<Field.FieldError>{pricingError}</Field.FieldError>{/if}
      </Field.FieldGroup>
      <Dialog.Footer><Button variant="outline" onclick={() => (pricingOpen = false)}>Close</Button><Button onclick={savePricingOffer} disabled={pricingSubmitting || !pricingForm.name}>{pricingSubmitting ? 'Adding...' : 'Add offer'}</Button></Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
</div>
