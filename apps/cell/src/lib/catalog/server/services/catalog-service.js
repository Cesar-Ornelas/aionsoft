import { CatalogDataAccessError } from '../../model/data-access-error.js';

const STATUSES = new Set(['active', 'inactive', 'archived']);
const CURRENCIES = new Set(['USD']);
const SORTED_STATUS = new Set(['active', 'inactive', 'archived']);
const BILLING_BASES = new Set(['fixed', 'hourly', 'daily', 'per_unit', 'recurring']);
const PLAN_TERM_UNITS = new Set(['monthly', 'quarterly', 'annual', 'one_time']);
const COMMITMENT_ENFORCEMENTS = new Set(['minimum_charge', 'prepaid_allowance']);
const UNUSED_QUANTITY_POLICIES = new Set(['forfeit', 'carry_forward']);

function clean(value) {
  return String(value ?? '').trim();
}

function normalizeCode(value) {
  return clean(value).toUpperCase();
}

function normalizeMoney(value, fallback = 0) {
  const amount = Number(value ?? fallback);
  if (!Number.isInteger(amount) || amount < 0) {
    throw new CatalogDataAccessError('INVALID_INPUT', 'Prices and costs must be non-negative whole cents.');
  }
  return amount;
}

function normalizeInput(input) {
  return {
    ...(input.name !== undefined && { name: clean(input.name) }),
    ...(input.description !== undefined && { description: clean(input.description) }),
    ...(input.code !== undefined && { code: normalizeCode(input.code) }),
    ...(input.customerPriceCents !== undefined && { customerPriceCents: normalizeMoney(input.customerPriceCents) }),
    ...(input.internalCostCents !== undefined && { internalCostCents: normalizeMoney(input.internalCostCents) }),
    ...(input.currency !== undefined && { currency: clean(input.currency).toUpperCase() }),
    ...(input.status !== undefined && { status: input.status }),
    ...(input.priceOffers !== undefined && { priceOffers: input.priceOffers })
  };
}

function validateInput(input) {
  if (input.name !== undefined && !clean(input.name)) {
    throw new CatalogDataAccessError('INVALID_INPUT', 'Service name is required.');
  }
  if (input.code !== undefined && !/^[A-Z0-9][A-Z0-9_-]{1,31}$/.test(normalizeCode(input.code))) {
    throw new CatalogDataAccessError('INVALID_INPUT', 'Code must be 2-32 characters using letters, numbers, hyphens, or underscores.');
  }
  if (input.currency !== undefined && !CURRENCIES.has(String(input.currency).toUpperCase())) {
    throw new CatalogDataAccessError('INVALID_INPUT', 'Only USD currency is currently supported.');
  }
  if (input.status !== undefined && !STATUSES.has(input.status)) {
    throw new CatalogDataAccessError('INVALID_INPUT', 'Service status is invalid.');
  }
}

function normalizeOffer(input) {
  return {
    ...(input.name !== undefined && { name: clean(input.name) }),
    ...(input.billingBasis !== undefined && { billingBasis: input.billingBasis }),
    ...(input.unitLabel !== undefined && { unitLabel: clean(input.unitLabel) }),
    ...(input.salePriceCents !== undefined && { salePriceCents: normalizeMoney(input.salePriceCents) }),
    ...(input.internalCostCents !== undefined && { internalCostCents: normalizeMoney(input.internalCostCents) }),
    ...(input.currency !== undefined && { currency: clean(input.currency).toUpperCase() }),
    ...(input.effectiveFrom !== undefined && { effectiveFrom: clean(input.effectiveFrom) }),
    ...(input.effectiveTo !== undefined && { effectiveTo: clean(input.effectiveTo) }),
    ...(input.status !== undefined && { status: input.status })
  };
}

function validateOffer(input) {
  if (!input.name) throw new CatalogDataAccessError('INVALID_INPUT', 'Pricing offer name is required.');
  if (!BILLING_BASES.has(input.billingBasis)) throw new CatalogDataAccessError('INVALID_INPUT', 'Pricing model is invalid.');
  if (!input.unitLabel) throw new CatalogDataAccessError('INVALID_INPUT', 'Pricing unit is required.');
  if (input.currency !== undefined && !CURRENCIES.has(input.currency)) throw new CatalogDataAccessError('INVALID_INPUT', 'Only USD currency is currently supported.');
  if (input.status !== undefined && !STATUSES.has(input.status)) throw new CatalogDataAccessError('INVALID_INPUT', 'Pricing offer status is invalid.');
  for (const dateValue of [input.effectiveFrom, input.effectiveTo].filter(Boolean)) {
    if (Number.isNaN(new Date(dateValue).getTime())) throw new CatalogDataAccessError('INVALID_INPUT', 'Pricing offer dates must be valid dates.');
  }
  if (input.effectiveFrom && input.effectiveTo && new Date(input.effectiveTo) < new Date(input.effectiveFrom)) {
    throw new CatalogDataAccessError('INVALID_INPUT', 'Pricing offer end date must be on or after its start date.');
  }
}

