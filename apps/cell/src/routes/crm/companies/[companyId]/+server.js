import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';
import { crmErrorResponse } from '$lib/crm/server/http.js';

export async function PATCH({ params, request, url }) {
  try {
    const crm = await createCrmServices();
    const account = url.searchParams.get('action') === 'archive'
      ? await crm.accounts.archive(params.companyId)
      : await crm.accounts.update(params.companyId, await request.json());
    return json(account);
  } catch (error) {
    return crmErrorResponse(error);
  }
}
