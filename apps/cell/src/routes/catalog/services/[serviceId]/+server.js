import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';
import { catalogErrorResponse } from '$lib/catalog/server/http.js';

export async function GET({ params }) {
  try {
    return json(await (await createCrmServices()).catalog.get(params.serviceId));
  } catch (error) {
    return catalogErrorResponse(error);
  }
}

export async function PATCH({ params, request }) {
  try {
    const catalog = (await createCrmServices()).catalog;
    const input = await request.json();
    return json(input.action === 'archive' ? await catalog.archive(params.serviceId) : await catalog.update(params.serviceId, input));
  } catch (error) {
    return catalogErrorResponse(error);
  }
}

export async function DELETE({ params }) {
  try {
    return json(await (await createCrmServices()).catalog.archive(params.serviceId));
  } catch (error) {
    return catalogErrorResponse(error);
  }
}
