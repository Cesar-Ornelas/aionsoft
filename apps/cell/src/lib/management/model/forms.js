/** @typedef {'draft' | 'pending_review' | 'published' | 'deleted'} FormStatus */
/** @typedef {'text' | 'textarea' | 'number' | 'money' | 'percent' | 'date' | 'datetime' | 'radio' | 'select' | 'button-select' | 'checkbox' | 'button-multi-select' | 'calculation' | 'aggregate' | 'derived-hidden' | 'list' | 'section' | 'template-section' | 'divider' | 'hidden' | 'file' | 'signature' | 'user-select'} FormFieldType */

/** @typedef {Object} FieldValidation
 * @property {boolean} [required]
 * @property {number} [minLength]
 * @property {number} [maxLength]
 * @property {number} [min]
 * @property {number} [max]
 * @property {number} [minRows]
 * @property {number} [maxRows]
 * @property {string} [pattern]
 * @property {string} [patternMessage]
 */

/** @typedef {Object} SectionCondition
 * @property {string} fieldId
 * @property {string[]} values
 */

/** @typedef {Object} FormOption
 * @property {string} label
 * @property {string} value
 */

/** @typedef {Object} FormField
 * @property {string} id
 * @property {FormFieldType} type
 * @property {string} label
 * @property {string} [fieldKey]
 * @property {string} [placeholder]
 * @property {string} [helpText]
 * @property {unknown} [defaultValue]
 * @property {1 | 0.5} [colSpan]
 * @property {FieldValidation} [validation]
 * @property {string} [mask]
 * @property {FormOption[]} [options]
 * @property {boolean} [sortOptions]
 * @property {string} [formula]
 * @property {'number' | 'currency' | 'percent'} [calculationFormat]
 * @property {string} [sourceListFieldId]
 * @property {string} [sourceChildFieldId]
 * @property {'sum' | 'avg'} [operation]
 * @property {boolean} [hideInForm]
 * @property {FormField[]} [fields]
 * @property {SectionCondition} [condition]
 */

/** @typedef {Object} FormSchema
 * @property {FormField[]} fields
 */

/** @typedef {Object} ManagementForm
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} category
 * @property {FormStatus} status
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/** @typedef {Object} ManagementFormVersion
 * @property {string} id
 * @property {string} formId
 * @property {number} versionNumber
 * @property {FormSchema} schema
 * @property {boolean} isPublished
 * @property {string} createdAt
 */

export {};
