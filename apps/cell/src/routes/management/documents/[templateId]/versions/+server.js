import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';

export async function POST({ params, request }) {
  try {
    const input = await request.json();
    const services = await createCrmServices({ ensureManagement: true });
    if (input.action === 'publish') return json(await services.documents.templates.publish(params.templateId));
    if (input.action === 'rollback') return json(await services.documents.templates.rollback(params.templateId, input.versionId));
    return json(await services.documents.templates.saveDraft(params.templateId, input), { status: 201 });
  } catch (cause) {
    const status = cause?.code === 'invalid_input' || cause?.code === 'conflict' ? 400 : cause?.code === 'not_found' ? 404 : 500;
    return json({ error: cause?.message || 'Unable to save document template.' }, { status });
  }
}