function normalizePlan(input) {
  return {
    name: clean(input.name),
    description: clean(input.description),
    code: normalizeCode(input.code),
    bundlePriceCents: normalizeMoney(input.bundlePriceCents),
    currency: clean(input.currency || 'USD').toUpperCase(),
    termUnit: input.termUnit || 'one_time',
    termQuantity: Number(input.termQuantity ?? 1),
    commitmentEnforcement: input.commitmentEnforcement || 'minimum_charge',
    unusedQuantityPolicy: input.unusedQuantityPolicy || 'forfeit',
    effectiveFrom: clean(input.effectiveFrom),
    effectiveTo: clean(input.effectiveTo),
    status: input.status || 'active'
  };
}

function validatePlan(input) {
  if (!input.name || !/^[A-Z0-9][A-Z0-9_-]{1,31}$/.test(input.code)) throw new CatalogDataAccessError('INVALID_INPUT', 'Plan name and a valid code are required.');
  if (!CURRENCIES.has(input.currency)) throw new CatalogDataAccessError('INVALID_INPUT', 'Only USD currency is currently supported.');
  if (!PLAN_TERM_UNITS.has(input.termUnit) || !Number.isInteger(input.termQuantity) || input.termQuantity < 1) throw new CatalogDataAccessError('INVALID_INPUT', 'Plan term must use a valid unit and positive quantity.');
  if (!COMMITMENT_ENFORCEMENTS.has(input.commitmentEnforcement)) throw new CatalogDataAccessError('INVALID_INPUT', 'Plan commitment enforcement is invalid.');
  if (!UNUSED_QUANTITY_POLICIES.has(input.unusedQuantityPolicy)) throw new CatalogDataAccessError('INVALID_INPUT', 'Plan unused quantity policy is invalid.');
  for (const dateValue of [input.effectiveFrom, input.effectiveTo].filter(Boolean)) {
    if (Number.isNaN(new Date(dateValue).getTime())) throw new CatalogDataAccessError('INVALID_INPUT', 'Plan dates must be valid dates.');
  }
  if (input.effectiveFrom && input.effectiveTo && new Date(input.effectiveTo) < new Date(input.effectiveFrom)) throw new CatalogDataAccessError('INVALID_INPUT', 'Plan end date must be on or after its start date.');
  if (!STATUSES.has(input.status)) throw new CatalogDataAccessError('INVALID_INPUT', 'Plan status is invalid.');
}

