import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';
import { catalogErrorResponse } from '$lib/catalog/server/http.js';

export async function POST({ params, request }) {
  try {
    return json(await (await createCrmServices()).catalog.createPlanItem(params.planId, await request.json()), { status: 201 });
  } catch (error) {
    return catalogErrorResponse(error);
  }
}
