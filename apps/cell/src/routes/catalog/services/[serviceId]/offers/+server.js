import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';
import { catalogErrorResponse } from '$lib/catalog/server/http.js';

export async function GET({ params }) {
  try {
    return json(await (await createCrmServices()).catalog.listPriceOffers(params.serviceId));
  } catch (error) {
    return catalogErrorResponse(error);
  }
}

export async function POST({ params, request }) {
  try {
    return json(await (await createCrmServices()).catalog.createPriceOffer(params.serviceId, await request.json()), { status: 201 });
  } catch (error) {
    return catalogErrorResponse(error);
  }
}

export async function PATCH({ params, request }) {
  try {
    const input = await request.json();
    return json(await (await createCrmServices()).catalog.updatePriceOffer(params.serviceId, input.offerId, input));
  } catch (error) {
    return catalogErrorResponse(error);
  }
}
