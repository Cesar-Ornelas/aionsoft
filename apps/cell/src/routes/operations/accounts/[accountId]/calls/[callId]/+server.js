import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';
import { crmErrorResponse } from '$lib/crm/server/http.js';

export async function PATCH({ params, request }) {
  try {
    const services = await createCrmServices();
    return json(await services.calls.update(params.accountId, params.callId, await request.json()));
  } catch (error) {
    return crmErrorResponse(error);
  }
}

export async function DELETE({ params }) {
  try {
    const services = await createCrmServices();
    await services.calls.delete(params.accountId, params.callId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
