import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';
import { billingErrorResponse } from '$lib/billing/server/http.js';

export async function POST({ params, request }) {
  try {
    return json(await (await createCrmServices()).billing.addItem({ ...(await request.json()), agreementId: params.agreementId }), { status: 201 });
  } catch (error) {
    return billingErrorResponse(error);
  }
}

export async function PATCH({ params, request }) {
  try {
    const { status } = await request.json();
    return json(await (await createCrmServices()).billing.transition(params.agreementId, status));
  } catch (error) {
    return billingErrorResponse(error);
  }
}
