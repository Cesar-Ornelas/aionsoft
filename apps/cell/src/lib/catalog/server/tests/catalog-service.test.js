import { describe, expect, test } from 'bun:test';
import { createCatalogService } from '../services/catalog-service.js';

function createRepository() {
  const items = [];
  return {
    items,
    async list(filter) {
      const filtered = items.filter((item) => (!filter.search || `${item.name} ${item.code}`.toLowerCase().includes(filter.search.toLowerCase())) && (!filter.status || item.status === filter.status));
      return { items: filtered, page: 1, pageSize: 25, totalItems: filtered.length, totalPages: filtered.length ? 1 : 0 };
    },
    async findById(id) { return items.find((item) => item.id === id) ?? null; },
    async findByCode(code) { return items.find((item) => item.code === code) ?? null; },
    async create(input) {
      const item = { id: `service-${items.length + 1}`, ...input, createdAt: '', updatedAt: '' };
      items.push(item);
      return item;
    },
    async update(id, input) {
      const index = items.findIndex((item) => item.id === id);
      items[index] = { ...items[index], ...input };
      return items[index];
    },
    async listPriceOffers(serviceId) {
      return items.find((item) => item.id === serviceId)?.priceOffers ?? [];
    },
    async createPriceOffer(serviceId, input) {
      const service = items.find((item) => item.id === serviceId);
      const offer = { id: `offer-${(service.priceOffers ?? []).length + 1}`, serviceId, ...input };
      service.priceOffers = [...(service.priceOffers ?? []), offer];
      return offer;
    },
    async updatePriceOffer(serviceId, offerId, input) {
      const service = items.find((item) => item.id === serviceId);
      const index = service.priceOffers.findIndex((offer) => offer.id === offerId);
      service.priceOffers[index] = { ...service.priceOffers[index], ...input };
      return service.priceOffers[index];
    },
    async listPlans() {
      return this.plans ?? [];
    },
    async createPlan(input) {
      this.plans = [...(this.plans ?? []), { id: `plan-${this.plans?.length + 1 || 1}`, ...input, items: [] }];
      return this.plans.at(-1);
    },
    async createPlanItem(planId, input) {
      const plan = this.plans.find((item) => item.id === planId);
      const item = { id: `item-${plan.items.length + 1}`, planId, ...input };
      plan.items.push(item);
      return item;
    }
  };
}

