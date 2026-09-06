/** @typedef {import('../../model/entities.js').OperationsEventAttendee} OperationsEventAttendee */
/** @typedef {import('../../model/entities.js').OperationsEventAttendeeOptions} OperationsEventAttendeeOptions */

/**
 * @typedef {Object} OperationsEventAttendeeRepository
 * @property {(accountId: string) => Promise<OperationsEventAttendeeOptions>} listOptionsForAccount
 * @property {(accountId: string, eventId: string) => Promise<OperationsEventAttendee[]>} listForEvent
 * @property {(accountId: string, eventId: string, attendeeIds: { team: string[], account: string[] }) => Promise<OperationsEventAttendee[]>} replaceForEvent
 */

export {};