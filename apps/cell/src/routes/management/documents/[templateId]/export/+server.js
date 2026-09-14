import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';

export async function GET({ params, url }) {
  try {
    const services = await createCrmServices({ ensureManagement: true });
    const bundle = await services.documents.portability.exportTemplate(params.templateId, {
      includeIssues: url.searchParams.get('includeIssues') === 'true',
      includeVotes: url.searchParams.get('includeVotes') === 'true'
    });
    return new Response(JSON.stringify(bundle, null, 2), {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': `attachment; filename="${bundle.source.templateName.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase() || 'document'}.aionsoft-document.json"`
      }
    });
  } catch (cause) {
    return json({ error: cause?.message || 'Unable to export document template.' }, { status: cause?.code === 'NOT_FOUND' ? 404 : 500 });
  }
}