describe('catalog service', () => {
  test('creates a service with normalized code and separate prices', async () => {
    const repository = createRepository();
    const service = createCatalogService(repository);
    const result = await service.create({ name: 'Emergency repair', code: ' er-001 ', customerPriceCents: 100000, internalCostCents: 80000 });

    expect(result.code).toBe('ER-001');
    expect(result.customerPriceCents).toBe(100000);
    expect(result.internalCostCents).toBe(80000);
  });

  test('creates the first pricing offer with a new service', async () => {
    const repository = createRepository();
    const service = createCatalogService(repository);
    const result = await service.create({
      name: 'Hourly consulting',
      code: 'CON-002',
      priceOffers: [{ name: 'Standard hourly', billingBasis: 'hourly', unitLabel: 'hour', salePriceCents: 10000, internalCostCents: 8000 }]
    });

    expect(await service.listPriceOffers(result.id)).toMatchObject([{ billingBasis: 'hourly', unitLabel: 'hour', salePriceCents: 10000 }]);
  });

  test('rejects duplicate codes and negative money', async () => {
    const repository = createRepository();
    const service = createCatalogService(repository);
    await service.create({ name: 'Inspection', code: 'INS-001' });

    expect(service.create({ name: 'Other inspection', code: 'ins-001' })).rejects.toMatchObject({ code: 'conflict' });
    expect(service.create({ name: 'Bad service', code: 'BAD-001', customerPriceCents: -1 })).rejects.toMatchObject({ code: 'invalid_input' });
  });

  test('archives without deleting the service', async () => {
    const repository = createRepository();
    const service = createCatalogService(repository);
    const created = await service.create({ name: 'Legacy service', code: 'LEG-001' });

    await service.archive(created.id);

    expect(await service.get(created.id)).toMatchObject({ id: created.id, status: 'archived' });
  });

  test('creates pricing offers for supported billing bases', async () => {
    const repository = createRepository();
    const service = createCatalogService(repository);
    const created = await service.create({ name: 'Consulting', code: 'CON-001' });

    for (const billingBasis of ['fixed', 'hourly', 'daily', 'per_unit', 'recurring']) {
      const offer = await service.createPriceOffer(created.id, {
        name: `${billingBasis} offer`, billingBasis, unitLabel: billingBasis === 'fixed' ? 'project' : billingBasis,
        salePriceCents: 10000, internalCostCents: 8000
      });
      expect(offer.billingBasis).toBe(billingBasis);
    }
  });

  test('rejects invalid pricing offer dates and billing bases', async () => {
    const repository = createRepository();
    const service = createCatalogService(repository);
    const created = await service.create({ name: 'Support', code: 'SUP-001' });
    const input = { name: 'Support hourly', billingBasis: 'hourly', unitLabel: 'hour', salePriceCents: 10000, internalCostCents: 8000 };

    expect(service.createPriceOffer(created.id, { ...input, billingBasis: 'custom' })).rejects.toMatchObject({ code: 'invalid_input' });
    expect(service.createPriceOffer(created.id, { ...input, effectiveFrom: '2026-02-01', effectiveTo: '2026-01-01' })).rejects.toMatchObject({ code: 'invalid_input' });
  });

  test('creates a bundle plan with included quantity and overage', async () => {
    const repository = createRepository();
    const service = createCatalogService(repository);
    const created = await service.create({ name: 'Advisory hours', code: 'ADV-001' });
    const plan = await service.createPlan({ name: 'Ten hour plan', code: 'PLAN-10H', bundlePriceCents: 90000, termUnit: 'one_time' });
    const item = await service.createPlanItem(plan.id, { serviceId: created.id, includedQuantity: 10, unitLabel: 'hour', overagePriceCents: 9000, overageBillingBasis: 'hourly' });

    expect(plan.bundlePriceCents).toBe(90000);
    expect(item).toMatchObject({ includedQuantity: 10, overagePriceCents: 9000, unitLabel: 'hour' });
  });

  test('validates retainer commitment policies and effective dates', async () => {
    const repository = createRepository();
    const service = createCatalogService(repository);

    const plan = await service.createPlan({
      name: 'Forty hour retainer',
      code: 'PLAN-40H',
      bundlePriceCents: 540000,
      termUnit: 'monthly',
      commitmentEnforcement: 'minimum_charge',
      unusedQuantityPolicy: 'forfeit',
      effectiveFrom: '2026-10-01'
    });

    expect(plan).toMatchObject({
      termUnit: 'monthly',
      commitmentEnforcement: 'minimum_charge',
      unusedQuantityPolicy: 'forfeit',
      effectiveFrom: '2026-10-01'
    });
    expect(service.createPlan({ name: 'Bad policy', code: 'PLAN-BAD', bundlePriceCents: 1, commitmentEnforcement: 'discount', unusedQuantityPolicy: 'forfeit' })).rejects.toMatchObject({ code: 'invalid_input' });
    expect(service.createPlan({ name: 'Bad dates', code: 'PLAN-DATE', bundlePriceCents: 1, effectiveFrom: '2026-11-01', effectiveTo: '2026-10-01' })).rejects.toMatchObject({ code: 'invalid_input' });
    expect(service.createPlanItem(plan.id, { serviceId: 'service-1', includedQuantity: 40, unitLabel: 'hour', overagePriceCents: 15000, overageBillingBasis: 'custom' })).rejects.toMatchObject({ code: 'invalid_input' });
  });
});
