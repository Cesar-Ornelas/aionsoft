import { describe, expect, test } from 'bun:test';
import { CRM_DATA_ACCESS_ERROR_CODES } from '$lib/crm/model/data-access-error.js';
import { createOperationsCallService } from '../services/call-service.js';

function setup() {
  const accounts = new Map([
    ['account-1', { id: 'account-1', status: 'active' }],
    ['account-2', { id: 'account-2', status: 'active' }],
    ['account-archived', { id: 'account-archived', status: 'archived' }]
  ]);
  const contacts = [
    { id: 'contact-1', participantId: 'contact-1', name: 'Casey Contact' }
  ];
  const calls = new Map();
  let nextId = 1;
  const accountRepository = { async findById(id) { return accounts.get(id) ?? null; } };
  const callRepository = {
    async listForAccount(accountId, filter = {}) {
      return [...calls.values()]
        .filter((call) => call.accountId === accountId)
        .filter((call) => !filter.from || call.startsAt >= filter.from)
        .filter((call) => !filter.to || call.startsAt <= filter.to)
        .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
    },
    async findForAccount(accountId, callId) {
      const call = calls.get(callId);
      return call?.accountId === accountId ? call : null;
    },
    async create(accountId, input) {
      const call = { id: `call-${nextId++}`, accountId, ...input };
      calls.set(call.id, call);
      return call;
    },
    async update(accountId, callId, input) {
      const call = { ...calls.get(callId), ...input };
      calls.set(callId, call);
      return call;
    },
    async delete(accountId, callId) {
      const call = calls.get(callId);
      if (call?.accountId !== accountId) throw new Error('call scope mismatch');
      calls.delete(callId);
    },
    async listContactsForAccount() { return contacts; }
  };
  return { service: createOperationsCallService(accountRepository, callRepository), calls };
}

describe('operations call service', () => {
  test('creates and lists calls for the requested account', async () => {
    const context = setup();
    await context.service.create('account-1', {
      startsAt: '2026-09-18T09:00:00Z',
      durationMinutes: 30,
      contactId: 'contact-1',
      direction: 'outbound',
      outcome: 'completed',
      notes: 'Discussed renewal.'
    });
    await context.service.create('account-2', {
      startsAt: '2026-09-18T10:00:00Z',
      direction: 'inbound',
      outcome: 'no_answer'
    });
    expect((await context.service.listForAccount('account-1')).map((call) => call.notes)).toEqual(['Discussed renewal.']);
  });

  test('validates calls and linked contacts', async () => {
    const context = setup();
    await expect(context.service.create('account-1', {
      startsAt: 'not-a-date', direction: 'outbound', outcome: 'completed'
    })).rejects.toMatchObject({ code: CRM_DATA_ACCESS_ERROR_CODES.INVALID_INPUT });
    await expect(context.service.create('account-1', {
      startsAt: '2026-09-18T09:00:00Z', direction: 'outbound', outcome: 'completed', durationMinutes: 1441
    })).rejects.toMatchObject({ code: CRM_DATA_ACCESS_ERROR_CODES.INVALID_INPUT });
    await expect(context.service.create('account-1', {
      startsAt: '2026-09-18T09:00:00Z', direction: 'outbound', outcome: 'completed', contactId: 'other-contact'
    })).rejects.toMatchObject({ code: CRM_DATA_ACCESS_ERROR_CODES.INVALID_INPUT });
  });

  test('rejects writes for archived accounts and cross-account access', async () => {
    const context = setup();
    await expect(context.service.create('account-archived', {
      startsAt: '2026-09-18T09:00:00Z', direction: 'outbound', outcome: 'scheduled'
    })).rejects.toMatchObject({ code: CRM_DATA_ACCESS_ERROR_CODES.CONFLICT });
    const call = await context.service.create('account-1', {
      startsAt: '2026-09-18T09:00:00Z', direction: 'outbound', outcome: 'scheduled'
    });
    await expect(context.service.update('account-2', call.id, { notes: 'No access' })).rejects.toMatchObject({ code: CRM_DATA_ACCESS_ERROR_CODES.NOT_FOUND });
    await expect(context.service.delete('account-2', call.id)).rejects.toMatchObject({ code: CRM_DATA_ACCESS_ERROR_CODES.NOT_FOUND });
    await context.service.delete('account-1', call.id);
    expect(context.calls.size).toBe(0);
  });
});
