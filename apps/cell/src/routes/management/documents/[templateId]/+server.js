import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';

export async function DELETE({ params }) {
  try {
    const services = await createCrmServices({ ensureManagement: true });
    return json(await services.documents.templates.delete(params.templateId));
  } catch (cause) {
    return json({ error: cause?.message || 'Unable to delete document template.' }, { status: cause?.code === 'NOT_FOUND' ? 404 : 500 });
  }
}