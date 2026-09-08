import { createCrmServices } from '$lib/crm/server/composition.js';

export async function load() {
  return { forms: await (await createCrmServices({ ensureManagement: true })).forms.listForms() };
}