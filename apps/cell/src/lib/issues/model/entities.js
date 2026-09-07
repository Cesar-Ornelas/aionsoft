/**
 * @typedef {'customer' | 'provider' | 'internal'} IssueType
 * @typedef {'low' | 'medium' | 'high' | 'urgent'} IssuePriority
 * @typedef {'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled'} IssueStatus
 * @typedef {Object} Issue
 * @property {string} id
 * @property {string} title
 * @property {string} descriptionMarkdown
 * @property {IssueType} type
 * @property {IssuePriority} priority
 * @property {IssueStatus} status
 * @property {string} companyId
 * @property {string} operationsAccountId
 * @property {string} dueDate
 * @property {string} createdBy
 * @property {string} createdAt
 * @property {string} updatedAt
 *
 * @typedef {Object} SaveIssueInput
 * @property {string} title
 * @property {string} [descriptionMarkdown]
 * @property {IssueType} type
 * @property {IssuePriority} priority
 * @property {IssueStatus} [status]
 * @property {string} [companyId]
 * @property {string} [operationsAccountId]
 * @property {string} [dueDate]
 * @property {string} [createdBy]
 */

export {};