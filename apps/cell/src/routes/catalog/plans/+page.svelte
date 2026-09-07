<script>
  import { goto } from '$app/navigation';
  import CalendarDaysIcon from '@lucide/svelte/icons/calendar-days';
  import CopyIcon from '@lucide/svelte/icons/copy';
  import PencilIcon from '@lucide/svelte/icons/pencil';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Field from '$lib/components/ui/field';
  import * as Table from '$lib/components/ui/table';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { toast } from '$lib/stores/toast.js';

  let { data } = $props();
  let dialogOpen = $state(false);
  let editingPlan = $state(null);
  let submitting = $state(false);
  let formError = $state('');
  let form = $state({
    name: '',
    code: '',
    description: '',
    bundlePrice: '0.00',
    termUnit: 'monthly',
    termQuantity: '1',
    commitmentEnforcement: 'minimum_charge',
    unusedQuantityPolicy: 'forfeit',
    serviceId: '',
    includedQuantity: '40',
    unitLabel: 'hour',
    overagePrice: '150.00',
    overageBillingBasis: 'hourly',
    effectiveFrom: '',
    effectiveTo: ''
  });

  function money(cents, currency = 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format((Number(cents) || 0) / 100);
  }

  function dateInputValue(value) {
    return String(value || '').match(/^\d{4}-\d{2}-\d{2}/)?.[0] || '';
  }

  function resetForm() {
    form = { name: '', code: '', description: '', bundlePrice: '0.00', termUnit: 'monthly', termQuantity: '1', commitmentEnforcement: 'minimum_charge', unusedQuantityPolicy: 'forfeit', serviceId: data.services[0]?.id || '', includedQuantity: '40', unitLabel: 'hour', overagePrice: '150.00', overageBillingBasis: 'hourly', effectiveFrom: '', effectiveTo: '' };
    formError = '';
  }

  function openCreate() {
    editingPlan = null;
    resetForm();
    dialogOpen = true;
  }

  function duplicateCode(code) {
    const suffix = '-COPY';
    return `${String(code || 'PLAN').slice(0, 32 - suffix.length)}${suffix}`;
  }

  function openEdit(plan) {
    const item = plan.items[0] || {};
    editingPlan = plan;
    form = {
      name: plan.name,
      code: plan.code,
      description: plan.description || '',
      bundlePrice: (Number(plan.bundlePriceCents || 0) / 100).toFixed(2),
      termUnit: plan.termUnit,
      termQuantity: String(plan.termQuantity),
      commitmentEnforcement: plan.commitmentEnforcement,
      unusedQuantityPolicy: plan.unusedQuantityPolicy,
      serviceId: item.serviceId || data.services[0]?.id || '',
      includedQuantity: String(item.includedQuantity || 1),
      unitLabel: item.unitLabel || 'unit',
      overagePrice: item.overagePriceCents === null || item.overagePriceCents === undefined ? '' : (Number(item.overagePriceCents) / 100).toFixed(2),
      overageBillingBasis: item.overageBillingBasis || 'hourly',
      effectiveFrom: dateInputValue(plan.effectiveFrom),
      effectiveTo: dateInputValue(plan.effectiveTo)
    };
    formError = '';
    dialogOpen = true;
  }

  function openDuplicate(plan) {
    const item = plan.items[0] || {};
    editingPlan = null;
    form = {
      name: `${plan.name} (copy)`,
      code: duplicateCode(plan.code),
      description: plan.description || '',
      bundlePrice: (Number(plan.bundlePriceCents || 0) / 100).toFixed(2),
      termUnit: plan.termUnit,
      termQuantity: String(plan.termQuantity),
      commitmentEnforcement: plan.commitmentEnforcement,
      unusedQuantityPolicy: plan.unusedQuantityPolicy,
      serviceId: item.serviceId || data.services[0]?.id || '',
      includedQuantity: String(item.includedQuantity || 1),
      unitLabel: item.unitLabel || 'unit',
      overagePrice: item.overagePriceCents === null || item.overagePriceCents === undefined ? '' : (Number(item.overagePriceCents) / 100).toFixed(2),
      overageBillingBasis: item.overageBillingBasis || 'hourly',
      effectiveFrom: dateInputValue(plan.effectiveFrom),
      effectiveTo: dateInputValue(plan.effectiveTo)
    };
    formError = '';
    dialogOpen = true;
  }

  function effectiveRate() {
    const quantity = Number(form.includedQuantity);
    const price = Number(form.bundlePrice);
    return quantity > 0 ? price / quantity : 0;
  }

  async function savePlan() {
    submitting = true;
    formError = '';
    try {
      const planResponse = await fetch('/catalog/plans', {
        method: editingPlan ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...(editingPlan && { id: editingPlan.id }),
          name: form.name,
          code: form.code,
          description: form.description,
          bundlePriceCents: Math.round(Number(form.bundlePrice) * 100),
          termUnit: form.termUnit,
          termQuantity: Number(form.termQuantity),
          commitmentEnforcement: form.commitmentEnforcement,
          unusedQuantityPolicy: form.unusedQuantityPolicy,
          effectiveFrom: form.effectiveFrom,
          effectiveTo: form.effectiveTo,
          ...(editingPlan && {
            item: {
              serviceId: form.serviceId,
              includedQuantity: Number(form.includedQuantity),
              unitLabel: form.unitLabel,
              overagePriceCents: form.overagePrice === '' ? null : Math.round(Number(form.overagePrice) * 100),
              overageBillingBasis: form.overageBillingBasis
            }
          })
        })
      });
      const plan = await planResponse.json();
      if (!planResponse.ok) throw new Error(plan.error || `Unable to ${editingPlan ? 'update' : 'create'} plan.`);

      if (editingPlan) {
        toast.success('Retainer plan updated.');
        dialogOpen = false;
        await goto('/catalog/plans', { invalidateAll: true, replaceState: true });
        return;
      }

      const itemResponse = await fetch(`/catalog/plans/${plan.id}/items`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          serviceId: form.serviceId,
          includedQuantity: Number(form.includedQuantity),
          unitLabel: form.unitLabel,
          overagePriceCents: form.overagePrice === '' ? null : Math.round(Number(form.overagePrice) * 100),
          overageBillingBasis: form.overageBillingBasis
        })
      });
      const item = await itemResponse.json();
      if (!itemResponse.ok) throw new Error(item.error || 'Unable to add plan service.');

      toast.success('Retainer plan created.');
      dialogOpen = false;
      await goto('/catalog/plans', { invalidateAll: true, replaceState: true });
    } catch (error) {
      formError = error.message;
      toast.error(formError);
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head><title>Plans & Retainers | Aionsoft</title></svelte:head>

<div class="flex flex-col gap-6">
  <header class="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
    <div class="flex flex-col gap-1">
      <p class="text-sm font-medium text-muted-foreground">Sales</p>
      <h1 class="text-2xl font-semibold text-foreground">Plans & Retainers</h1>
      <p class="text-sm text-muted-foreground">Bundle committed service quantities with conditional rates and overage rules.</p>
    </div>
    <Button onclick={openCreate}><PlusIcon data-icon="inline-start" />New plan</Button>
  </header>

  <div class="overflow-hidden rounded-lg border border-border">
    <Table.Root>
      <Table.Header><Table.Row><Table.Head>Plan</Table.Head><Table.Head>Commitment</Table.Head><Table.Head>Monthly price</Table.Head><Table.Head>Effective rate</Table.Head><Table.Head>Unused hours</Table.Head><Table.Head>Status</Table.Head><Table.Head class="text-right"><span class="sr-only">Actions</span></Table.Head></Table.Row></Table.Header>
      <Table.Body>
        {#each data.plans as plan (plan.id)}
          {@const item = plan.items[0]}
          <Table.Row>
            <Table.Cell><div class="flex flex-col gap-0.5"><span class="font-medium">{plan.name}</span><span class="font-mono text-xs text-muted-foreground">{plan.code}</span></div></Table.Cell>
            <Table.Cell>{item?.includedQuantity || 0} {item?.unitLabel || 'units'} / {plan.termUnit}</Table.Cell>
            <Table.Cell>{money(plan.bundlePriceCents, plan.currency)}</Table.Cell>
            <Table.Cell>{item?.includedQuantity ? money(plan.bundlePriceCents / item.includedQuantity, plan.currency) : 'Not set'}{#if item?.includedQuantity}<span class="text-muted-foreground"> / {item.unitLabel}</span>{/if}</Table.Cell>
            <Table.Cell>{plan.unusedQuantityPolicy === 'carry_forward' ? 'Carry forward' : 'Forfeit'}</Table.Cell>
            <Table.Cell><Badge variant={plan.status === 'active' ? 'secondary' : 'outline'}>{plan.status}</Badge></Table.Cell>
            <Table.Cell class="text-right"><div class="flex justify-end gap-1"><Button variant="ghost" size="icon" aria-label={`Duplicate ${plan.name}`} title="Duplicate plan" onclick={() => openDuplicate(plan)}><CopyIcon /></Button><Button variant="ghost" size="icon" aria-label={`Edit ${plan.name}`} title="Edit plan" onclick={() => openEdit(plan)}><PencilIcon /></Button></div></Table.Cell>
          </Table.Row>
        {:else}
          <Table.Row><Table.Cell colspan={7} class="h-32 text-center text-muted-foreground">No plans have been created yet.</Table.Cell></Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  </div>

  <Dialog.Root bind:open={dialogOpen}>
    <Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <Dialog.Header><Dialog.Title>{editingPlan ? 'Edit retainer plan' : 'New retainer plan'}</Dialog.Title><Dialog.Description>The discounted rate is derived from the monthly commitment and bundle price. The standard hourly offer remains the overage rate.</Dialog.Description></Dialog.Header>
      <Field.FieldGroup>
        <div class="grid gap-3 sm:grid-cols-2"><Field.Field><Field.FieldLabel for="plan-name">Plan name</Field.FieldLabel><Input id="plan-name" bind:value={form.name} placeholder="Digital Presence 40 hours" /></Field.Field><Field.Field><Field.FieldLabel for="plan-code">Plan code</Field.FieldLabel><Input id="plan-code" bind:value={form.code} placeholder="DPM-40H-MONTHLY" /></Field.Field></div>
        <Field.Field><Field.FieldLabel for="plan-description">Description</Field.FieldLabel><textarea id="plan-description" class="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" bind:value={form.description} placeholder="Monthly committed hours for Digital Presence Management"></textarea></Field.Field>
        <div class="grid gap-3 sm:grid-cols-3"><Field.Field><Field.FieldLabel for="plan-service">Service</Field.FieldLabel><select id="plan-service" class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" bind:value={form.serviceId}>{#each data.services as service (service.id)}<option value={service.id}>{service.name}</option>{/each}</select></Field.Field><Field.Field><Field.FieldLabel for="plan-hours">Committed quantity</Field.FieldLabel><Input id="plan-hours" type="number" min="1" step="1" bind:value={form.includedQuantity} /></Field.Field><Field.Field><Field.FieldLabel for="plan-unit">Unit</Field.FieldLabel><Input id="plan-unit" bind:value={form.unitLabel} placeholder="hour" /></Field.Field></div>
        <div class="grid gap-3 sm:grid-cols-3"><Field.Field><Field.FieldLabel for="plan-price">Bundle price (USD)</Field.FieldLabel><Input id="plan-price" type="number" min="0" step="0.01" bind:value={form.bundlePrice} /></Field.Field><Field.Field><Field.FieldLabel for="plan-overage">Overage (USD)</Field.FieldLabel><Input id="plan-overage" type="number" min="0" step="0.01" bind:value={form.overagePrice} /></Field.Field><Field.Field><Field.FieldLabel for="plan-overage-basis">Overage basis</Field.FieldLabel><select id="plan-overage-basis" class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" bind:value={form.overageBillingBasis}><option value="hourly">Hourly</option><option value="daily">Daily</option><option value="fixed">Fixed</option><option value="per_unit">Per unit</option><option value="recurring">Recurring</option></select></Field.Field></div>
        <div class="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm"><div class="flex items-center gap-2 font-medium"><CalendarDaysIcon class="size-4" />Derived effective rate</div><p class="mt-1 text-muted-foreground">{money(effectiveRate() * 100)} / {form.unitLabel || 'unit'} when the full commitment is purchased.</p></div>
        <div class="grid gap-3 sm:grid-cols-2"><Field.Field><Field.FieldLabel for="plan-commitment">Commitment enforcement</Field.FieldLabel><select id="plan-commitment" class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" bind:value={form.commitmentEnforcement}><option value="minimum_charge">Minimum monthly charge</option><option value="prepaid_allowance">Prepaid allowance</option></select></Field.Field><Field.Field><Field.FieldLabel for="plan-unused">Unused quantity</Field.FieldLabel><select id="plan-unused" class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" bind:value={form.unusedQuantityPolicy}><option value="forfeit">Forfeit at period end</option><option value="carry_forward">Carry forward</option></select></Field.Field></div>
        <div class="grid gap-3 sm:grid-cols-2"><Field.Field><Field.FieldLabel for="plan-effective-from">Effective from</Field.FieldLabel><Input id="plan-effective-from" type="date" bind:value={form.effectiveFrom} /></Field.Field><Field.Field><Field.FieldLabel for="plan-effective-to">Effective to</Field.FieldLabel><Input id="plan-effective-to" type="date" bind:value={form.effectiveTo} /></Field.Field></div>
        {#if formError}<Field.FieldError>{formError}</Field.FieldError>{/if}
      </Field.FieldGroup>
      <Dialog.Footer><Button variant="outline" onclick={() => (dialogOpen = false)}>Cancel</Button><Button onclick={savePlan} disabled={submitting || !form.name || !form.code || !form.serviceId || Number(form.includedQuantity) <= 0}>{submitting ? 'Saving...' : editingPlan ? 'Save changes' : 'Create plan'}</Button></Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
</div>
