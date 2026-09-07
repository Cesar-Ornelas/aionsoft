<script>
  import { goto } from '$app/navigation';
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
  import CheckIcon from '@lucide/svelte/icons/check';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import PauseIcon from '@lucide/svelte/icons/pause';
  import XIcon from '@lucide/svelte/icons/x';
  import * as Field from '$lib/components/ui/field';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { toast } from '$lib/stores/toast.js';

  let { data } = $props();
  let sourceType = $state('service');
  let selectedServiceId = $state('');
  let selectedPlanId = $state('');
  let selectedOfferId = $state('');
  let quantity = $state(1);
  let effectiveFrom = $state('');
  let effectiveTo = $state('');
  let submitting = $state(false);
  let transitioning = $state(false);
  let errorMessage = $state('');

  let selectedOffers = $derived(data.offers[selectedServiceId] ?? []);
  let selectedSourceName = $derived(sourceType === 'service'
    ? data.services.find((entry) => entry.id === selectedServiceId)?.name
    : data.plans.find((entry) => entry.id === selectedPlanId)?.name);

  function resetItem() {
    selectedServiceId = '';
    selectedPlanId = '';
    selectedOfferId = '';
    quantity = 1;
    effectiveFrom = '';
    effectiveTo = '';
    errorMessage = '';
  }

  function changeSourceType(value) {
    sourceType = value;
    resetItem();
  }

  async function addItem() {
    submitting = true;
    errorMessage = '';
    try {
      const response = await fetch(`/operations/accounts/${data.account.id}/agreements/${data.agreement.id}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...(sourceType === 'service' ? { serviceId: selectedServiceId, offerId: selectedOfferId } : { planId: selectedPlanId }),
          quantity: Number(quantity), effectiveFrom, effectiveTo
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to add agreement item.');
      toast.success(`${selectedSourceName} added to the agreement.`);
      resetItem();
      await goto(`/operations/accounts/${data.account.id}/agreements/${data.agreement.id}`, { invalidateAll: true, replaceState: true });
    } catch (error) {
      errorMessage = error.message;
      toast.error(errorMessage);
    } finally {
      submitting = false;
    }
  }

  async function transition(status) {
    transitioning = true;
    try {
      const response = await fetch(`/operations/accounts/${data.account.id}/agreements/${data.agreement.id}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to update agreement.');
      toast.success(`Agreement ${status}.`);
      await goto(`/operations/accounts/${data.account.id}/agreements/${data.agreement.id}`, { invalidateAll: true, replaceState: true });
    } catch (error) {
      toast.error(error.message);
    } finally {
      transitioning = false;
    }
  }

  function formatMoney(cents, currency = 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format((cents || 0) / 100);
  }
</script>

<svelte:head><title>{data.agreement.name} · Agreements</title></svelte:head>

<div class="flex flex-col gap-6">
  <header class="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
    <div class="flex flex-col gap-3"><Button variant="ghost" size="sm" class="w-fit" onclick={() => goto(`/operations/accounts/${data.account.id}/agreements`)}><ArrowLeftIcon data-icon="inline-start" />Agreements</Button><div class="flex flex-wrap items-center gap-2"><h1 class="text-2xl font-semibold">{data.agreement.name}</h1><Badge variant={data.agreement.status === 'active' ? 'secondary' : 'outline'}>{data.agreement.status}</Badge></div><p class="text-sm text-muted-foreground">{data.agreement.agreementNumber} · {data.account.name}</p></div>
    <div class="flex flex-wrap gap-2">{#if data.agreement.status === 'draft'}<Button onclick={() => transition('active')} disabled={transitioning}><CheckIcon data-icon="inline-start" />Activate</Button>{:else if data.agreement.status === 'active'}<Button variant="outline" onclick={() => transition('paused')} disabled={transitioning}><PauseIcon data-icon="inline-start" />Pause</Button>{:else if data.agreement.status === 'paused'}<Button onclick={() => transition('active')} disabled={transitioning}><CheckIcon data-icon="inline-start" />Resume</Button>{/if}{#if !['cancelled', 'expired'].includes(data.agreement.status)}<Button variant="outline" onclick={() => transition('cancelled')} disabled={transitioning}><XIcon data-icon="inline-start" />Cancel</Button>{/if}</div>
  </header>

  <section class="flex flex-col gap-4 rounded-lg border border-border p-5"><div><h2 class="font-semibold">Agreement items</h2><p class="mt-1 text-sm text-muted-foreground">Each service or plan keeps its own pricing snapshot and dates.</p></div>
    {#if data.agreement.items?.length}<div class="overflow-hidden rounded-md border border-border"><div class="divide-y divide-border">{#each data.agreement.items as item (item.id)}<div class="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div class="flex items-center gap-2"><p class="font-medium">{item.serviceId ? data.services.find((entry) => entry.id === item.serviceId)?.name || 'Service' : data.plans.find((entry) => entry.id === item.planId)?.name || 'Plan'}</p><Badge variant="outline">{item.status}</Badge></div><p class="text-sm text-muted-foreground">{item.quantity} {item.unitLabel} · {item.serviceId ? formatMoney(item.unitPriceCents, item.currency) : formatMoney(item.bundlePriceCents, item.currency)}{item.billingBasis ? ` · ${item.billingBasis}` : ''}</p></div><p class="text-xs text-muted-foreground">{item.effectiveFrom || 'No start date'}{item.effectiveTo ? ` → ${item.effectiveTo}` : ''}</p></div>{/each}</div></div>{:else}<p class="rounded-md bg-muted p-4 text-sm text-muted-foreground">No services or plans have been added yet.</p>{/if}
  </section>

  {#if !['cancelled', 'expired'].includes(data.agreement.status)}
    <section class="flex flex-col gap-4 rounded-lg border border-border p-5"><div><h2 class="font-semibold">Add to agreement</h2><p class="mt-1 text-sm text-muted-foreground">Choose a current Catalog service or plan. Its price is copied into this agreement when saved.</p></div><Field.FieldGroup>
      <Field.Field><Field.FieldLabel for="agreement-source-type">Item type</Field.FieldLabel><select id="agreement-source-type" class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={sourceType} onchange={(event) => changeSourceType(event.currentTarget.value)}><option value="service">Catalog service</option><option value="plan">Catalog plan</option></select></Field.Field>
      {#if sourceType === 'service'}<Field.Field><Field.FieldLabel for="agreement-service">Service</Field.FieldLabel><select id="agreement-service" class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" bind:value={selectedServiceId} onchange={() => (selectedOfferId = '')}><option value="">Select a service</option>{#each data.services as service (service.id)}<option value={service.id}>{service.name} · {service.code}</option>{/each}</select></Field.Field><Field.Field><Field.FieldLabel for="agreement-offer">Pricing offer</Field.FieldLabel><select id="agreement-offer" class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" bind:value={selectedOfferId} disabled={!selectedServiceId}><option value="">Default service price</option>{#each selectedOffers as offer (offer.id)}<option value={offer.id}>{offer.name} · {formatMoney(offer.salePriceCents, offer.currency)} / {offer.unitLabel}</option>{/each}</select></Field.Field>{:else}<Field.Field><Field.FieldLabel for="agreement-plan">Plan</Field.FieldLabel><select id="agreement-plan" class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" bind:value={selectedPlanId}><option value="">Select a plan</option>{#each data.plans as plan (plan.id)}<option value={plan.id}>{plan.name} · {formatMoney(plan.bundlePriceCents, plan.currency)}</option>{/each}</select></Field.Field>{/if}
      <div class="grid gap-3 sm:grid-cols-3"><Field.Field><Field.FieldLabel for="agreement-quantity">Quantity</Field.FieldLabel><Input id="agreement-quantity" type="number" min="1" bind:value={quantity} /></Field.Field><Field.Field><Field.FieldLabel for="agreement-item-from">Effective from</Field.FieldLabel><Input id="agreement-item-from" type="date" bind:value={effectiveFrom} /></Field.Field><Field.Field><Field.FieldLabel for="agreement-item-to">Effective to</Field.FieldLabel><Input id="agreement-item-to" type="date" bind:value={effectiveTo} /></Field.Field></div>
      {#if errorMessage}<Field.FieldError>{errorMessage}</Field.FieldError>{/if}
    </Field.FieldGroup><Button class="w-fit" onclick={addItem} disabled={submitting || (sourceType === 'service' ? !selectedServiceId : !selectedPlanId)}><PlusIcon data-icon="inline-start" />{submitting ? 'Adding...' : 'Add item'}</Button></section>
  {/if}
</div>
