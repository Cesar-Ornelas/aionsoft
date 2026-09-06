import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';
import { crmErrorResponse } from '$lib/crm/server/http.js';

export async function POST({ request }) {
  try {
    const crm = await createCrmServices();
    const input = await request.json();
    const created = await crm.contacts.createStandalone(input);
    const contact = input.accountId ? await crm.contacts.link(created.id, input.accountId) : created;
    return json(contact, { status: 201 });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
