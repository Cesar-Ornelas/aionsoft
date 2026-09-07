import { BillingDataAccessError } from '../../model/data-access-error.js';

const STATUSES = new Set(['draft', 'active', 'paused', 'expired', 'cancelled']);
const ITEM_STATUSES = new Set(['active', 'ended', 'cancelled']);
const RENEWAL_BEHAVIORS = new Set(['none', 'manual', 'automatic']);
const TERMINAL_STATUSES = new Set(['expired', 'cancelled']);
const TRANSITIONS = {
  draft: new Set(['draft', 'active', 'cancelled']),
  active: new Set(['active', 'paused', 'expired', 'cancelled']),
  paused: new Set(['paused', 'active', 'expired', 'cancelled']),
  expired: new Set(['expired']),
  cancelled: new Set(['cancelled'])
};

const clean = (value) => String(value ?? '').trim();
const validDate = (value) => !value || !Number.isNaN(new Date(value).getTime());
const normalizeMoney = (value) => {
  const amount = Number(value);
  if (!Number.isInteger(amount) || amount < 0) throw new BillingDataAccessError('INVALID_INPUT', 'Prices must be non-negative whole cents.');
  return amount;
};

function validateDates(from, to, label = 'Agreement') {
  if (!validDate(from) || !validDate(to)) throw new BillingDataAccessError('INVALID_INPUT', `${label} dates must be valid dates.`);
  if (from && to && new Date(to) < new Date(from)) throw new BillingDataAccessError('INVALID_INPUT', `${label} end date must be on or after its start date.`);
}

function normalizeAgreement(input) {
  const normalized = {
    operationsAccountId: clean(input.operationsAccountId),
    companyId: clean(input.companyId),
    agreementNumber: clean(input.agreementNumber),
    name: clean(input.name),
    status: input.status ?? 'draft',
    effectiveFrom: clean(input.effectiveFrom),
    effectiveTo: clean(input.effectiveTo),
    renewalBehavior: input.renewalBehavior ?? 'none',
    notes: clean(input.notes)
  };
  if (!normalized.operationsAccountId || !normalized.agreementNumber || !normalized.name) throw new BillingDataAccessError('INVALID_INPUT', 'Account, agreement number, and name are required.');
  if (!STATUSES.has(normalized.status) || !RENEWAL_BEHAVIORS.has(normalized.renewalBehavior)) throw new BillingDataAccessError('INVALID_INPUT', 'Agreement status or renewal behavior is invalid.');
  validateDates(normalized.effectiveFrom, normalized.effectiveTo);
  return normalized;
}

function normalizeItem(input) {
  const item = {
    agreementId: clean(input.agreementId),
    serviceId: clean(input.serviceId),
    planId: clean(input.planId),
    quantity: Number(input.quantity ?? 1),
    billingBasis: clean(input.billingBasis || 'fixed'),
    unitLabel: clean(input.unitLabel || 'unit'),
    unitPriceCents: normalizeMoney(input.unitPriceCents ?? 0),
    bundlePriceCents: normalizeMoney(input.bundlePriceCents ?? 0),
    currency: clean(input.currency || 'USD').toUpperCase(),
    effectiveFrom: clean(input.effectiveFrom),
    effectiveTo: clean(input.effectiveTo),
    status: input.status ?? 'active'
  };
  if (!normalizedSourceCount(item) || normalizedSourceCount(item) > 1) throw new BillingDataAccessError('INVALID_INPUT', 'An agreement item must reference exactly one service or plan.');
  if (!item.agreementId || !Number.isInteger(item.quantity) || item.quantity < 1 || !item.unitLabel || !ITEM_STATUSES.has(item.status)) throw new BillingDataAccessError('INVALID_INPUT', 'Agreement item details are invalid.');
  validateDates(item.effectiveFrom, item.effectiveTo, 'Agreement item');
  return item;
}