export function createCatalogService(repository) {
  return {
    async list(filter = {}) {
      const page = Math.max(1, Number(filter.page) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(filter.pageSize) || 25));
      const status = SORTED_STATUS.has(filter.status) ? filter.status : '';
      return repository.list({ search: clean(filter.search), status, page, pageSize });
    },

    async get(id) {
      const service = await repository.findById(clean(id));
      if (!service) throw new CatalogDataAccessError('NOT_FOUND', 'Service was not found.');
      return service;
    },

    async create(input) {
      const normalized = normalizeInput(input);
      validateInput(normalized);
      if (!normalized.name) throw new CatalogDataAccessError('INVALID_INPUT', 'Service name is required.');
      if (!normalized.code) throw new CatalogDataAccessError('INVALID_INPUT', 'Service code is required.');
      if (await repository.findByCode(normalized.code)) {
        throw new CatalogDataAccessError('CONFLICT', 'A service with this code already exists.');
      }
      const { priceOffers, ...serviceInput } = normalized;
      const created = await repository.create({
        ...serviceInput,
        customerPriceCents: normalized.customerPriceCents ?? 0,
        internalCostCents: normalized.internalCostCents ?? 0,
        currency: normalized.currency ?? 'USD',
        status: normalized.status ?? 'active'
      });
      for (const offer of priceOffers ?? []) {
          const normalizedOffer = normalizeOffer(offer);
        validateOffer(normalizedOffer);
        await repository.createPriceOffer(created.id, {
          ...normalizedOffer,
          salePriceCents: normalizedOffer.salePriceCents ?? 0,
          internalCostCents: normalizedOffer.internalCostCents ?? 0,
          currency: normalizedOffer.currency ?? created.currency,
          status: normalizedOffer.status ?? 'active'
        });
      }
      return created;
    },

    async update(id, input) {
      const serviceId = clean(id);
      const existing = await repository.findById(serviceId);
      if (!existing) throw new CatalogDataAccessError('NOT_FOUND', 'Service was not found.');
      const normalized = normalizeInput(input);
      validateInput(normalized);
      if (normalized.code && normalized.code !== existing.code && await repository.findByCode(normalized.code)) {
        throw new CatalogDataAccessError('CONFLICT', 'A service with this code already exists.');
      }
      return repository.update(serviceId, normalized);
    },

    async archive(id) {
      return this.update(id, { status: 'archived' });
    },

    async listPriceOffers(serviceId) {
      const service = await this.get(serviceId);
      return repository.listPriceOffers(service.id);
    },

    async createPriceOffer(serviceId, input) {
      const service = await this.get(serviceId);
      const normalized = normalizeOffer(input);
      validateOffer(normalized);
      return repository.createPriceOffer(service.id, {
        ...normalized,
        salePriceCents: normalized.salePriceCents ?? 0,
        internalCostCents: normalized.internalCostCents ?? 0,
        currency: normalized.currency ?? 'USD',
        status: normalized.status ?? 'active'
      });
    },

    async updatePriceOffer(serviceId, offerId, input) {
      const service = await this.get(serviceId);
      const normalized = normalizeOffer(input);
      const existing = (await repository.listPriceOffers(service.id)).find((offer) => offer.id === offerId);
      if (!existing) throw new CatalogDataAccessError('NOT_FOUND', 'Pricing offer was not found.');
      const merged = { ...existing, ...normalized };
      validateOffer(merged);
      return repository.updatePriceOffer(service.id, offerId, normalized);
    },

    async listPlans() {
      return repository.listPlans();
    },

    async createPlan(input) {
      const normalized = normalizePlan(input);
      validatePlan(normalized);
      return repository.createPlan(normalized);
    },

    async updatePlan(id, input) {
      const planId = clean(id);
      const existing = (await repository.listPlans()).find((plan) => plan.id === planId);
      if (!existing) throw new CatalogDataAccessError('NOT_FOUND', 'Catalog plan was not found.');
      const normalized = normalizePlan({ ...existing, ...input });
      validatePlan(normalized);
      if (normalized.code !== existing.code) {
        const duplicate = (await repository.listPlans()).find((plan) => plan.code === normalized.code && plan.id !== planId);
        if (duplicate) throw new CatalogDataAccessError('CONFLICT', 'A plan with this code already exists.');
      }
      return repository.updatePlan(planId, normalized);
    },

    async createPlanItem(planId, input) {
      const includedQuantity = Number(input.includedQuantity);
      if (!clean(planId) || (!input.serviceId && !input.priceOfferId) || !Number.isFinite(includedQuantity) || includedQuantity <= 0) {
        throw new CatalogDataAccessError('INVALID_INPUT', 'A plan item needs a service or offer and a positive included quantity.');
      }
      const overagePriceCents = input.overagePriceCents === null || input.overagePriceCents === undefined || input.overagePriceCents === ''
        ? null
        : normalizeMoney(input.overagePriceCents);
      if (!clean(input.unitLabel)) throw new CatalogDataAccessError('INVALID_INPUT', 'A plan item unit label is required.');
      if (overagePriceCents !== null && !BILLING_BASES.has(input.overageBillingBasis)) throw new CatalogDataAccessError('INVALID_INPUT', 'Overage billing basis is invalid.');
      return repository.createPlanItem(planId, {
        ...input,
        includedQuantity,
        overagePriceCents,
        unitLabel: clean(input.unitLabel)
      });
    },

    async updatePlanItem(planId, itemId, input) {
      const plan = (await repository.listPlans()).find((entry) => entry.id === clean(planId));
      const existing = plan?.items.find((item) => item.id === itemId);
      if (!existing) throw new CatalogDataAccessError('NOT_FOUND', 'Catalog plan item was not found.');
      const merged = { ...existing, ...input };
      const includedQuantity = Number(merged.includedQuantity);
      if (!Number.isFinite(includedQuantity) || includedQuantity <= 0 || (!merged.serviceId && !merged.priceOfferId)) {
        throw new CatalogDataAccessError('INVALID_INPUT', 'A plan item needs a service or offer and a positive included quantity.');
      }
      const overagePriceCents = merged.overagePriceCents === null || merged.overagePriceCents === undefined || merged.overagePriceCents === ''
        ? null
        : normalizeMoney(merged.overagePriceCents);
      if (!clean(merged.unitLabel)) throw new CatalogDataAccessError('INVALID_INPUT', 'A plan item unit label is required.');
      if (overagePriceCents !== null && !BILLING_BASES.has(merged.overageBillingBasis)) throw new CatalogDataAccessError('INVALID_INPUT', 'Overage billing basis is invalid.');
      return repository.updatePlanItem(planId, itemId, {
        serviceId: merged.serviceId,
        priceOfferId: merged.priceOfferId,
        includedQuantity,
        overagePriceCents,
        overageBillingBasis: merged.overageBillingBasis,
        unitLabel: clean(merged.unitLabel)
      });
    }
  };
}
