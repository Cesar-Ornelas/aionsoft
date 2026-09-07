/** @typedef {'active' | 'inactive' | 'archived'} OperationsAccountStatus */

/**
 * @typedef {Object} OperationsAccount
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {OperationsAccountStatus} status
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} OperationsAccountFilter
 * @property {string} [name]
 * @property {OperationsAccountStatus} [status]
 * @property {number} [page]
 * @property {number} [pageSize]
 */

/**
 * @typedef {Object} SaveOperationsAccountInput
 * @property {string} name
 * @property {string} [description]
 * @property {OperationsAccountStatus} [status]
 */

/** @typedef {string} OperationsEventType */
/** @typedef {'scheduled' | 'completed' | 'cancelled'} OperationsEventStatus */
/** @typedef {'team' | 'account'} OperationsEventAttendeeKind */

/**
 * @typedef {Object} OperationsEventAttendee
 * @property {string} id
 * @property {string} participantId
 * @property {OperationsEventAttendeeKind} kind
 * @property {string} name
 * @property {string} [email]
 * @property {string} [jobTitle]
 */

/**
 * @typedef {Object} OperationsEventAttendeeOptions
 * @property {OperationsEventAttendee[]} team
 * @property {OperationsEventAttendee[]} account
 */

/**
 * @typedef {Object} OperationsEvent
 * @property {string} id
 * @property {string} accountId
 * @property {OperationsEventType} type
 * @property {string} title
 * @property {string} description
 * @property {string} startsAt
 * @property {string} [endsAt]
 * @property {boolean} allDay
 * @property {string} [url]
 * @property {OperationsEventStatus} status
 * @property {OperationsEventAttendee[]} attendees
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} OperationsEventFilter
 * @property {string} [from]
 * @property {string} [to]
 * @property {OperationsEventType} [type]
 * @property {OperationsEventStatus} [status]
 * @property {string[]} [teamAttendeeIds]
 * @property {string[]} [accountAttendeeIds]
 */

/**
 * @typedef {Object} SaveOperationsEventInput
 * @property {OperationsEventType} type
 * @property {string} title
 * @property {string} [description]
 * @property {string} startsAt
 * @property {string} [endsAt]
 * @property {boolean} [allDay]
 * @property {string} [url]
 * @property {OperationsEventStatus} [status]
 */

/** @typedef {'inbound' | 'outbound'} OperationsCallDirection */
/** @typedef {'scheduled' | 'completed' | 'no_answer' | 'follow_up'} OperationsCallOutcome */

/**
 * @typedef {Object} OperationsCallContact
 * @property {string} id
 * @property {string} participantId
 * @property {string} name
 * @property {string} [email]
 * @property {string} [jobTitle]
 */

/**
 * @typedef {Object} OperationsCall
 * @property {string} id
 * @property {string} accountId
 * @property {string} startsAt
 * @property {number} durationMinutes
 * @property {OperationsCallDirection} direction
 * @property {OperationsCallOutcome} outcome
 * @property {string} notes
 * @property {OperationsCallContact} [contact]
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} SaveOperationsCallInput
 * @property {string} startsAt
 * @property {number} [durationMinutes]
 * @property {string} [contactId]
 * @property {OperationsCallDirection} direction
 * @property {OperationsCallOutcome} outcome
 * @property {string} [notes]
 */

/**
 * @typedef {Object} OperationsCallFilter
 * @property {string} [from]
 * @property {string} [to]
 */

export {};
