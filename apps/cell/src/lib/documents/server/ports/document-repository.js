/**
 * @typedef {Object} DocumentRepository
 * @property {() => Promise<import('../../model/entities.js').DocumentTemplate[]>} listTemplates
 * @property {(id: string) => Promise<import('../../model/entities.js').DocumentTemplate|null>} findTemplateById
 * @property {(input: Object) => Promise<import('../../model/entities.js').DocumentTemplate>} createTemplate
 * @property {(id: string, input: Object) => Promise<import('../../model/entities.js').DocumentTemplate>} updateTemplate
 * @property {() => Promise<import('../../model/entities.js').DocumentTemplateVersion[]>} listTemplateVersions
 * @property {(id: string) => Promise<import('../../model/entities.js').DocumentTemplateVersion|null>} findTemplateVersionById
 * @property {(input: Object) => Promise<import('../../model/entities.js').DocumentTemplateVersion>} createTemplateVersion
 * @property {(id: string, input: Object) => Promise<import('../../model/entities.js').DocumentTemplateVersion>} updateTemplateVersion
 * @property {(input: Object) => Promise<import('../../model/entities.js').Document>} createDocument
 * @property {() => Promise<import('../../model/entities.js').Document[]>} listDocuments
 */
export {};
