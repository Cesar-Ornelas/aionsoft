import { CatalogDataAccessError } from '../../../model/data-access-error.js';

const COLLECTION = 'catalog_services';
const PRICE_OFFERS_COLLECTION = 'catalog_price_offers';
const PLANS_COLLECTION = 'catalog_plans';
const PLAN_ITEMS_COLLECTION = 'catalog_plan_items';

function clean(value) {
  return String(value ?? '').trim();
}

function fromRecord(record) {
  return {
    id: record.id,
    name: record.name,
    description: record.description || '',
    code: record.code,
    customerPriceCents: Number(record.customer_price_cents || 0),
    internalCostCents: Number(record.internal_cost_cents || 0),
    currency: record.currency || 'USD',
    status: record.status,
    createdAt: record.created || '',
    updatedAt: record.updated || record.created || ''
  };
}

function offerFromRecord(record) {
  return {
    id: record.id,
    serviceId: record.service,
    name: record.name,
    billingBasis: record.billing_basis,
    unitLabel: record.unit_label,
    salePriceCents: Number(record.sale_price_cents || 0),
    internalCostCents: Number(record.internal_cost_cents || 0),
    currency: record.currency || 'USD',
    effectiveFrom: record.effective_from || '',
    effectiveTo: record.effective_to || '',
    status: record.status,
    createdAt: record.created || '',
    updatedAt: record.updated || record.created || ''
  };
}

function planFromRecord(record, items = []) {
  return {
    id: record.id,
    name: record.name,
    description: record.description || '',
    code: record.code,
    bundlePriceCents: Number(record.bundle_price_cents || 0),
    currency: record.currency || 'USD',
    termUnit: record.term_unit,
    termQuantity: Number(record.term_quantity || 1),
    commitmentEnforcement: record.commitment_enforcement || 'minimum_charge',
    unusedQuantityPolicy: record.unused_quantity_policy || 'forfeit',
    effectiveFrom: record.effective_from || '',
    effectiveTo: record.effective_to || '',
    status: record.status,
    items,
    createdAt: record.created || '',
    updatedAt: record.updated || record.created || ''
  };
}

function planItemFromRecord(record) {
  return {
    id: record.id,
    planId: record.plan,
    serviceId: record.service || '',
    priceOfferId: record.price_offer || '',
    includedQuantity: Number(record.included_quantity || 0),
    overagePriceCents: record.overage_price_cents === '' ? null : Number(record.overage_price_cents ?? 0),
    overageBillingBasis: record.overage_billing_basis || '',
    unitLabel: record.unit_label
  };
}

function translateError(error, message) {
  if (error instanceof CatalogDataAccessError) return error;
  const status = Number(error?.status ?? error?.response?.status);
  if (status === 404) return new CatalogDataAccessError('NOT_FOUND', message, { cause: error });
  if (status === 400) return new CatalogDataAccessError('INVALID_INPUT', message, { cause: error });
  return new CatalogDataAccessError('UNAVAILABLE', message, { cause: error });
}

