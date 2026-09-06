import { createCrmServices } from '$lib/crm/server/composition.js';

export async function load() {
  const crm = await createCrmServices();
  const companies = await crm.accounts.list({ page: 1, pageSize: 5, sort: '-updated' });

  return { companies };
}
