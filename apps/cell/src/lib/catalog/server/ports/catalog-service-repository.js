/**
 * @typedef {Object} CatalogServiceRepository
 * @property {(filter: { search?: string, status?: string, page: number, pageSize: number }) => Promise<{ items: import('../../model/entities.js').CatalogService[], page: number, pageSize: number, totalItems: number, totalPages: number }>} list
 * @property {(id: string) => Promise<import('../../model/entities.js').CatalogService | null>} findById
 * @property {(code: string) => Promise<import('../../model/entities.js').CatalogService | null>} findByCode
 * @property {(input: import('../../model/entities.js').SaveCatalogServiceInput) => Promise<import('../../model/entities.js').CatalogService>} create
 * @property {(id: string, input: Partial<import('../../model/entities.js').SaveCatalogServiceInput>) => Promise<import('../../model/entities.js').CatalogService>} update
 * @property {(serviceId: string) => Promise<import('../../model/entities.js').CatalogPriceOffer[]>} listPriceOffers
 * @property {(serviceId: string, input: import('../../model/entities.js').CatalogPriceOfferInput) => Promise<import('../../model/entities.js').CatalogPriceOffer>} createPriceOffer
 * @property {(serviceId: string, offerId: string, input: Partial<import('../../model/entities.js').CatalogPriceOfferInput>) => Promise<import('../../model/entities.js').CatalogPriceOffer>} updatePriceOffer
 * @property {() => Promise<import('../../model/entities.js').CatalogPlan[]>} listPlans
 * @property {(input: Object) => Promise<import('../../model/entities.js').CatalogPlan>} createPlan
 * @property {(id: string, input: Object) => Promise<import('../../model/entities.js').CatalogPlan>} updatePlan
 * @property {(planId: string, input: Object) => Promise<import('../../model/entities.js').CatalogPlanItem>} createPlanItem
 * @property {(planId: string, itemId: string, input: Object) => Promise<import('../../model/entities.js').CatalogPlanItem>} updatePlanItem
 */

export {};
