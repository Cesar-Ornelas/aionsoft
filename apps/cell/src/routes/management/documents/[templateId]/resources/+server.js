import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';

export async function GET({ params }) {
  try {
    const services = await createCrmServices({ ensureManagement: true });
    await services.documents.templates.get(params.templateId);
    return json({ resources: await services.documents.resources.list(params.templateId) });
  } catch (error) {
    return json({ error: error?.message || 'Unable to list document resources.' }, { status: error?.code === 'NOT_FOUND' ? 404 : 500 });
  }
}

export async function POST({ params, request }) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return json({ error: 'An image file is required.' }, { status: 400 });
    const services = await createCrmServices({ ensureManagement: true });
    await services.documents.templates.get(params.templateId);
    return json({ resource: await services.documents.resources.upload(params.templateId, file) }, { status: 201 });
  } catch (error) {
    return json({ error: error?.message || 'Unable to upload document resource.' }, { status: error?.code === 'INVALID_INPUT' ? 400 : error?.code === 'NOT_FOUND' ? 404 : 500 });
  }
}

export async function DELETE({ params, url }) {
  try {
    const resourceKey = url.searchParams.get('resourceKey') || '';
    const services = await createCrmServices({ ensureManagement: true });
    await services.documents.templates.get(params.templateId);
    await services.documents.resources.delete(params.templateId, resourceKey);
    return json({ ok: true });
  } catch (error) {
    return json({ error: error?.message || 'Unable to delete document resource.' }, { status: error?.code === 'INVALID_INPUT' ? 400 : error?.code === 'NOT_FOUND' ? 404 : 500 });
  }
}