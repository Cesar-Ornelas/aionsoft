import { error } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';

export async function load({ params }) {
  try {
    const services = await createCrmServices({ ensureManagement: true });
    const template = await services.documents.templates.get(params.templateId);
    const ownedForm = template.formId ? await services.forms.getForm(template.formId) : null;
    const ownedFormVersions = ownedForm ? await services.forms.getVersions(ownedForm.id) : [];
    const forms = template.formId ? [] : await services.forms.listForms();
    const publishedFormVersions = (await Promise.all(forms.map(async (form) => (await services.forms.getVersions(form.id)).filter((version) => version.isPublished).map((version) => ({ ...version, formName: form.name }))))).flat();
    return { template, versions: await services.documents.templates.versions(params.templateId), ownedForm, ownedFormVersions, publishedFormVersions };
  } catch (cause) { throw error(cause?.code === 'not_found' ? 404 : 500, cause?.message || 'Unable to load document template.'); }
}
