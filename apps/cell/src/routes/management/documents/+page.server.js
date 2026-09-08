import { createCrmServices } from '$lib/crm/server/composition.js';

export async function load() {
  return { templates: await (await createCrmServices({ ensureManagement: true })).documents.templates.list() };
}
