/** @typedef {'draft' | 'published' | 'archived'} DocumentTemplateStatus */
/** @typedef {'draft' | 'generated' | 'archived'} DocumentStatus */

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

export const DOCUMENT_TEMPLATE_STATUSES = new Set(['draft', 'published', 'archived']);
export const DOCUMENT_STATUSES = new Set(['draft', 'generated', 'archived']);
