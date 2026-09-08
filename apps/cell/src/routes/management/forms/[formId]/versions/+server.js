import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';

export async function POST({ params, request }) {
  try {
    const payload = await request.json();
    const forms = (await createCrmServices({ ensureManagement: true })).forms;
    const version = payload?.action === 'publish'
      ? await forms.publish(params.formId, payload.versionId)
      : await forms.saveDraft(params.formId, payload);
    return json(version, { status: 201 });
  } catch (cause) {
    const status = cause?.code === 'invalid_input' || cause?.code === 'conflict' ? 400 : cause?.code === 'not_found' ? 404 : 500;
    return json({ error: cause?.message || 'Unable to save form draft.' }, { status });
  }
}