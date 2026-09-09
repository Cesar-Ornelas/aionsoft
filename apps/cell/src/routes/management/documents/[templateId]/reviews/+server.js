import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';

function response(error) {
  const status = error?.code === 'INVALID_INPUT' ? 400 : error?.code === 'NOT_FOUND' ? 404 : 500;
  return json({ error: error?.message || 'Unable to manage document review comments.' }, { status });
}

export async function GET({ params, url }) {
  try {
    const services = await createCrmServices({ ensureManagement: true });
    const versions = await services.documents.templates.versions(params.templateId);
    const versionId = url.searchParams.get('versionId') || versions[0]?.id;
    if (!versionId || !versions.some((version) => version.id === versionId)) return json([]);
    return json(await services.documents.review.list(versionId));
  } catch (error) { return response(error); }
}

export async function POST({ params, request }) {
  try {
    const input = await request.json();
    const services = await createCrmServices({ ensureManagement: true });
    const versions = await services.documents.templates.versions(params.templateId);
    if (!versions.some((version) => version.id === input.versionId)) return json({ error: 'Template version was not found.' }, { status: 404 });
    return json(await services.documents.review.create(input.versionId, input), { status: 201 });
  } catch (error) { return response(error); }
}