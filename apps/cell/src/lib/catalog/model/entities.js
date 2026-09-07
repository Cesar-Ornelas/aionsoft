/**
 * @typedef {'active' | 'inactive' | 'archived'} CatalogServiceStatus
 * @typedef {'fixed' | 'hourly' | 'daily' | 'per_unit' | 'recurring'} CatalogBillingBasis
 * @typedef {'active' | 'inactive' | 'archived'} CatalogOfferStatus
 * @typedef {Object} CatalogPriceOffer
 * @property {string} id
 * @property {string} serviceId
 * @property {string} name
 * @property {CatalogBillingBasis} billingBasis
 * @property {string} unitLabel
 * @property {number} salePriceCents
 * @property {number} internalCostCents
 * @property {string} currency
 * @property {string} effectiveFrom
 * @property {string} effectiveTo
 * @property {CatalogOfferStatus} status
 * @property {string} createdAt
 * @property {string} updatedAt
 *
 * @typedef {Object} CatalogService
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} code
 * @property {number} customerPriceCents
 * @property {number} internalCostCents
 * @property {string} currency
 * @property {CatalogServiceStatus} status
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {CatalogPriceOffer[]} [priceOffers]
 *
 * @typedef {'monthly' | 'quarterly' | 'annual' | 'one_time'} CatalogPlanTermUnit
 * @typedef {'minimum_charge' | 'prepaid_allowance'} CatalogCommitmentEnforcement
 * @typedef {'forfeit' | 'carry_forward'} CatalogUnusedQuantityPolicy
 * @typedef {Object} CatalogPlanItem
 * @property {string} id
 * @property {string} planId
 * @property {string} serviceId
 * @property {number} includedQuantity
 * @property {number|null} overagePriceCents
 * @property {CatalogBillingBasis} [overageBillingBasis]
 * @property {string} unitLabel
 *
 * @typedef {Object} CatalogPlan
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} code
 * @property {number} bundlePriceCents
 * @property {string} currency
 * @property {CatalogPlanTermUnit} termUnit
 * @property {number} termQuantity
 * @property {CatalogCommitmentEnforcement} commitmentEnforcement
 * @property {CatalogUnusedQuantityPolicy} unusedQuantityPolicy
 * @property {string} effectiveFrom
 * @property {string} effectiveTo
 * @property {CatalogServiceStatus} status
 * @property {CatalogPlanItem[]} items
 *
 * @typedef {Object} SaveCatalogServiceInput
 * @property {string} name
 * @property {string} [description]
 * @property {string} code
 * @property {number} [customerPriceCents]
 * @property {number} [internalCostCents]
 * @property {string} [currency]
 * @property {CatalogServiceStatus} [status]
 * @property {CatalogPriceOfferInput[]} [priceOffers]
 *
 * @typedef {Object} CatalogPriceOfferInput
 * @property {string} [id]
 * @property {string} name
 * @property {CatalogBillingBasis} billingBasis
 * @property {string} unitLabel
 * @property {number} salePriceCents
 * @property {number} internalCostCents
 * @property {string} [currency]
 * @property {string} [effectiveFrom]
 * @property {string} [effectiveTo]
 * @property {CatalogOfferStatus} [status]
 *
 * @typedef {Object} CatalogServiceFilter
 * @property {string} [search]
 * @property {string} [status]
 * @property {number} [page]
 * @property {number} [pageSize]
 */

export {};
