import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';
import { crmErrorResponse } from '$lib/crm/server/http.js';

export async function GET({ params, url }) {
  try {
    const services = await createCrmServices();
    return json(await services.calls.listForAccount(params.accountId, {
      from: url.searchParams.get('from') || undefined,
      to: url.searchParams.get('to') || undefined
    }));
  } catch (error) {
    return crmErrorResponse(error);
  }
}

export async function POST({ params, request }) {
  try {
    const services = await createCrmServices();
    return json(await services.calls.create(params.accountId, await request.json()), { status: 201 });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
