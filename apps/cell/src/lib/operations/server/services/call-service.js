import { CrmDataAccessError } from '$lib/crm/model/data-access-error.js';

const DIRECTIONS = new Set(['inbound', 'outbound']);
const OUTCOMES = new Set(['scheduled', 'completed', 'no_answer', 'follow_up']);

function clean(value) {
  return String(value ?? '').trim();
}

function normalizeStartsAt(value) {
  const date = clean(value);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(date)) {
    return new Date(date).toISOString();
  }
  return date;
}

function normalize(input) {
  return {
    ...(input.startsAt !== undefined && { startsAt: normalizeStartsAt(input.startsAt) }),
    ...(input.durationMinutes !== undefined && { durationMinutes: Number(input.durationMinutes) }),
    ...(input.contactId !== undefined && { contactId: clean(input.contactId) }),
    ...(input.direction !== undefined && { direction: clean(input.direction) }),
    ...(input.outcome !== undefined && { outcome: clean(input.outcome) }),
    ...(input.notes !== undefined && { notes: clean(input.notes) })
  };
}

function validate(input, { partial = false } = {}) {
  if (!partial || input.startsAt !== undefined) {
    if (!input.startsAt || Number.isNaN(Date.parse(input.startsAt))) throw new CrmDataAccessError('INVALID_INPUT', 'Call date and time are invalid.');
  }
  if (input.durationMinutes !== undefined && (!Number.isInteger(input.durationMinutes) || input.durationMinutes < 0 || input.durationMinutes > 1440)) {
    throw new CrmDataAccessError('INVALID_INPUT', 'Call duration must be a whole number between 0 and 1440 minutes.');
  }
  if (!partial || input.direction !== undefined) {
    if (!DIRECTIONS.has(input.direction)) throw new CrmDataAccessError('INVALID_INPUT', 'Call direction is invalid.');
  }
  if (!partial || input.outcome !== undefined) {
    if (!OUTCOMES.has(input.outcome)) throw new CrmDataAccessError('INVALID_INPUT', 'Call outcome is invalid.');
  }
}

function ensureWritable(account) {
  if (account.status !== 'active') throw new CrmDataAccessError('CONFLICT', 'Only active Operations Accounts can change calls.');
}

/** @param {import('../ports/account-repository.js').OperationsAccountRepository} accounts @param {import('../ports/call-repository.js').OperationsCallRepository} repository */
export function createOperationsCallService(accounts, repository) {
  async function requireAccount(accountId) {
    const account = await accounts.findById(clean(accountId));
    if (!account) throw new CrmDataAccessError('NOT_FOUND', 'Operations account was not found.');
    return account;
  }

  async function withContactValidation(accountId, input) {
    const normalized = normalize(input ?? {});
    if (normalized.contactId) {
      const contacts = await repository.listContactsForAccount(accountId);
      if (!contacts.some((contact) => contact.participantId === normalized.contactId)) {
        throw new CrmDataAccessError('INVALID_INPUT', 'The selected customer contact is not linked to this account.');
      }
    }
    return normalized;
  }

  return {
    async listForAccount(accountId, filter = {}) {
      const account = await requireAccount(accountId);
      return repository.listForAccount(account.id, filter);
    },
    async listContactOptions(accountId) {
      const account = await requireAccount(accountId);
      return repository.listContactsForAccount(account.id);
    },
    async getForAccount(accountId, callId) {
      const account = await requireAccount(accountId);
      const call = await repository.findForAccount(account.id, clean(callId));
      if (!call) throw new CrmDataAccessError('NOT_FOUND', 'Operations call was not found.');
      return call;
    },
    async create(accountId, input) {
      const account = await requireAccount(accountId);
      ensureWritable(account);
      const normalized = await withContactValidation(account.id, input);
      validate(normalized);
      return repository.create(account.id, { ...normalized, durationMinutes: normalized.durationMinutes ?? 0, notes: normalized.notes ?? '' });
    },
    async update(accountId, callId, input) {
      const account = await requireAccount(accountId);
      ensureWritable(account);
      const current = await this.getForAccount(account.id, callId);
      const normalized = await withContactValidation(account.id, input);
      validate({ ...current, ...normalized }, { partial: true });
      return repository.update(account.id, current.id, normalized);
    },
    async delete(accountId, callId) {
      const account = await requireAccount(accountId);
      ensureWritable(account);
      const current = await this.getForAccount(account.id, callId);
      await repository.delete(account.id, current.id);
    }
  };
}