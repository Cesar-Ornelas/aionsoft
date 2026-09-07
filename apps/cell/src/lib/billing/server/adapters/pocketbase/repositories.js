import { BillingDataAccessError } from '../../../model/data-access-error.js';

const AGREEMENTS = 'billing_agreements';
const ITEMS = 'billing_agreement_items';

function agreementFromRecord(record) {
  return {
    id: record.id,
    agreementNumber: record.agreement_number,
    operationsAccountId: record.operations_account || '',
    companyId: record.company || '',
    name: record.name,
    status: record.status,
    effectiveFrom: record.effective_from || '',
    effectiveTo: record.effective_to || '',
    renewalBehavior: record.renewal_behavior || 'none',
    cancelledAt: record.cancelled_at || '',
    cancellationReason: record.cancellation_reason || '',
    notes: record.notes || '',
    createdAt: record.created || '',
    updatedAt: record.updated || ''
  };
}

function itemFromRecord(record) {
  return {
    id: record.id,
    agreementId: record.agreement,
    serviceId: record.service || '',
    planId: record.plan || '',
    offerId: record.offer || '',
    quantity: Number(record.quantity || 1),
    billingBasis: record.billing_basis,
    unitLabel: record.unit_label,
    unitPriceCents: Number(record.unit_price_cents || 0),
    bundlePriceCents: Number(record.bundle_price_cents || 0),
    currency: record.currency || 'USD',
    effectiveFrom: record.effective_from || '',
    effectiveTo: record.effective_to || '',
    status: record.status,
    endedAt: record.ended_at || ''
  };
}

function translateError(error, message) {
  if (error instanceof BillingDataAccessError) return error;
  const status = Number(error?.status ?? error?.response?.status);
  if (status === 404) return new BillingDataAccessError('NOT_FOUND', message, { cause: error });
  if (status === 400) return new BillingDataAccessError('INVALID_INPUT', message, { cause: error });
  return new BillingDataAccessError('UNAVAILABLE', message, { cause: error });
}

export function createPocketBaseBillingAgreementRepository(client) {
  const agreements = client.collection(AGREEMENTS);
  const items = client.collection(ITEMS);
  return {
    async list(filter = {}) {
      try {
        const clauses = [];
        if (filter.operationsAccountId) clauses.push(client.filter('operations_account = {:account}', { account: filter.operationsAccountId }));
        if (filter.status) clauses.push(client.filter('status = {:status}', { status: filter.status }));
        return (await agreements.getFullList({ filter: clauses.join(' && '), sort: '-effective_from,agreement_number' })).map(agreementFromRecord);
      } catch (error) { throw translateError(error, 'Unable to list billing agreements.'); }
    },
    async findById(id) {
      try { return agreementFromRecord(await agreements.getOne(id)); }
      catch (error) { if (Number(error?.status) === 404) return null; throw translateError(error, 'Unable to load the billing agreement.'); }
    },
    async create(input) {
      try {
        return agreementFromRecord(await agreements.create({
          agreement_number: input.agreementNumber,
          operations_account: input.operationsAccountId,
          company: input.companyId || '',
          name: input.name,
          status: input.status,
          effective_from: input.effectiveFrom || '',
          effective_to: input.effectiveTo || '',
          renewal_behavior: input.renewalBehavior,
          notes: input.notes || ''
        }));
      } catch (error) { throw translateError(error, 'Unable to create the billing agreement.'); }
    },
    async update(id, input) {
      try {
        return agreementFromRecord(await agreements.update(id, {
          ...(input.status !== undefined && { status: input.status }),
          ...(input.cancelledAt !== undefined && { cancelled_at: input.cancelledAt }),
          ...(input.cancellationReason !== undefined && { cancellation_reason: input.cancellationReason }),
          ...(input.notes !== undefined && { notes: input.notes })
        }));
      } catch (error) { throw translateError(error, 'Unable to update the billing agreement.'); }
    },
    async listItems(agreementId) {
      try { return (await items.getFullList({ filter: client.filter('agreement = {:agreement}', { agreement: agreementId }), sort: 'effective_from' })).map(itemFromRecord); }
      catch (error) { throw translateError(error, 'Unable to list billing agreement items.'); }
    },
    async findItemById(id) {
      try { return itemFromRecord(await items.getOne(id)); }
      catch (error) { if (Number(error?.status) === 404) return null; throw translateError(error, 'Unable to load the billing agreement item.'); }
    },
    async createItem(input) {
      try {
        return itemFromRecord(await items.create({
          agreement: input.agreementId,
          service: input.serviceId || '',
          plan: input.planId || '',
          offer: input.offerId || '',
          quantity: input.quantity,
          billing_basis: input.billingBasis,
          unit_label: input.unitLabel,
          unit_price_cents: input.unitPriceCents,
          bundle_price_cents: input.bundlePriceCents,
          currency: input.currency,
          effective_from: input.effectiveFrom || '',
          effective_to: input.effectiveTo || '',
          status: input.status
        }));
      } catch (error) { throw translateError(error, 'Unable to create the billing agreement item.'); }
    },
    async updateItem(id, input) {
      try {
        return itemFromRecord(await items.update(id, {
          ...(input.status !== undefined && { status: input.status }),
          ...(input.effectiveFrom !== undefined && { effective_from: input.effectiveFrom }),
          ...(input.effectiveTo !== undefined && { effective_to: input.effectiveTo }),
          ...(input.endedAt !== undefined && { ended_at: input.endedAt })
        }));
      } catch (error) { throw translateError(error, 'Unable to update the billing agreement item.'); }
    }
  };
}
