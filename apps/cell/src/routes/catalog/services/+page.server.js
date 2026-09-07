import { createCrmServices } from '$lib/crm/server/composition.js';

export async function load({ url }) {
  const catalog = (await createCrmServices()).catalog;
  const filters = {
    search: url.searchParams.get('search') ?? '',
    status: url.searchParams.get('status') ?? '',
    page: Number(url.searchParams.get('page')) || 1,
    pageSize: 25
  };

  return {
    filters,
    services: await catalog.list(filters)
  };
}