function normalizedSourceCount(item) {
  return Number(Boolean(item.serviceId)) + Number(Boolean(item.planId));
}

function snapshotService(service, offer) {
  return {
    billingBasis: offer?.billingBasis ?? 'fixed',
    unitLabel: offer?.unitLabel ?? 'service',
    unitPriceCents: offer?.salePriceCents ?? service.customerPriceCents,
    bundlePriceCents: 0,
    currency: offer?.currency ?? service.currency
  };
}

function snapshotPlan(plan) {
  return {
    billingBasis: 'recurring',
    unitLabel: plan.termUnit,
    unitPriceCents: 0,
    bundlePriceCents: plan.bundlePriceCents,
    currency: plan.currency
  };
}

export function createBillingAgreementService(repository, dependencies = {}) {
  const operationsAccounts = dependencies.operationsAccounts;
  const catalog = dependencies.catalog;

  return {
    async list(filter = {}) {
      return repository.list({ operationsAccountId: clean(filter.operationsAccountId), status: clean(filter.status) });
    },

    async get(id) {
      const agreement = await repository.findById(clean(id));
      if (!agreement) throw new BillingDataAccessError('NOT_FOUND', 'Billing agreement was not found.');
      return { ...agreement, items: await repository.listItems(agreement.id) };
    },

    async create(input) {
      const normalized = normalizeAgreement(input);
      if (operationsAccounts && !(await operationsAccounts.findById(normalized.operationsAccountId))) throw new BillingDataAccessError('NOT_FOUND', 'Operations account was not found.');
      return repository.create(normalized);
    },

    async transition(id, status) {
      if (!STATUSES.has(status)) throw new BillingDataAccessError('INVALID_INPUT', 'Agreement status is invalid.');
      const existing = await this.get(id);
      if (!TRANSITIONS[existing.status]?.has(status)) throw new BillingDataAccessError('CONFLICT', `Cannot move an agreement from ${existing.status} to ${status}.`);
      return repository.update(existing.id, { status, ...(status === 'cancelled' ? { cancelledAt: new Date().toISOString() } : {}) });
    },

    async addItem(input) {
      const existingAgreement = await this.get(input.agreementId);
      if (TERMINAL_STATUSES.has(existingAgreement.status)) throw new BillingDataAccessError('CONFLICT', 'Items cannot be added to a terminal agreement.');
      const normalized = normalizeItem(input);
      let snapshot = normalized;
      if (catalog && normalized.serviceId) {
        const service = await catalog.get(normalized.serviceId);
        const offers = input.offerId ? await catalog.listPriceOffers(service.id) : [];
        const offer = offers.find((entry) => entry.id === input.offerId);
        if (input.offerId && !offer) throw new BillingDataAccessError('NOT_FOUND', 'Catalog pricing offer was not found.');
        snapshot = { ...normalized, ...snapshotService(service, offer) };
      }
      if (catalog && normalized.planId) {
        const plan = (await catalog.listPlans()).find((entry) => entry.id === normalized.planId);
        if (!plan) throw new BillingDataAccessError('NOT_FOUND', 'Catalog plan was not found.');
        snapshot = { ...normalized, ...snapshotPlan(plan) };
      }
      return repository.createItem(snapshot);
    },

    async updateItem(id, input) {
      const existing = await repository.findItemById?.(id);
      if (!existing) throw new BillingDataAccessError('NOT_FOUND', 'Billing agreement item was not found.');
      const next = { ...input };
      if (next.effectiveFrom !== undefined || next.effectiveTo !== undefined) validateDates(next.effectiveFrom ?? existing.effectiveFrom, next.effectiveTo ?? existing.effectiveTo, 'Agreement item');
      if (next.status !== undefined && !ITEM_STATUSES.has(next.status)) throw new BillingDataAccessError('INVALID_INPUT', 'Agreement item status is invalid.');
      return repository.updateItem(id, next);
    }
  };
}
