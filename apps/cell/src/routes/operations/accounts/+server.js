import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';
import { crmErrorResponse } from '$lib/crm/server/http.js';

export async function POST({ request }) {
  try {
    const services = await createCrmServices();
    return json(await services.operations.create(await request.json()), { status: 201 });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
