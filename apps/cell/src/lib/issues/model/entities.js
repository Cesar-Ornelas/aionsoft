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
 * @property {IssueTag[]} tags
 * @property {string} createdAt
 * @property {string} updatedAt
 *

/**
 * @typedef {Object} IssueComment
 * @property {string} id
 * @property {string} issueId
 * @property {string|null} parentId
 * @property {string} bodyMarkdown
 * @property {string} authorId
 * @property {string} authorName
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {boolean} edited
 */

/**
 * @typedef {Object} IssueTag
 * @property {string} id
 * @property {string} name
 * @property {string} color
 */

/**
 * @typedef {Object} SaveIssueCommentInput
 * @property {string} bodyMarkdown
 * @property {string|null} [parentId]
 */
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
 * @property {string[]|string} [tags]
 */

export {};