export function createPocketBaseCatalogServiceRepository(client) {
  const records = client.collection(COLLECTION);
  const priceOffers = client.collection(PRICE_OFFERS_COLLECTION);
  const plans = client.collection(PLANS_COLLECTION);
  const planItems = client.collection(PLAN_ITEMS_COLLECTION);

  return {
    async list(filter) {
      try {
        const clauses = [];
        if (filter.search) {
          clauses.push(client.filter('(name ~ {:search} || code ~ {:search} || description ~ {:search})', { search: filter.search }));
        }
        if (filter.status) clauses.push(client.filter('status = {:status}', { status: filter.status }));
        const result = await records.getList(filter.page, filter.pageSize, {
          filter: clauses.join(' && '),
          sort: 'name'
        });
        return {
          items: result.items.map(fromRecord),
          page: result.page,
          pageSize: result.perPage,
          totalItems: result.totalItems,
          totalPages: result.totalPages
        };
      } catch (error) {
        throw translateError(error, 'Unable to list catalog services.');
      }
    },

    async findById(id) {
      try {
        return fromRecord(await records.getOne(id));
      } catch (error) {
        if (Number(error?.status) === 404) return null;
        throw translateError(error, 'Unable to load the catalog service.');
      }
    },

    async findByCode(code) {
      try {
        return fromRecord(await records.getFirstListItem(client.filter('code = {:code}', { code })));
      } catch (error) {
        if (Number(error?.status) === 404) return null;
        throw translateError(error, 'Unable to inspect the catalog service code.');
      }
    },

    async create(input) {
      try {
        return fromRecord(await records.create({
          name: input.name,
          description: input.description || '',
          code: input.code,
          customer_price_cents: input.customerPriceCents ?? 0,
          internal_cost_cents: input.internalCostCents ?? 0,
          currency: input.currency,
          status: input.status
        }));
      } catch (error) {
        throw translateError(error, 'Unable to create the catalog service.');
      }
    },

    async update(id, input) {
      try {
        return fromRecord(await records.update(id, {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.code !== undefined && { code: input.code }),
          ...(input.customerPriceCents !== undefined && { customer_price_cents: input.customerPriceCents }),
          ...(input.internalCostCents !== undefined && { internal_cost_cents: input.internalCostCents }),
          ...(input.currency !== undefined && { currency: input.currency }),
          ...(input.status !== undefined && { status: input.status })
        }));
      } catch (error) {
        throw translateError(error, 'Unable to update the catalog service.');
      }
    },

    async listPriceOffers(serviceId) {
      try {
        const items = await priceOffers.getFullList({
          filter: client.filter('service = {:serviceId}', { serviceId }),
          sort: 'effective_from,name'
        });
        return items.map(offerFromRecord);
      } catch (error) {
        throw translateError(error, 'Unable to list service pricing offers.');
      }
    },

    async createPriceOffer(serviceId, input) {
      try {
        return offerFromRecord(await priceOffers.create({
          service: serviceId,
          name: input.name,
          billing_basis: input.billingBasis,
          unit_label: input.unitLabel,
          sale_price_cents: input.salePriceCents ?? 0,
          internal_cost_cents: input.internalCostCents ?? 0,
          currency: input.currency,
          effective_from: input.effectiveFrom || '',
          effective_to: input.effectiveTo || '',
          status: input.status
        }));
      } catch (error) {
        throw translateError(error, 'Unable to create the service pricing offer.');
      }
    },

    async updatePriceOffer(serviceId, offerId, input) {
      try {
        const existing = await priceOffers.getOne(offerId);
        if (existing.service !== serviceId) throw new CatalogDataAccessError('NOT_FOUND', 'Pricing offer was not found.');
        return offerFromRecord(await priceOffers.update(offerId, {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.billingBasis !== undefined && { billing_basis: input.billingBasis }),
          ...(input.unitLabel !== undefined && { unit_label: input.unitLabel }),
          ...(input.salePriceCents !== undefined && { sale_price_cents: input.salePriceCents }),
          ...(input.internalCostCents !== undefined && { internal_cost_cents: input.internalCostCents }),
          ...(input.currency !== undefined && { currency: input.currency }),
          ...(input.effectiveFrom !== undefined && { effective_from: input.effectiveFrom }),
          ...(input.effectiveTo !== undefined && { effective_to: input.effectiveTo }),
          ...(input.status !== undefined && { status: input.status })
        }));
      } catch (error) {
        if (error instanceof CatalogDataAccessError) throw error;
        throw translateError(error, 'Unable to update the service pricing offer.');
      }
    },

    async listPlans() {
      try {
        const recordsList = await plans.getFullList({ sort: 'name' });
        const items = await planItems.getFullList({ sort: 'created' });
        return recordsList.map((record) => planFromRecord(record, items.filter((item) => item.plan === record.id).map(planItemFromRecord)));
      } catch (error) {
        throw translateError(error, 'Unable to list catalog plans.');
      }
    },

    async createPlan(input) {
      try {
        return planFromRecord(await plans.create({
          name: input.name,
          description: input.description || '',
          code: input.code,
          bundle_price_cents: input.bundlePriceCents,
          currency: input.currency,
          term_unit: input.termUnit,
          term_quantity: input.termQuantity,
          commitment_enforcement: input.commitmentEnforcement,
          unused_quantity_policy: input.unusedQuantityPolicy,
          effective_from: input.effectiveFrom || '',
          effective_to: input.effectiveTo || '',
          status: input.status
        }));
      } catch (error) {
        throw translateError(error, 'Unable to create the catalog plan.');
      }
    },

    async updatePlan(id, input) {
      try {
        return planFromRecord(await plans.update(id, {
          name: input.name,
          description: input.description || '',
          code: input.code,
          bundle_price_cents: input.bundlePriceCents,
          currency: input.currency,
          term_unit: input.termUnit,
          term_quantity: input.termQuantity,
          commitment_enforcement: input.commitmentEnforcement,
          unused_quantity_policy: input.unusedQuantityPolicy,
          effective_from: input.effectiveFrom || '',
          effective_to: input.effectiveTo || '',
          status: input.status
        }));
      } catch (error) {
        throw translateError(error, 'Unable to update the catalog plan.');
      }
    },

    async createPlanItem(planId, input) {
      try {
        return planItemFromRecord(await planItems.create({
          plan: planId,
          service: input.serviceId || '',
          price_offer: input.priceOfferId || '',
          included_quantity: input.includedQuantity,
          overage_price_cents: input.overagePriceCents ?? '',
          overage_billing_basis: input.overageBillingBasis || '',
          unit_label: input.unitLabel
        }));
      } catch (error) {
        throw translateError(error, 'Unable to add the catalog plan item.');
      }
    },

    async updatePlanItem(planId, itemId, input) {
      try {
        const existing = await planItems.getOne(itemId);
        if (existing.plan !== planId) throw new CatalogDataAccessError('NOT_FOUND', 'Catalog plan item was not found.');
        return planItemFromRecord(await planItems.update(itemId, {
          service: input.serviceId || '',
          price_offer: input.priceOfferId || '',
          included_quantity: input.includedQuantity,
          overage_price_cents: input.overagePriceCents ?? '',
          overage_billing_basis: input.overageBillingBasis || '',
          unit_label: input.unitLabel
        }));
      } catch (error) {
        if (error instanceof CatalogDataAccessError) throw error;
        throw translateError(error, 'Unable to update the catalog plan item.');
      }
    }
  };
}
