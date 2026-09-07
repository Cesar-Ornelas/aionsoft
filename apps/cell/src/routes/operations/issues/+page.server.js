import { createCrmServices } from '$lib/crm/server/composition.js';

export async function load({ url }) {
  const filters = {
    search: url.searchParams.get('search') ?? '',
    status: url.searchParams.get('status') ?? '',
    priority: url.searchParams.get('priority') ?? '',
    type: url.searchParams.get('type') ?? ''
  };
  return { filters, issues: await (await createCrmServices()).issues.list(filters) };
}