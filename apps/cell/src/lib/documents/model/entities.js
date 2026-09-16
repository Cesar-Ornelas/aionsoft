/** @typedef {'draft' | 'published' | 'archived'} DocumentTemplateStatus */
/** @typedef {'draft' | 'generated' | 'archived'} DocumentStatus */
/** @typedef {'image'} DocumentResourceType */

/** @typedef {Object} DocumentResource
 * @property {string} resourceKey
 * @property {DocumentResourceType} resourceType
 * @property {string} scopeKey
 * @property {string} name
 * @property {string} mediaType
 * @property {number} sizeBytes
 * @property {string} checksum
 * @property {number|null} width
 * @property {number|null} height
 * @property {string} createdAt
 */

/** @typedef {Object} DocumentTemplate
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string|null} formId
 * @property {DocumentTemplateStatus} status
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/** @typedef {Object} DocumentTemplateVersion
 * @property {string} id
 * @property {string} templateId
 * @property {number} versionNumber
 * @property {Object} content
 * @property {Object} sampleData
 * @property {Object} pageConfig
 * @property {string|null} formVersionId
 * @property {boolean} isPublished
 * @property {string} status
 * @property {string} createdAt
 */

/** @typedef {Object} Document
 * @property {string} id
 * @property {string|null} operationsAccountId
 * @property {string} templateVersionId
 * @property {string|null} formVersionId
 * @property {DocumentStatus} status
 * @property {Object} dataSnapshot
 * @property {string} renderedHtml
 * @property {string} createdAt
 */

/** @typedef {Object} DocumentReviewComment
 * @property {string} id
 * @property {string} templateVersionId
 * @property {string} body
 * @property {string} excerpt
 * @property {{start: number, end: number, text: string}} anchor
 * @property {string|null} issueId
 * @property {string|null} authorId
 * @property {string|null} authorName
 * @property {DocumentReviewCommentVoteSummary} votes
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/** @typedef {Object} DocumentReviewCommentVote
 * @property {string} id
 * @property {string} commentId
 * @property {string} voterId
 * @property {string} voterName
 * @property {string} createdAt
 */

/** @typedef {Object} DocumentReviewCommentVoteSummary
 * @property {number} count
 * @property {boolean} votedByMe
 * @property {string[]} voterNames
 */

export const DOCUMENT_TEMPLATE_STATUSES = new Set(['draft', 'published', 'archived']);
export const DOCUMENT_STATUSES = new Set(['draft', 'generated', 'archived']);
