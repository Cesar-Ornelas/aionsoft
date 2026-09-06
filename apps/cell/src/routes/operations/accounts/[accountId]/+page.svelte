<script>
  import { goto } from '$app/navigation';
  import { CalendarDate, getLocalTimeZone } from '@internationalized/date';
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
  import CalendarDaysIcon from '@lucide/svelte/icons/calendar-days';
  import PlusIcon from '@lucide/svelte/icons/plus';
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
  import * as Tabs from '$lib/components/ui/tabs';
  import * as Calendar from '$lib/components/ui/calendar';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { toast } from '$lib/stores/toast.js';

  let { data } = $props();
  let form = $state({ name: '', description: '', status: 'active' });
  let editOpen = $state(false);
  let communicationsOpen = $state(false);
  let notesOpen = $state(false);
  let scheduleOpen = $state(false);
  let eventDialogOpen = $state(false);
  let eventSubmitting = $state(false);
  let eventError = $state('');
  let eventTab = $state('details');
  let selectedScheduleDate = $state(new CalendarDate(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()));
  let eventForm = $state({ type: 'meeting', title: '', description: '', date: '', startTime: '09:00', endTime: '10:00', allDay: false, url: '' });
  let selectedAttendees = $state({ team: [], account: [] });
  let selectedCompanyId = $state('');
  let submitting = $state(false);
  let errorMessage = $state('');

  function formatScheduleDate(date) {
    return date.toDate(getLocalTimeZone()).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  function calendarDateKey(date) {
    return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
  }

  function resetEventForm() {
    eventForm = { type: 'meeting', title: '', description: '', date: calendarDateKey(selectedScheduleDate), startTime: '09:00', endTime: '10:00', allDay: false, url: '' };
    selectedAttendees = { team: [], account: [] };
    eventTab = 'details';
    eventError = '';
  }

  function openEventDialog() {
    resetEventForm();
    eventDialogOpen = true;
  }

  function toggleAttendee(kind, participantId) {
    const current = selectedAttendees[kind];
    selectedAttendees[kind] = current.includes(participantId)
      ? current.filter((id) => id !== participantId)
      : [...current, participantId];
  }

  let selectedDayEvents = $derived((data.events ?? []).filter((event) => event.startsAt?.slice(0, 10) === calendarDateKey(selectedScheduleDate)));

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
  async function createEvent() {
    eventSubmitting = true;
    eventError = '';
    try {
      const startsAt = eventForm.allDay ? `${eventForm.date}T00:00:00` : `${eventForm.date}T${eventForm.startTime}:00`;
      const endsAt = eventForm.allDay || !eventForm.endTime ? undefined : `${eventForm.date}T${eventForm.endTime}:00`;
      await request(`/operations/accounts/${data.account.id}/events`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: eventForm.type, title: eventForm.title, description: eventForm.description, startsAt, endsAt, allDay: eventForm.allDay, url: eventForm.url, teamAttendeeIds: selectedAttendees.team, accountAttendeeIds: selectedAttendees.account })
      });
      eventDialogOpen = false;
      toast.success('Event added to the account schedule.');
      await goto(`/operations/accounts/${data.account.id}`, { invalidateAll: true, replaceState: true });
    } catch (error) {
      eventError = error.message;
      toast.error(eventError);
    } finally {
      eventSubmitting = false;
    }
  }
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
    <Sheet.Root bind:open={scheduleOpen}>
      <Sheet.Trigger>
        {#snippet child({ props })}
          <Button {...props} variant="outline" size="icon" title="Schedule" aria-label="Schedule"><CalendarDaysIcon /></Button>
        {/snippet}
      </Sheet.Trigger>
      <Sheet.Content side="right" class="w-full sm:max-w-md">
        <Sheet.Header>
          <Sheet.Title>Schedule</Sheet.Title>
        </Sheet.Header>
        <div class="flex flex-1 flex-col gap-6 py-6">
          <Calendar.Calendar type="single" bind:value={selectedScheduleDate} class="rounded-md border shadow-sm" preventDeselect />
          <div class="flex flex-col items-start gap-3 border-t px-1 pt-4">
            <div class="flex w-full items-center justify-between gap-3">
              <div class="text-sm font-medium">{formatScheduleDate(selectedScheduleDate)}</div>
              <Dialog.Root bind:open={eventDialogOpen}>
                <Dialog.Trigger>
                  {#snippet child({ props })}
                    <Button {...props} size="sm" onclick={openEventDialog}><PlusIcon data-icon="inline-start" />Add event</Button>
                  {/snippet}
                </Dialog.Trigger>
                <Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                  <Dialog.Header>
                    <Dialog.Title>Add schedule event</Dialog.Title>
                    <Dialog.Description>Create an event for {data.account.name} on the selected date.</Dialog.Description>
                  </Dialog.Header>
                  <Tabs.Root bind:value={eventTab}>
                    <Tabs.List class="w-full">
                      <Tabs.Trigger value="details">Details</Tabs.Trigger>
                      <Tabs.Trigger value="attendees">Attendees</Tabs.Trigger>
                    </Tabs.List>
                    <Tabs.Content value="details" class="pt-4">
                      <Field.FieldGroup>
                        <Field.Field><Field.FieldLabel for="operations-event-type">Type</Field.FieldLabel><select id="operations-event-type" class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" bind:value={eventForm.type}><option value="meeting">Meeting</option><option value="reminder">Reminder</option><option value="milestone">Milestone</option></select></Field.Field>
                        <Field.Field><Field.FieldLabel for="operations-event-title">Title</Field.FieldLabel><Input id="operations-event-title" bind:value={eventForm.title} required /></Field.Field>
                        <Field.Field><Field.FieldLabel for="operations-event-description">Description</Field.FieldLabel><Input id="operations-event-description" bind:value={eventForm.description} /></Field.Field>
                        <div class="grid gap-3 sm:grid-cols-3">
                          <Field.Field><Field.FieldLabel for="operations-event-date">Date</Field.FieldLabel><Input id="operations-event-date" type="date" bind:value={eventForm.date} required /></Field.Field>
                          <Field.Field><Field.FieldLabel for="operations-event-start">Start</Field.FieldLabel><Input id="operations-event-start" type="time" bind:value={eventForm.startTime} disabled={eventForm.allDay} /></Field.Field>
                          <Field.Field><Field.FieldLabel for="operations-event-end">End</Field.FieldLabel><Input id="operations-event-end" type="time" bind:value={eventForm.endTime} disabled={eventForm.allDay} /></Field.Field>
                        </div>
                        <label class="flex items-center gap-2 text-sm"><input type="checkbox" bind:checked={eventForm.allDay} />All-day event</label>
                        <Field.Field><Field.FieldLabel for="operations-event-url">Link</Field.FieldLabel><Input id="operations-event-url" type="url" bind:value={eventForm.url} placeholder="https://" /></Field.Field>
                        {#if eventError}<Field.FieldError>{eventError}</Field.FieldError>{/if}
                      </Field.FieldGroup>
                    </Tabs.Content>
                    <Tabs.Content value="attendees" class="flex flex-col gap-5 pt-4">
                      <Field.FieldSet>
                        <Field.FieldLegend>Team representatives</Field.FieldLegend>
                        <Field.FieldDescription>Select active internal users attending this event.</Field.FieldDescription>
                        <div class="flex flex-col gap-2 pt-2">
                          {#each data.attendeeOptions?.team ?? [] as attendee (attendee.participantId)}
                            <label class="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"><input type="checkbox" checked={selectedAttendees.team.includes(attendee.participantId)} onchange={() => toggleAttendee('team', attendee.participantId)} /><span class="flex min-w-0 flex-1 flex-col"><span class="font-medium">{attendee.name}</span>{#if attendee.email}<span class="truncate text-xs text-muted-foreground">{attendee.email}</span>{/if}</span></label>
                          {:else}
                            <p class="text-sm text-muted-foreground">No active team users are available.</p>
                          {/each}
                        </div>
                      </Field.FieldSet>
                      <Field.FieldSet>
                        <Field.FieldLegend>Account representatives</Field.FieldLegend>
                        <Field.FieldDescription>Contacts from companies linked to this Operations Account.</Field.FieldDescription>
                        <div class="flex flex-col gap-2 pt-2">
                          {#each data.attendeeOptions?.account ?? [] as attendee (attendee.participantId)}
                            <label class="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"><input type="checkbox" checked={selectedAttendees.account.includes(attendee.participantId)} onchange={() => toggleAttendee('account', attendee.participantId)} /><span class="flex min-w-0 flex-1 flex-col"><span class="font-medium">{attendee.name}</span><span class="truncate text-xs text-muted-foreground">{attendee.jobTitle || attendee.email || 'Account contact'}</span></span></label>
                          {:else}
                            <p class="text-sm text-muted-foreground">No contacts are available from linked companies.</p>
                          {/each}
                        </div>
                      </Field.FieldSet>
                    </Tabs.Content>
                  </Tabs.Root>
                  <Dialog.Footer><Button variant="outline" onclick={() => (eventDialogOpen = false)}>Cancel</Button><Button onclick={createEvent} disabled={eventSubmitting || !eventForm.title || !eventForm.date}>{eventSubmitting ? 'Adding...' : 'Add event'}</Button></Dialog.Footer>
                </Dialog.Content>
              </Dialog.Root>
            </div>
            {#each selectedDayEvents as event (event.id)}
              <div class="flex w-full flex-col gap-1 rounded-md bg-muted p-3 text-sm">
                <div class="flex items-center justify-between gap-3"><div class="font-medium">{event.title}</div><span class="text-xs capitalize text-muted-foreground">{event.type}</span></div>
                {#if event.description}<div class="text-xs text-muted-foreground">{event.description}</div>{/if}
                {#if event.url}<a class="text-xs text-primary hover:underline" href={event.url} target="_blank" rel="noreferrer">Open link</a>{/if}
              </div>
            {:else}
              <div class="flex w-full flex-col gap-1 rounded-md bg-muted p-3 text-sm">
                <div class="font-medium">No scheduled events</div>
                <div class="text-xs text-muted-foreground">Events for this account will appear here.</div>
              </div>
            {/each}
          </div>
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
  </section>

</div>
