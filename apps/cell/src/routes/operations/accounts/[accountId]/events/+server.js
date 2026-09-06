import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';
import { crmErrorResponse } from '$lib/crm/server/http.js';

export async function GET({ params, url }) {
  try {
    const services = await createCrmServices();
    const events = await services.events.listForAccount(params.accountId, {
      from: url.searchParams.get('from') || undefined,
      to: url.searchParams.get('to') || undefined,
      type: url.searchParams.get('type') || undefined,
      status: url.searchParams.get('status') || undefined
    });
    return json(events);
  } catch (error) {
    return crmErrorResponse(error);
  }
}

export async function POST({ params, request }) {
  try {
    const services = await createCrmServices();
    return json(await services.events.create(params.accountId, await request.json()), { status: 201 });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
