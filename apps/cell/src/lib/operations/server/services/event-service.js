import { CrmDataAccessError } from '$lib/crm/model/data-access-error.js';

const STATUSES = new Set(['scheduled', 'completed', 'cancelled']);

function clean(value) {
  return String(value ?? '').trim();
}

function normalizeDate(value) {
  const date = clean(value);
  return date || undefined;
}

function isValidDate(value) {
  return Boolean(value) && !Number.isNaN(Date.parse(value));
}

function normalizeInput(input) {
  return {
    ...(input.type !== undefined && { type: clean(input.type) }),
    ...(input.title !== undefined && { title: clean(input.title) }),
    ...(input.description !== undefined && { description: clean(input.description) }),
    ...(input.startsAt !== undefined && { startsAt: normalizeDate(input.startsAt) }),
    ...(input.endsAt !== undefined && { endsAt: normalizeDate(input.endsAt) }),
    ...(input.allDay !== undefined && { allDay: Boolean(input.allDay) }),
    ...(input.url !== undefined && { url: clean(input.url) }),
    ...(input.status !== undefined && { status: input.status })
  };
}

function validateInput(input, { partial = false } = {}) {
  if (!partial || input.type !== undefined) {
    if (!input.type) throw new CrmDataAccessError('INVALID_INPUT', 'Event type is required.');
  }
  if (!partial || input.title !== undefined) {
    if (!input.title) throw new CrmDataAccessError('INVALID_INPUT', 'Event title is required.');
  }
  if (!partial || input.startsAt !== undefined) {
    if (!isValidDate(input.startsAt)) throw new CrmDataAccessError('INVALID_INPUT', 'Event start date is invalid.');
  }
  if (input.endsAt !== undefined && input.endsAt && !isValidDate(input.endsAt)) {
    throw new CrmDataAccessError('INVALID_INPUT', 'Event end date is invalid.');
  }
  if (input.startsAt && input.endsAt && Date.parse(input.endsAt) < Date.parse(input.startsAt)) {
    throw new CrmDataAccessError('INVALID_INPUT', 'Event end date cannot be before its start date.');
  }
  if (input.status !== undefined && !STATUSES.has(input.status)) {
    throw new CrmDataAccessError('INVALID_INPUT', 'Event status is invalid.');
  }
  if (input.url && !/^https?:\/\//i.test(input.url)) {
    throw new CrmDataAccessError('INVALID_INPUT', 'Event links must use http or https.');
  }
}

function ensureWritable(account) {
  if (account.status !== 'active') {
    throw new CrmDataAccessError('CONFLICT', 'Only active Operations Accounts can change events.');
  }
}

function attendeeIds(input) {
  return {
    team: [...new Set((input.teamAttendeeIds ?? []).map(clean).filter(Boolean))],
    account: [...new Set((input.accountAttendeeIds ?? []).map(clean).filter(Boolean))]
  };
}

/**
 * @param {import('../ports/account-repository.js').OperationsAccountRepository} accounts
 * @param {import('../ports/event-repository.js').OperationsEventRepository} repository
 * @param {import('../ports/event-attendee-repository.js').OperationsEventAttendeeRepository} [attendees]
 */
export function createOperationsEventService(accounts, repository, attendees) {
  async function requireAttendeeSelections(accountId, input) {
    const selected = attendeeIds(input);
    if (!attendees) return selected;
    const options = await attendees.listOptionsForAccount(accountId);
    const valid = new Map([...options.team, ...options.account].map((option) => [option.kind + ':' + option.participantId, option]));
    for (const id of selected.team) {
      if (!valid.has(`team:${id}`)) throw new CrmDataAccessError('INVALID_INPUT', 'One or more team representatives are invalid.');
    }
    for (const id of selected.account) {
      if (!valid.has(`account:${id}`)) throw new CrmDataAccessError('INVALID_INPUT', 'One or more account representatives are invalid.');
    }
    return selected;
  }

  return {
    async listForAccount(accountId, filter = {}) {
      const account = await accounts.findById(clean(accountId));
      if (!account) throw new CrmDataAccessError('NOT_FOUND', 'Operations account was not found.');
      const events = await repository.listForAccount(account.id, {
        ...(filter.from && { from: normalizeDate(filter.from) }),
        ...(filter.to && { to: normalizeDate(filter.to) }),
        ...(filter.type && { type: clean(filter.type) }),
        ...(filter.status && { status: filter.status })
      });
      if (!attendees) return events;
      return Promise.all(events.map(async (event) => ({ ...event, attendees: await attendees.listForEvent(account.id, event.id) })));
    },

    async getForAccount(accountId, eventId) {
      const account = await accounts.findById(clean(accountId));
      if (!account) throw new CrmDataAccessError('NOT_FOUND', 'Operations account was not found.');
      const event = await repository.findForAccount(account.id, clean(eventId));
      if (!event) throw new CrmDataAccessError('NOT_FOUND', 'Operations event was not found.');
      return attendees ? { ...event, attendees: await attendees.listForEvent(account.id, event.id) } : event;
    },

    async listAttendeeOptions(accountId) {
      const account = await accounts.findById(clean(accountId));
      if (!account) throw new CrmDataAccessError('NOT_FOUND', 'Operations account was not found.');
      if (!attendees) return { team: [], account: [] };
      return attendees.listOptionsForAccount(account.id);
    },

    async create(accountId, input) {
      const account = await accounts.findById(clean(accountId));
      if (!account) throw new CrmDataAccessError('NOT_FOUND', 'Operations account was not found.');
      ensureWritable(account);
      const normalized = normalizeInput(input ?? {});
      validateInput(normalized);
      const selected = await requireAttendeeSelections(account.id, input ?? {});
      const event = await repository.create(account.id, { ...normalized, status: normalized.status ?? 'scheduled', allDay: normalized.allDay ?? false });
      if (attendees) await attendees.replaceForEvent(account.id, event.id, selected);
      return { ...event, attendees: attendees ? await attendees.listForEvent(account.id, event.id) : [] };
    },

    async update(accountId, eventId, input) {
      const account = await accounts.findById(clean(accountId));
      if (!account) throw new CrmDataAccessError('NOT_FOUND', 'Operations account was not found.');
      ensureWritable(account);
      const current = await this.getForAccount(account.id, eventId);
      const normalized = normalizeInput(input ?? {});
      validateInput({ ...current, ...normalized }, { partial: true });
      const selected = await requireAttendeeSelections(account.id, input ?? {});
      const event = await repository.update(account.id, current.id, normalized);
      if (attendees && (input.teamAttendeeIds !== undefined || input.accountAttendeeIds !== undefined)) {
        await attendees.replaceForEvent(account.id, event.id, selected);
      }
      return { ...event, attendees: attendees ? await attendees.listForEvent(account.id, event.id) : [] };
    }
  };
}
