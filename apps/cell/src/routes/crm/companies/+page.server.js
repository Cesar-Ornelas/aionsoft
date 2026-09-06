import { createCrmServices } from '$lib/crm/server/composition.js';

export async function load({ url }) {
  const crm = await createCrmServices();
  const filters = {
    name: url.searchParams.get('name') ?? '',
    phone: url.searchParams.get('phone') ?? '',
    postalCode: url.searchParams.get('postalCode') ?? '',
    page: Number(url.searchParams.get('page')) || 1,
    pageSize: 25,
    sort: url.searchParams.get('sort') ?? 'name'
  };

  return {
    filters,
    companies: await crm.accounts.list(filters)
  };
}
