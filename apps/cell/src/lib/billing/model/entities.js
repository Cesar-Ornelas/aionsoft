/** @typedef {'draft' | 'active' | 'paused' | 'expired' | 'cancelled'} BillingAgreementStatus */
/** @typedef {'none' | 'manual' | 'automatic'} BillingRenewalBehavior */
/** @typedef {'active' | 'ended' | 'cancelled'} BillingAgreementItemStatus */

/**
 * @typedef {Object} BillingAgreement
 * @property {string} id
 * @property {string} agreementNumber
 * @property {string} operationsAccountId
 * @property {string} companyId
 * @property {string} name
 * @property {BillingAgreementStatus} status
 * @property {string} effectiveFrom
 * @property {string} effectiveTo
 * @property {BillingRenewalBehavior} renewalBehavior
 * @property {string} cancelledAt
 * @property {string} cancellationReason
 * @property {string} notes
 * @property {BillingAgreementItem[]} items
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} BillingAgreementItem
 * @property {string} id
 * @property {string} agreementId
 * @property {string} serviceId
 * @property {string} planId
 * @property {number} quantity
 * @property {string} billingBasis
 * @property {string} unitLabel
 * @property {number} unitPriceCents
 * @property {number} bundlePriceCents
 * @property {string} currency
 * @property {string} effectiveFrom
 * @property {string} effectiveTo
 * @property {BillingAgreementItemStatus} status
 * @property {string} endedAt
 */

/** @typedef {Object} SaveBillingAgreementInput
 * @property {string} operationsAccountId
 * @property {string} [companyId]
 * @property {string} agreementNumber
 * @property {string} name
 * @property {BillingAgreementStatus} [status]
 * @property {string} [effectiveFrom]
 * @property {string} [effectiveTo]
 * @property {BillingRenewalBehavior} [renewalBehavior]
 * @property {string} [notes]
 */

/** @typedef {Object} SaveBillingAgreementItemInput
 * @property {string} agreementId
 * @property {string} [serviceId]
 * @property {string} [planId]
 * @property {number} [quantity]
 * @property {string} [billingBasis]
 * @property {string} [unitLabel]
 * @property {number} [unitPriceCents]
 * @property {number} [bundlePriceCents]
 * @property {string} [currency]
 * @property {string} [effectiveFrom]
 * @property {string} [effectiveTo]
 */

export {};
