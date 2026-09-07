import { error } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';
import { CrmDataAccessError } from '$lib/crm/model/data-access-error.js';

export async function load({ params }) {
  const services = await createCrmServices();
  try {
    const [account, agreement, catalogServices, plans] = await Promise.all([
      services.operations.get(params.accountId),
      services.billing.get(params.agreementId),
      services.catalog.list({ page: 1, pageSize: 100, status: 'active' }),
      services.catalog.listPlans()
    ]);
    const offers = Object.fromEntries(await Promise.all(catalogServices.items.map(async (service) => [service.id, await services.catalog.listPriceOffers(service.id)])));
    return { account, agreement, services: catalogServices.items, plans, offers };
  } catch (cause) {
    if (cause instanceof CrmDataAccessError && cause.code === 'not_found') throw error(404, cause.message);
    throw cause;
  }
}
