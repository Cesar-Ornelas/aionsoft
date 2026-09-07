import { error } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';
import { CrmDataAccessError } from '$lib/crm/model/data-access-error.js';

export async function load({ params }) {
  const services = await createCrmServices();
  try {
    const [account, agreements, catalogServices, plans] = await Promise.all([
      services.operations.get(params.accountId),
      services.billing.list({ operationsAccountId: params.accountId }),
      services.catalog.list({ page: 1, pageSize: 100, status: 'active' }),
      services.catalog.listPlans()
    ]);
    return { account, agreements, services: catalogServices.items, plans };
  } catch (cause) {
    if (cause instanceof CrmDataAccessError && cause.code === 'not_found') throw error(404, cause.message);
    throw cause;
  }
}
