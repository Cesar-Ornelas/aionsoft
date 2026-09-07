import { describe, expect, test } from 'bun:test';
import { createBillingAgreementService } from '../services/billing-agreement-service.js';

function createRepository() {
  const agreements = [];
  const items = [];
  return {
    agreements,
    items,
    async list(filter) { return agreements.filter((entry) => (!filter.operationsAccountId || entry.operationsAccountId === filter.operationsAccountId) && (!filter.status || entry.status === filter.status)); },
    async findById(id) { return agreements.find((entry) => entry.id === id) ?? null; },
    async create(input) { const entry = { id: `agreement-${agreements.length + 1}`, ...input }; agreements.push(entry); return entry; },
    async update(id, input) { const entry = agreements.find((item) => item.id === id); Object.assign(entry, input); return entry; },
    async listItems(agreementId) { return items.filter((item) => item.agreementId === agreementId); },
    async createItem(input) { const item = { id: `item-${items.length + 1}`, ...input }; items.push(item); return item; },
    async findItemById(id) { return items.find((item) => item.id === id) ?? null; },
    async updateItem(id, input) { const item = items.find((entry) => entry.id === id); Object.assign(item, input); return item; }
  };
}

describe('billing agreement service', () => {
  test('creates agreements and enforces lifecycle transitions', async () => {
    const repository = createRepository();
    const service = createBillingAgreementService(repository, { operationsAccounts: { findById: async () => ({ id: 'account-1' }) } });
    const agreement = await service.create({ operationsAccountId: 'account-1', agreementNumber: 'BA-001', name: 'Managed support' });

    expect(agreement.status).toBe('draft');
    await service.transition(agreement.id, 'active');
    expect((await service.get(agreement.id)).status).toBe('active');
    await service.transition(agreement.id, 'cancelled');
    expect((await service.get(agreement.id)).cancelledAt).toBeTruthy();
    expect(service.transition(agreement.id, 'active')).rejects.toMatchObject({ code: 'conflict' });
  });

  test('snapshots catalog service pricing when the item is added', async () => {
    const repository = createRepository();
    const catalog = {
      async get() { return { id: 'service-1', customerPriceCents: 12000, currency: 'USD' }; },
      async listPriceOffers() { return [{ id: 'offer-1', billingBasis: 'hourly', unitLabel: 'hour', salePriceCents: 15000, currency: 'USD' }]; }
    };
    const service = createBillingAgreementService(repository, { catalog, operationsAccounts: { findById: async () => ({ id: 'account-1' }) } });
    const agreement = await service.create({ operationsAccountId: 'account-1', agreementNumber: 'BA-002', name: 'Consulting' });
    const item = await service.addItem({ agreementId: agreement.id, serviceId: 'service-1', offerId: 'offer-1' });

    expect(item).toMatchObject({ unitPriceCents: 15000, billingBasis: 'hourly', unitLabel: 'hour' });
    expect(repository.items[0].unitPriceCents).toBe(15000);
  });

  test('rejects ambiguous item sources and terminal agreement additions', async () => {
    const repository = createRepository();
    const service = createBillingAgreementService(repository, { operationsAccounts: { findById: async () => ({ id: 'account-1' }) } });
    const agreement = await service.create({ operationsAccountId: 'account-1', agreementNumber: 'BA-003', name: 'Support' });

    expect(service.addItem({ agreementId: agreement.id, serviceId: 'service-1', planId: 'plan-1' })).rejects.toMatchObject({ code: 'invalid_input' });
    await service.transition(agreement.id, 'cancelled');
    expect(service.addItem({ agreementId: agreement.id, serviceId: 'service-1' })).rejects.toMatchObject({ code: 'conflict' });
  });
});
