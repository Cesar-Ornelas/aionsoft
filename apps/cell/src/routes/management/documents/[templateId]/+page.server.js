import { error } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';

export async function load({ params, url }) {
  try {
    const services = await createCrmServices({ ensureManagement: true });
    const template = await services.documents.templates.get(params.templateId);
    const ownedForm = template.formId ? await services.forms.getForm(template.formId) : null;
    const ownedFormVersions = ownedForm ? await services.forms.getVersions(ownedForm.id) : [];
    const forms = template.formId ? [] : await services.forms.listForms();
    const publishedFormVersions = (await Promise.all(forms.map(async (form) => (await services.forms.getVersions(form.id)).filter((version) => version.isPublished).map((version) => ({ ...version, formName: form.name }))))).flat();
    const versions = await services.documents.templates.versions(params.templateId);
    const reviewVersion = versions[0] ?? null;
    return { template, versions, reviewVersionId: reviewVersion?.id ?? null, reviewCommentId: url.searchParams.get('comment') || '', reviewTabRequested: url.searchParams.get('tab') === 'review', reviewComments: reviewVersion ? await services.documents.review.list(reviewVersion.id) : [], ownedForm, ownedFormVersions, publishedFormVersions };
  } catch (cause) { throw error(cause?.code === 'not_found' ? 404 : 500, cause?.message || 'Unable to load document template.'); }
}
