import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';
import { crmErrorResponse } from '$lib/crm/server/http.js';

export async function POST({ request }) {
  try {
    const crm = await createCrmServices();
    const account = await crm.accounts.create(await request.json());
    return json(account, { status: 201 });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
