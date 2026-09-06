import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';
import { crmErrorResponse } from '$lib/crm/server/http.js';

export async function POST({ params, request }) {
  try {
    const crm = await createCrmServices();
    return json(await crm.addresses.create(params.companyId, await request.json()), { status: 201 });
  } catch (error) { return crmErrorResponse(error); }
}

export async function PATCH({ params, request, url }) {
  try {
    const crm = await createCrmServices();
    return json(await crm.addresses.update(params.companyId, url.searchParams.get('addressId') ?? '', await request.json()));
  } catch (error) { return crmErrorResponse(error); }
}

export async function DELETE({ params, url }) {
  try {
    const crm = await createCrmServices();
    await crm.addresses.remove(params.companyId, url.searchParams.get('addressId') ?? '');
    return json({ ok: true });
  } catch (error) { return crmErrorResponse(error); }
}
