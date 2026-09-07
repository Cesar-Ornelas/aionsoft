<script>
  import { goto } from '$app/navigation';
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
  import HandshakeIcon from '@lucide/svelte/icons/handshake';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Field from '$lib/components/ui/field';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { toast } from '$lib/stores/toast.js';

  let { data } = $props();
  let dialogOpen = $state(false);
  let submitting = $state(false);
  let errorMessage = $state('');
  let form = $state({ agreementNumber: '', name: '', effectiveFrom: '', effectiveTo: '', renewalBehavior: 'none', notes: '' });

  function resetForm() {
    form = { agreementNumber: '', name: '', effectiveFrom: '', effectiveTo: '', renewalBehavior: 'none', notes: '' };
    errorMessage = '';
  }

  async function createAgreement() {
    submitting = true;
    errorMessage = '';
    try {
      const response = await fetch(`/operations/accounts/${data.account.id}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to create agreement.');
      dialogOpen = false;
      toast.success('Agreement created as a draft.');
      await goto(`/operations/accounts/${data.account.id}/agreements/${result.id}`);
    } catch (error) {
      errorMessage = error.message;
      toast.error(errorMessage);
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head><title>Agreements · {data.account.name}</title></svelte:head>

<div class="flex flex-col gap-6">
  <header class="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
    <div class="flex flex-col gap-3">
      <Button variant="ghost" size="sm" class="w-fit" onclick={() => goto(`/operations/accounts/${data.account.id}`)}><ArrowLeftIcon data-icon="inline-start" />{data.account.name}</Button>
      <div class="flex items-center gap-3"><HandshakeIcon class="text-muted-foreground" /><h1 class="text-2xl font-semibold">Agreements</h1></div>
      <p class="text-sm text-muted-foreground">Commercial commitments for services and plans delivered through this account.</p>
    </div>
    <Dialog.Root bind:open={dialogOpen} onOpenChange={(open) => { if (open) resetForm(); }}>
      <Dialog.Trigger>{#snippet child({ props })}<Button {...props}><PlusIcon data-icon="inline-start" />New agreement</Button>{/snippet}</Dialog.Trigger>
      <Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <Dialog.Header><Dialog.Title>New agreement</Dialog.Title><Dialog.Description>Create a draft agreement, then add services or plans to it.</Dialog.Description></Dialog.Header>
        <Field.FieldGroup>
          <Field.Field><Field.FieldLabel for="agreement-number">Agreement number</Field.FieldLabel><Input id="agreement-number" bind:value={form.agreementNumber} placeholder="AGR-2026-001" required /></Field.Field>
          <Field.Field><Field.FieldLabel for="agreement-name">Name</Field.FieldLabel><Input id="agreement-name" bind:value={form.name} placeholder="Managed pest control" required /></Field.Field>
          <div class="grid gap-3 sm:grid-cols-2"><Field.Field><Field.FieldLabel for="agreement-effective-from">Effective from</Field.FieldLabel><Input id="agreement-effective-from" type="date" bind:value={form.effectiveFrom} /></Field.Field><Field.Field><Field.FieldLabel for="agreement-effective-to">Effective to</Field.FieldLabel><Input id="agreement-effective-to" type="date" bind:value={form.effectiveTo} /></Field.Field></div>
          <Field.Field><Field.FieldLabel for="agreement-renewal">Renewal</Field.FieldLabel><select id="agreement-renewal" class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" bind:value={form.renewalBehavior}><option value="none">No renewal</option><option value="manual">Manual renewal</option><option value="automatic">Automatic renewal</option></select></Field.Field>
          <Field.Field><Field.FieldLabel for="agreement-notes">Notes</Field.FieldLabel><textarea id="agreement-notes" class="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" bind:value={form.notes}></textarea></Field.Field>
          {#if errorMessage}<Field.FieldError>{errorMessage}</Field.FieldError>{/if}
        </Field.FieldGroup>
        <Dialog.Footer><Button variant="outline" onclick={() => (dialogOpen = false)}>Cancel</Button><Button onclick={createAgreement} disabled={submitting || !form.agreementNumber || !form.name}>{submitting ? 'Creating...' : 'Create draft'}</Button></Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  </header>

  <section class="flex flex-col gap-3">
    {#each data.agreements as agreement (agreement.id)}
      <button class="flex flex-col gap-3 rounded-lg border border-border p-5 text-left transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between" onclick={() => goto(`/operations/accounts/${data.account.id}/agreements/${agreement.id}`)}>
        <div><div class="flex flex-wrap items-center gap-2"><h2 class="font-semibold">{agreement.name}</h2><Badge variant={agreement.status === 'active' ? 'secondary' : 'outline'}>{agreement.status}</Badge></div><p class="mt-1 text-sm text-muted-foreground">{agreement.agreementNumber}</p></div>
        <div class="text-sm text-muted-foreground">{agreement.effectiveFrom || 'No start date'}{agreement.effectiveTo ? ` → ${agreement.effectiveTo}` : ''}</div>
      </button>
    {:else}
      <div class="rounded-lg border border-dashed border-border p-10 text-center"><HandshakeIcon class="mx-auto text-muted-foreground" /><h2 class="mt-3 font-semibold">No agreements yet</h2><p class="mt-1 text-sm text-muted-foreground">Create a draft agreement to start adding services or plans.</p><Button class="mt-4" onclick={() => (dialogOpen = true)}><PlusIcon data-icon="inline-start" />Create agreement</Button></div>
    {/each}
  </section>
</div>
