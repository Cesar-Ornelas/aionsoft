import { createCrmServices } from '$lib/crm/server/composition.js';

export async function load({ url }) {
  const services = await createCrmServices();
  const filters = {
    name: url.searchParams.get('name') ?? '',
    status: url.searchParams.get('status') ?? ''
  };
  return { filters, accounts: await services.operations.list(filters) };
}
