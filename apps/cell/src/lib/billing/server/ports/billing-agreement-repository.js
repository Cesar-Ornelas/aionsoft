/**
 * @typedef {Object} BillingAgreementRepository
 * @property {(filter: { operationsAccountId?: string, status?: string }) => Promise<import('../../model/entities.js').BillingAgreement[]>} list
 * @property {(id: string) => Promise<import('../../model/entities.js').BillingAgreement | null>} findById
 * @property {(input: import('../../model/entities.js').SaveBillingAgreementInput) => Promise<import('../../model/entities.js').BillingAgreement>} create
 * @property {(id: string, input: Object) => Promise<import('../../model/entities.js').BillingAgreement>} update
 * @property {(input: import('../../model/entities.js').SaveBillingAgreementItemInput) => Promise<import('../../model/entities.js').BillingAgreementItem>} createItem
 * @property {(id: string, input: Object) => Promise<import('../../model/entities.js').BillingAgreementItem>} updateItem
 * @property {(agreementId: string) => Promise<import('../../model/entities.js').BillingAgreementItem[]>} listItems
 */

export {};
