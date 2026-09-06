import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';
import { crmErrorResponse } from '$lib/crm/server/http.js';

export async function POST({ params, request }) {
  try {
    const crm = await createCrmServices();
    return json(await crm.contacts.create(params.companyId, await request.json()), { status: 201 });
  } catch (error) { return crmErrorResponse(error); }
}

export async function PATCH({ params, request, url }) {
  try {
    const crm = await createCrmServices();
    const contactId = url.searchParams.get('contactId') ?? '';
    return json(await crm.contacts.update(params.companyId, contactId, await request.json()));
  } catch (error) { return crmErrorResponse(error); }
}

export async function PUT({ params, request }) {
  try {
    const crm = await createCrmServices();
    const { contactId } = await request.json();
    return json(await crm.contacts.setPrimary(params.companyId, contactId));
  } catch (error) { return crmErrorResponse(error); }
}

export async function DELETE({ params, url }) {
  try {
    const crm = await createCrmServices();
    await crm.contacts.remove(params.companyId, url.searchParams.get('contactId') ?? '');
    return json({ ok: true });
  } catch (error) { return crmErrorResponse(error); }
}
