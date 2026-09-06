import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';
import { crmErrorResponse } from '$lib/crm/server/http.js';

export async function PATCH({ params, request }) {
  try {
    const crm = await createCrmServices();
    const input = await request.json();
    const contact = await crm.contacts.updateStandalone(params.contactId, input);
    if (input.accountId !== undefined) {
      if (input.accountId) return json(await crm.contacts.link(contact.id, input.accountId));
      return json(await crm.contacts.unlink(contact.id));
    }
    return json(contact);
  } catch (error) {
    return crmErrorResponse(error);
  }
}

export async function DELETE({ params }) {
  try {
    const crm = await createCrmServices();
    await crm.contacts.removeStandalone(params.contactId);
    return json({ ok: true });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
