import { error } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';

export async function load() {
  try {
    const services = await createCrmServices({ ensureManagement: true });
    return { variables: await services.configuration.documentVariables.list() };
  } catch (cause) {
    throw error(cause?.code === 'not_found' ? 404 : 500, cause?.message || 'Unable to load configuration.');
  }
}
