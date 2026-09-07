import { createCrmServices } from '$lib/crm/server/composition.js';

export async function load() {
  const catalog = (await createCrmServices()).catalog;
  const [plans, services] = await Promise.all([
    catalog.listPlans(),
    catalog.list({ page: 1, pageSize: 100, status: 'active' })
  ]);

  return { plans, services: services.items };
}
