import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';
import { crmErrorResponse } from '$lib/crm/server/http.js';

export async function PATCH({ params, request }) {
  try {
    const services = await createCrmServices();
    return json(await services.events.update(params.accountId, params.eventId, await request.json()));
  } catch (error) {
    return crmErrorResponse(error);
  }
}
