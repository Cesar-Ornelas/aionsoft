import { describe, expect, test } from 'bun:test';
import { CRM_DATA_ACCESS_ERROR_CODES } from '../../model/data-access-error.js';
import { createAccountRelationshipService } from '../services/account-relationship-service.js';

function setup({ duplicate = false, cycle = false } = {}) {
  const accounts = new Map([
    ['dba', { id: 'dba', type: 'dba' }],
    ['parent', { id: 'parent', type: 'legal_entity' }],
    ['other', { id: 'other', type: 'legal_entity' }]
  ]);

  const repository = {
    async listForAccount() {
      return [];
    },
    async findMatching() {
      return duplicate ? { id: 'relationship-1' } : null;
    },
    async wouldCreateHierarchyCycle() {
      return cycle;
    },
    async create(sourceAccountId, input) {
      return { id: 'relationship-1', sourceAccountId, ...input };
    }
  };

  return createAccountRelationshipService(repository, {
    async findById(id) {
      return accounts.get(id) ?? null;
    }
  });
}

describe('account relationship service', () => {
  test('rejects self-links', async () => {
    expect(setup().create('dba', { targetAccountId: 'dba', type: 'dba_of' })).rejects.toMatchObject({
      code: CRM_DATA_ACCESS_ERROR_CODES.INVALID_INPUT
    });
  });

  test('allows a DBA to link to its legal parent', async () => {
    const relationship = await setup().create('dba', { targetAccountId: 'parent', type: 'dba_of' });
    expect(relationship).toMatchObject({ sourceAccountId: 'dba', targetAccountId: 'parent', type: 'dba_of' });
  });

  test('rejects duplicate relationships', async () => {
    expect(setup({ duplicate: true }).create('dba', { targetAccountId: 'parent', type: 'dba_of' })).rejects.toMatchObject({
      code: CRM_DATA_ACCESS_ERROR_CODES.CONFLICT
    });
  });

  test('rejects hierarchy cycles', async () => {
    expect(setup({ cycle: true }).create('dba', { targetAccountId: 'parent', type: 'dba_of' })).rejects.toMatchObject({
      code: CRM_DATA_ACCESS_ERROR_CODES.CONFLICT
    });
  });

  test('rejects dba_of on a legal entity', async () => {
    expect(setup().create('other', { targetAccountId: 'parent', type: 'dba_of' })).rejects.toMatchObject({
      code: CRM_DATA_ACCESS_ERROR_CODES.INVALID_INPUT
    });
  });
});
