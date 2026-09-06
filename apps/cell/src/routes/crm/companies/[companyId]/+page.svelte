<script>
  import { goto } from '$app/navigation';
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
  import ArchiveIcon from '@lucide/svelte/icons/archive';
  import PencilIcon from '@lucide/svelte/icons/pencil';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import StarIcon from '@lucide/svelte/icons/star';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import UnlinkIcon from '@lucide/svelte/icons/unlink';
  import * as AlertDialog from '$lib/components/ui/alert-dialog';
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Field from '$lib/components/ui/field';
  import * as Select from '$lib/components/ui/select';
  import * as Table from '$lib/components/ui/table';
  import * as Tabs from '$lib/components/ui/tabs';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { toast } from '$lib/stores/toast.js';

  let { data } = $props();
  let saving = $state(false);
  let contactOpen = $state(false);
  let addressOpen = $state(false);
  let relationshipOpen = $state(false);
  let editingContactId = $state('');
  let editingAddressId = $state('');
  let accountForm = $state({
    legalName: '',
    displayName: '',
    lifecycle: 'customer',
    phone: ''
  });
  let contactForm = $state({ firstName: '', lastName: '', jobTitle: '', email: '', phone: '', extension: '' });
  let addressForm = $state({ label: 'Main', type: 'business', line1: '', line2: '', city: '', region: '', postalCode: '', country: 'US' });
  let relationshipForm = $state({ targetAccountId: '', type: 'affiliate_of' });

  $effect(() => {
    accountForm = {
      legalName: data.account.legalName,
      displayName: data.account.displayName,
      lifecycle: data.account.lifecycle,
      phone: data.account.phone
    };
    relationshipForm.type = data.account.type === 'dba' ? 'dba_of' : 'affiliate_of';
  });

  function accountName(account) {
    return account.displayName || account.legalName;
  }

  function relatedName(id) {
    const account = data.accountOptions.find((item) => item.id === id);
    return account ? accountName(account) : id;
  }

  async function refreshDetail() {
    await goto(`/crm/companies/${data.account.id}`, { invalidateAll: true, replaceState: true });
  }

  async function request(url, options) {
    saving = true;
    try {
      const response = await fetch(url, options);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The CRM request failed.');
      return result;
    } catch (error) {
      toast.error(error.message);
      throw error;
    } finally {
      saving = false;
    }
  }

  async function saveAccount() {
    try {
      await request(`/crm/companies/${data.account.id}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(accountForm)
      });
      toast.success('Company updated.');
      await refreshDetail();
    } catch {}
  }

  async function archiveAccount() {
    try {
      await request(`/crm/companies/${data.account.id}?action=archive`, { method: 'PATCH' });
      toast.success('Company archived.');
      await goto('/crm/companies');
    } catch {}
  }

  function openContact(contact = null) {
    editingContactId = contact?.id ?? '';
    contactForm = contact
      ? { firstName: contact.firstName, lastName: contact.lastName, jobTitle: contact.jobTitle, email: contact.email, phone: contact.phone, extension: contact.extension }
      : { firstName: '', lastName: '', jobTitle: '', email: '', phone: '', extension: '' };
    contactOpen = true;
  }

  async function saveContact() {
    try {
      await request(`/crm/companies/${data.account.id}/contacts${editingContactId ? `?contactId=${editingContactId}` : ''}`, {
        method: editingContactId ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(contactForm)
      });
      contactOpen = false;
      toast.success(editingContactId ? 'Contact updated.' : 'Contact added.');
      await refreshDetail();
    } catch {}
  }

  async function removeContact(contactId) {
    try {
      await request(`/crm/companies/${data.account.id}/contacts?contactId=${contactId}`, { method: 'DELETE' });
      toast.success('Contact removed.');
      await refreshDetail();
    } catch {}
  }

  async function makePrimary(contactId) {
    try {
      await request(`/crm/companies/${data.account.id}/contacts`, {
        method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contactId })
      });
      toast.success('Primary contact updated.');
      await refreshDetail();
    } catch {}
  }

  function openAddress(address = null) {
    editingAddressId = address?.id ?? '';
    addressForm = address
      ? { label: address.label, type: address.type, line1: address.line1, line2: address.line2, city: address.city, region: address.region, postalCode: address.postalCode, country: address.country }
      : { label: 'Main', type: 'business', line1: '', line2: '', city: '', region: '', postalCode: '', country: 'US' };
    addressOpen = true;
  }

  async function saveAddress() {
    try {
      await request(`/crm/companies/${data.account.id}/addresses${editingAddressId ? `?addressId=${editingAddressId}` : ''}`, {
        method: editingAddressId ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(addressForm)
      });
      addressOpen = false;
      toast.success(editingAddressId ? 'Address updated.' : 'Address added.');
      await refreshDetail();
    } catch {}
  }

  async function removeAddress(addressId) {
    try {
      await request(`/crm/companies/${data.account.id}/addresses?addressId=${addressId}`, { method: 'DELETE' });
      toast.success('Address removed.');
      await refreshDetail();
    } catch {}
  }

  async function addRelationship() {
    try {
      await request(`/crm/companies/${data.account.id}/relationships`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(relationshipForm)
      });
      relationshipOpen = false;
      toast.success('Account linked.');
      await refreshDetail();
    } catch {}
  }

  async function removeRelationship(relationshipId) {
    try {
      await request(`/crm/companies/${data.account.id}/relationships?relationshipId=${relationshipId}`, { method: 'DELETE' });
      toast.success('Account unlinked.');
      await refreshDetail();
    } catch {}
  }
</script>

<svelte:head><title>{accountName(data.account)} | Aionsoft CRM</title></svelte:head>

<div class="flex flex-col gap-6">
  <header class="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
    <div class="flex flex-col gap-2">
      <Button variant="ghost" size="sm" class="w-fit" onclick={() => goto('/crm/companies')}><ArrowLeftIcon data-icon="inline-start" />Companies</Button>
      <div class="flex flex-wrap items-center gap-2">
        <h1 class="text-2xl font-semibold text-foreground">{accountName(data.account)}</h1>
        <Badge variant="outline">{data.account.type === 'dba' ? 'DBA' : 'Legal entity'}</Badge>
        <Badge variant="secondary">{data.account.lifecycle}</Badge>
      </div>
      {#if data.account.displayName}<p class="text-sm text-muted-foreground">Legal entity: {data.account.legalName}</p>{/if}
      {#if data.account.unlinkedDba}<p class="text-sm font-medium text-destructive">This DBA has no linked legal parent.</p>{/if}
    </div>
    <AlertDialog.Root>
      <AlertDialog.Trigger>
        {#snippet child({ props })}<Button {...props} variant="outline"><ArchiveIcon data-icon="inline-start" />Archive</Button>{/snippet}
      </AlertDialog.Trigger>
      <AlertDialog.Content>
        <AlertDialog.Header>
          <AlertDialog.Title>Archive this company?</AlertDialog.Title>
          <AlertDialog.Description>The company remains available for reporting but is hidden from the default company list.</AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
          <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
          <AlertDialog.Action onclick={archiveAccount}>Archive company</AlertDialog.Action>
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog.Root>
  </header>

  <Tabs.Root value="overview">
    <Tabs.List>
      <Tabs.Trigger value="overview" class="cursor-pointer">Overview</Tabs.Trigger>
      <Tabs.Trigger value="contacts" class="cursor-pointer">Contacts ({data.contacts.length})</Tabs.Trigger>
      <Tabs.Trigger value="addresses" class="cursor-pointer">Addresses ({data.addresses.length})</Tabs.Trigger>
      <Tabs.Trigger value="relationships" class="cursor-pointer">Related accounts ({data.relationships.length})</Tabs.Trigger>
    </Tabs.List>

    <Tabs.Content value="overview" class="pt-6">
      <div class="max-w-2xl">
        <Field.FieldGroup>
          <Field.Field>
            <Field.FieldLabel for="account-legal-name">Legal name</Field.FieldLabel>
            <Input id="account-legal-name" bind:value={accountForm.legalName} />
          </Field.Field>
          <Field.Field>
            <Field.FieldLabel for="account-display-name">Display name</Field.FieldLabel>
            <Input id="account-display-name" bind:value={accountForm.displayName} />
          </Field.Field>
          <div class="grid gap-4 sm:grid-cols-2">
            <Field.Field>
              <Field.FieldLabel for="account-phone">Main phone</Field.FieldLabel>
              <Input id="account-phone" bind:value={accountForm.phone} type="tel" />
            </Field.Field>
            <Field.Field>
              <Field.FieldLabel for="account-lifecycle">Lifecycle</Field.FieldLabel>
              <Select.Root bind:value={accountForm.lifecycle}>
                <Select.Trigger id="account-lifecycle" class="w-full">{accountForm.lifecycle}</Select.Trigger>
                <Select.Content><Select.Group>
                  {#each ['related', 'prospect', 'customer', 'inactive'] as lifecycle}
                    <Select.Item value={lifecycle}>{lifecycle}</Select.Item>
                  {/each}
                </Select.Group></Select.Content>
              </Select.Root>
            </Field.Field>
          </div>
          <Button class="w-fit" onclick={saveAccount} disabled={saving}>Save changes</Button>
        </Field.FieldGroup>
      </div>
    </Tabs.Content>

    <Tabs.Content value="contacts" class="pt-6">
      <div class="flex items-center justify-between pb-4">
        <h2 class="text-lg font-semibold">Contacts</h2>
        <Dialog.Root bind:open={contactOpen}>
          <Button size="sm" onclick={() => openContact()}><PlusIcon data-icon="inline-start" />Add contact</Button>
          <Dialog.Content>
            <Dialog.Header><Dialog.Title>{editingContactId ? 'Edit contact' : 'Add contact'}</Dialog.Title><Dialog.Description>{editingContactId ? 'Update this contact’s account details.' : 'The first contact becomes primary automatically.'}</Dialog.Description></Dialog.Header>
            <Field.FieldGroup>
              <div class="grid gap-4 sm:grid-cols-2">
                <Field.Field><Field.FieldLabel for="contact-first">First name <span class="text-destructive">*</span></Field.FieldLabel><Input id="contact-first" bind:value={contactForm.firstName} required /></Field.Field>
                <Field.Field><Field.FieldLabel for="contact-last">Last name <span class="text-destructive">*</span></Field.FieldLabel><Input id="contact-last" bind:value={contactForm.lastName} required /></Field.Field>
              </div>
              <Field.Field><Field.FieldLabel for="contact-title">Job title <span class="text-muted-foreground">(optional)</span></Field.FieldLabel><Input id="contact-title" bind:value={contactForm.jobTitle} /></Field.Field>
              <Field.Field><Field.FieldLabel for="contact-email">Email <span class="text-muted-foreground">(email or phone required)</span></Field.FieldLabel><Input id="contact-email" bind:value={contactForm.email} type="email" /></Field.Field>
              <div class="grid gap-4 sm:grid-cols-2">
                <Field.Field><Field.FieldLabel for="contact-phone">Phone <span class="text-muted-foreground">(email or phone required)</span></Field.FieldLabel><Input id="contact-phone" bind:value={contactForm.phone} type="tel" /></Field.Field>
                <Field.Field><Field.FieldLabel for="contact-extension">Extension <span class="text-muted-foreground">(optional)</span></Field.FieldLabel><Input id="contact-extension" bind:value={contactForm.extension} /></Field.Field>
              </div>
            </Field.FieldGroup>
            <Dialog.Footer><Button variant="outline" onclick={() => (contactOpen = false)}>Cancel</Button><Button onclick={saveContact} disabled={saving}>{editingContactId ? 'Save contact' : 'Add contact'}</Button></Dialog.Footer>
          </Dialog.Content>
        </Dialog.Root>
      </div>
      <div class="overflow-hidden rounded-lg border border-border"><Table.Root><Table.Header><Table.Row><Table.Head>Name</Table.Head><Table.Head>Job title</Table.Head><Table.Head>Email</Table.Head><Table.Head>Phone</Table.Head><Table.Head></Table.Head></Table.Row></Table.Header><Table.Body>
        {#each data.contacts as contact (contact.id)}
          <Table.Row><Table.Cell class="font-medium">{contact.firstName} {contact.lastName} {#if data.account.primaryContactId === contact.id}<Badge variant="secondary">Primary</Badge>{/if}</Table.Cell><Table.Cell>{contact.jobTitle || '—'}</Table.Cell><Table.Cell>{contact.email || '—'}</Table.Cell><Table.Cell>{contact.phone || '—'}{contact.extension ? ` ext. ${contact.extension}` : ''}</Table.Cell><Table.Cell><div class="flex justify-end gap-1">{#if data.account.primaryContactId !== contact.id}<Button variant="ghost" size="sm" onclick={() => makePrimary(contact.id)}><StarIcon data-icon="inline-start" />Make primary</Button>{/if}<Button variant="ghost" size="icon-sm" aria-label={`Edit ${contact.firstName} ${contact.lastName}`} title="Edit contact" onclick={() => openContact(contact)}><PencilIcon /></Button><AlertDialog.Root><AlertDialog.Trigger>{#snippet child({ props })}<Button {...props} variant="ghost" size="icon-sm" aria-label={`Remove ${contact.firstName} ${contact.lastName}`} title="Remove contact" disabled={data.account.primaryContactId === contact.id}><Trash2Icon /></Button>{/snippet}</AlertDialog.Trigger><AlertDialog.Content><AlertDialog.Header><AlertDialog.Title>Remove this contact?</AlertDialog.Title><AlertDialog.Description>This removes {contact.firstName} {contact.lastName} from the account.</AlertDialog.Description></AlertDialog.Header><AlertDialog.Footer><AlertDialog.Cancel>Cancel</AlertDialog.Cancel><AlertDialog.Action onclick={() => removeContact(contact.id)}>Remove contact</AlertDialog.Action></AlertDialog.Footer></AlertDialog.Content></AlertDialog.Root></div></Table.Cell></Table.Row>
        {:else}<Table.Row><Table.Cell colspan={5} class="h-28 text-center text-muted-foreground">No contacts yet.</Table.Cell></Table.Row>{/each}
      </Table.Body></Table.Root></div>
    </Tabs.Content>

    <Tabs.Content value="addresses" class="pt-6">
      <div class="flex items-center justify-between pb-4"><h2 class="text-lg font-semibold">Addresses</h2>
        <Dialog.Root bind:open={addressOpen}><Button size="sm" onclick={() => openAddress()}><PlusIcon data-icon="inline-start" />Add address</Button><Dialog.Content>
          <Dialog.Header><Dialog.Title>{editingAddressId ? 'Edit address' : 'Add address'}</Dialog.Title><Dialog.Description>{editingAddressId ? 'Update this company location.' : 'Add a billing, service, headquarters, or branch location.'}</Dialog.Description></Dialog.Header>
          <Field.FieldGroup>
            <div class="grid gap-4 sm:grid-cols-2"><Field.Field><Field.FieldLabel for="address-label">Label</Field.FieldLabel><Input id="address-label" bind:value={addressForm.label} /></Field.Field><Field.Field><Field.FieldLabel for="address-type">Type</Field.FieldLabel><Input id="address-type" bind:value={addressForm.type} /></Field.Field></div>
            <Field.Field><Field.FieldLabel for="address-line-1">Address line 1</Field.FieldLabel><Input id="address-line-1" bind:value={addressForm.line1} /></Field.Field>
            <Field.Field><Field.FieldLabel for="address-line-2">Address line 2</Field.FieldLabel><Input id="address-line-2" bind:value={addressForm.line2} /></Field.Field>
            <div class="grid gap-4 sm:grid-cols-2"><Field.Field><Field.FieldLabel for="address-city">City</Field.FieldLabel><Input id="address-city" bind:value={addressForm.city} /></Field.Field><Field.Field><Field.FieldLabel for="address-region">State / region</Field.FieldLabel><Input id="address-region" bind:value={addressForm.region} /></Field.Field></div>
            <div class="grid gap-4 sm:grid-cols-2"><Field.Field><Field.FieldLabel for="address-postal">ZIP / postal code</Field.FieldLabel><Input id="address-postal" bind:value={addressForm.postalCode} /></Field.Field><Field.Field><Field.FieldLabel for="address-country">Country</Field.FieldLabel><Input id="address-country" bind:value={addressForm.country} /></Field.Field></div>
          </Field.FieldGroup>
          <Dialog.Footer><Button variant="outline" onclick={() => (addressOpen = false)}>Cancel</Button><Button onclick={saveAddress} disabled={saving}>{editingAddressId ? 'Save address' : 'Add address'}</Button></Dialog.Footer>
        </Dialog.Content></Dialog.Root>
      </div>
      <div class="grid gap-3 sm:grid-cols-2">{#each data.addresses as address (address.id)}<section class="border-b border-border pb-4"><div class="flex items-center justify-between gap-2"><div class="flex items-center gap-2"><h3 class="font-medium">{address.label}</h3><Badge variant="outline">{address.type}</Badge></div><div class="flex gap-1"><Button variant="ghost" size="icon-sm" aria-label={`Edit ${address.label} address`} title="Edit address" onclick={() => openAddress(address)}><PencilIcon /></Button><AlertDialog.Root><AlertDialog.Trigger>{#snippet child({ props })}<Button {...props} variant="ghost" size="icon-sm" aria-label={`Remove ${address.label} address`} title="Remove address"><Trash2Icon /></Button>{/snippet}</AlertDialog.Trigger><AlertDialog.Content><AlertDialog.Header><AlertDialog.Title>Remove this address?</AlertDialog.Title><AlertDialog.Description>This removes {address.label} from the company.</AlertDialog.Description></AlertDialog.Header><AlertDialog.Footer><AlertDialog.Cancel>Cancel</AlertDialog.Cancel><AlertDialog.Action onclick={() => removeAddress(address.id)}>Remove address</AlertDialog.Action></AlertDialog.Footer></AlertDialog.Content></AlertDialog.Root></div></div><p class="mt-2 text-sm text-muted-foreground">{address.line1}{address.line2 ? `, ${address.line2}` : ''}<br />{address.city}, {address.region} {address.postalCode}<br />{address.country}</p></section>{:else}<p class="text-sm text-muted-foreground">No addresses yet.</p>{/each}</div>
    </Tabs.Content>

    <Tabs.Content value="relationships" class="pt-6">
      <div class="flex items-center justify-between pb-4"><h2 class="text-lg font-semibold">Related accounts</h2>
        <Dialog.Root bind:open={relationshipOpen}><Dialog.Trigger>{#snippet child({ props })}<Button {...props} size="sm" disabled={!data.accountOptions.length}><PlusIcon data-icon="inline-start" />Link account</Button>{/snippet}</Dialog.Trigger><Dialog.Content>
          <Dialog.Header><Dialog.Title>Link account</Dialog.Title><Dialog.Description>Record the legal or operational relationship between these accounts.</Dialog.Description></Dialog.Header>
          <Field.FieldGroup>
            <Field.Field><Field.FieldLabel for="relationship-account">Related account</Field.FieldLabel><Select.Root bind:value={relationshipForm.targetAccountId}><Select.Trigger id="relationship-account" class="w-full">{relationshipForm.targetAccountId ? relatedName(relationshipForm.targetAccountId) : 'Select an account'}</Select.Trigger><Select.Content><Select.Group>{#each data.accountOptions as option (option.id)}<Select.Item value={option.id}>{accountName(option)}</Select.Item>{/each}</Select.Group></Select.Content></Select.Root></Field.Field>
            <Field.Field><Field.FieldLabel for="relationship-type">Relationship</Field.FieldLabel><Select.Root bind:value={relationshipForm.type}><Select.Trigger id="relationship-type" class="w-full">{relationshipForm.type}</Select.Trigger><Select.Content><Select.Group>{#if data.account.type === 'dba'}<Select.Item value="dba_of">DBA of</Select.Item>{/if}<Select.Item value="subsidiary_of">Subsidiary of</Select.Item><Select.Item value="affiliate_of">Affiliate of</Select.Item></Select.Group></Select.Content></Select.Root></Field.Field>
          </Field.FieldGroup>
          <Dialog.Footer><Button variant="outline" onclick={() => (relationshipOpen = false)}>Cancel</Button><Button onclick={addRelationship} disabled={saving || !relationshipForm.targetAccountId}>Link account</Button></Dialog.Footer>
        </Dialog.Content></Dialog.Root>
      </div>
      <div class="flex flex-col gap-3">{#each data.relationships as relationship (relationship.id)}<div class="flex items-center gap-2 border-b border-border py-3"><button type="button" class="flex min-w-0 flex-1 items-center justify-between text-left" onclick={() => goto(`/crm/companies/${relationship.sourceAccountId === data.account.id ? relationship.targetAccountId : relationship.sourceAccountId}`)}><span class="truncate font-medium">{relatedName(relationship.sourceAccountId === data.account.id ? relationship.targetAccountId : relationship.sourceAccountId)}</span><Badge variant="outline">{relationship.type.replaceAll('_', ' ')}</Badge></button><AlertDialog.Root><AlertDialog.Trigger>{#snippet child({ props })}<Button {...props} variant="ghost" size="icon-sm" aria-label="Unlink company" title="Unlink company"><UnlinkIcon /></Button>{/snippet}</AlertDialog.Trigger><AlertDialog.Content><AlertDialog.Header><AlertDialog.Title>Unlink this company?</AlertDialog.Title><AlertDialog.Description>The company records remain available, but this relationship is removed.</AlertDialog.Description></AlertDialog.Header><AlertDialog.Footer><AlertDialog.Cancel>Cancel</AlertDialog.Cancel><AlertDialog.Action onclick={() => removeRelationship(relationship.id)}>Unlink company</AlertDialog.Action></AlertDialog.Footer></AlertDialog.Content></AlertDialog.Root></div>{:else}<p class="text-sm text-muted-foreground">No related companies yet.</p>{/each}</div>
    </Tabs.Content>
  </Tabs.Root>
</div>
