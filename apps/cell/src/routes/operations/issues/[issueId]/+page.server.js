import { error } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';

export async function load({ params }) {
  try {
    return { issue: await (await createCrmServices()).issues.get(params.issueId) };
  } catch (cause) {
    throw error(cause.code === 'NOT_FOUND' ? 404 : 500, cause.message);
  }
}