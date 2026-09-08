/** @typedef {import('../../model/forms.js').ManagementForm} ManagementForm */
/** @typedef {import('../../model/forms.js').ManagementFormVersion} ManagementFormVersion */

/** @typedef {Object} FormRepository
 * @property {() => Promise<ManagementForm[]>} listForms
 * @property {(id: string) => Promise<ManagementForm | null>} findFormById
 * @property {(input: Object) => Promise<ManagementForm>} createForm
 * @property {(id: string, input: Object) => Promise<ManagementForm>} updateForm
 * @property {(formId: string) => Promise<ManagementFormVersion[]>} listVersions
 * @property {(id: string) => Promise<ManagementFormVersion | null>} findVersionById
 * @property {(input: Object) => Promise<ManagementFormVersion>} createVersion
 * @property {(id: string, input: Object) => Promise<ManagementFormVersion>} updateVersion
 */

export {};
