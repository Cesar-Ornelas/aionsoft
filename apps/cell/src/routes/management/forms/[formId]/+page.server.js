import { error } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';

export async function load({ params }) {
  try {
    const forms = (await createCrmServices({ ensureManagement: true })).forms;
    return {
      form: await forms.getForm(params.formId),
      versions: await forms.getVersions(params.formId)
    };
  } catch (cause) {
    throw error(cause?.code === 'not_found' ? 404 : 500, cause?.message || 'Unable to load form.');
  }
}