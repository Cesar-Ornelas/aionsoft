import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';

const MAX_PACKAGE_BYTES = 10 * 1024 * 1024;

export async function POST({ request }) {
  try {
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_PACKAGE_BYTES) return json({ error: 'Document package is too large.' }, { status: 413 });
    const body = await request.json();
    const services = await createCrmServices({ ensureManagement: true });
    const result = await services.documents.portability.importTemplate(body);
    return json({ template: result.template, report: result.report }, { status: 201 });
  } catch (cause) {
    const status = cause?.code === 'INVALID_INPUT' ? 400 : cause?.code === 'CONFLICT' ? 409 : 500;
    return json({ error: cause?.message || 'Unable to import document package.' }, { status });
  }
}