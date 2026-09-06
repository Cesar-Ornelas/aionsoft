import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';
import { crmErrorResponse } from '$lib/crm/server/http.js';

export async function PATCH({ params, request, url }) {
  try {
    const services = await createCrmServices();
    const action = url.searchParams.get('action');
    const result = action === 'archive'
      ? await services.operations.archive(params.accountId)
      : action === 'link'
        ? await services.operations.linkCompany(params.accountId, (await request.json()).companyId)
        : action === 'unlink'
          ? await services.operations.unlinkCompany(params.accountId, url.searchParams.get('companyId'))
          : await services.operations.update(params.accountId, await request.json());
    return json(result);
  } catch (error) {
    return crmErrorResponse(error);
  }
}
