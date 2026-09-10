import { error } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';

export async function load({ params, locals }) {
  try {
    const services = await createCrmServices();
    const issue = await services.issues.get(params.issueId);
    return { issue, comments: await services.issues.listComments(issue.id, locals.user), user: locals.user };
  } catch (cause) {
    throw error(cause.code === 'NOT_FOUND' ? 404 : 500, cause.message);
  }
}