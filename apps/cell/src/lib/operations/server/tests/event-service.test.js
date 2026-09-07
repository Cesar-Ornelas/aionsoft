import { describe, expect, test } from 'bun:test';
import { CRM_DATA_ACCESS_ERROR_CODES } from '$lib/crm/model/data-access-error.js';
import { createOperationsEventService } from '../services/event-service.js';

function setup() {
  const accounts = new Map([
    ['account-1', { id: 'account-1', status: 'active' }],
    ['account-2', { id: 'account-2', status: 'active' }],
    ['account-archived', { id: 'account-archived', status: 'archived' }]
  ]);
  const events = new Map();
  const attendeeOptions = {
    team: [{ id: 'team-1', participantId: 'team-1', kind: 'team', name: 'Taylor Team' }],
    account: [{ id: 'contact-1', participantId: 'contact-1', kind: 'account', name: 'Casey Contact' }]
  };
  const eventAttendees = new Map();
  let nextId = 1;
  const accountRepository = { async findById(id) { return accounts.get(id) ?? null; } };
  const eventRepository = {
    async listForAccount(accountId, filter = {}) {
      return [...events.values()]
        .filter((event) => event.accountId === accountId)
        .filter((event) => !filter.from || event.startsAt >= filter.from)
        .filter((event) => !filter.to || event.startsAt <= filter.to)
        .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
    },
    async findForAccount(accountId, eventId) {
      const event = events.get(eventId);
      return event?.accountId === accountId ? event : null;
    },
    async create(accountId, input) {
      const event = { id: `event-${nextId++}`, accountId, description: '', allDay: false, ...input };
      events.set(event.id, event);
      return event;
    },
    async update(accountId, eventId, input) {
      const event = { ...events.get(eventId), ...input };
      events.set(eventId, event);
      return event;
    },
    async delete(accountId, eventId) {
      const event = events.get(eventId);
      if (event?.accountId !== accountId) throw new Error('event scope mismatch');
      events.delete(eventId);
    }
  };
  const attendeeRepository = {
    async listOptionsForAccount() { return attendeeOptions; },
    async listForEvent(accountId, eventId) { return eventAttendees.get(`${accountId}:${eventId}`) ?? []; },
    async replaceForEvent(accountId, eventId, selected) {
      const options = [...attendeeOptions.team, ...attendeeOptions.account];
      const selectedIds = [...selected.team.map((id) => `team:${id}`), ...selected.account.map((id) => `account:${id}`)];
      const values = options.filter((option) => selectedIds.includes(`${option.kind}:${option.participantId}`));
      eventAttendees.set(`${accountId}:${eventId}`, values);
      return values;
    }
  };
  return { service: createOperationsEventService(accountRepository, eventRepository, attendeeRepository), events, eventAttendees };
}

describe('operations event service', () => {
  test('creates and lists events only for the requested account', async () => {
    const context = setup();
    await context.service.create('account-1', { type: 'meeting', title: 'Kickoff', startsAt: '2026-09-17T09:00:00Z' });
    await context.service.create('account-2', { type: 'reminder', title: 'Follow up', startsAt: '2026-09-17T10:00:00Z' });
    expect((await context.service.listForAccount('account-1')).map((event) => event.title)).toEqual(['Kickoff']);
  });

  test('validates event dates and links', async () => {
    const context = setup();
    await expect(context.service.create('account-1', { type: 'milestone', title: 'Launch', startsAt: '2026-09-18', endsAt: '2026-09-17' })).rejects.toMatchObject({ code: CRM_DATA_ACCESS_ERROR_CODES.INVALID_INPUT });
    await expect(context.service.create('account-1', { type: 'meeting', title: 'Call', startsAt: '2026-09-18', url: 'ftp://example.com' })).rejects.toMatchObject({ code: CRM_DATA_ACCESS_ERROR_CODES.INVALID_INPUT });
  });

  test('rejects event changes for archived accounts', async () => {
    const context = setup();
    await expect(context.service.create('account-archived', { type: 'reminder', title: 'Archive check', startsAt: '2026-09-18' })).rejects.toMatchObject({ code: CRM_DATA_ACCESS_ERROR_CODES.CONFLICT });
  });

  test('rejects cross-account updates', async () => {
    const context = setup();
    const event = await context.service.create('account-1', { type: 'meeting', title: 'Private meeting', startsAt: '2026-09-18' });
    await expect(context.service.update('account-2', event.id, { title: 'Changed' })).rejects.toMatchObject({ code: CRM_DATA_ACCESS_ERROR_CODES.NOT_FOUND });
  });

  test('persists scoped team and account attendees', async () => {
    const context = setup();
    const event = await context.service.create('account-1', {
      type: 'meeting',
      title: 'Planning session',
      startsAt: '2026-09-18T09:00:00Z',
      teamAttendeeIds: ['team-1', 'team-1'],
      accountAttendeeIds: ['contact-1']
    });
    expect(event.attendees.map((attendee) => attendee.participantId)).toEqual(['team-1', 'contact-1']);
    expect((await context.service.getForAccount('account-1', event.id)).attendees).toHaveLength(2);
  });

  test('rejects inactive or unrelated attendee ids', async () => {
    const context = setup();
    await expect(context.service.create('account-1', {
      type: 'meeting', title: 'Invalid team', startsAt: '2026-09-18', teamAttendeeIds: ['inactive-user']
    })).rejects.toMatchObject({ code: CRM_DATA_ACCESS_ERROR_CODES.INVALID_INPUT });
    await expect(context.service.create('account-1', {
      type: 'meeting', title: 'Invalid contact', startsAt: '2026-09-18', accountAttendeeIds: ['other-account-contact']
    })).rejects.toMatchObject({ code: CRM_DATA_ACCESS_ERROR_CODES.INVALID_INPUT });
  });

  test('deletes only an event owned by the requested account', async () => {
    const context = setup();
    const event = await context.service.create('account-1', { type: 'meeting', title: 'Remove me', startsAt: '2026-09-18' });
    await expect(context.service.delete('account-2', event.id)).rejects.toMatchObject({ code: CRM_DATA_ACCESS_ERROR_CODES.NOT_FOUND });
    await context.service.delete('account-1', event.id);
    expect(await context.service.listForAccount('account-1')).toEqual([]);
  });
});
