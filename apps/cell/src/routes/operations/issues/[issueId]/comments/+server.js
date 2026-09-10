import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';
import { issuesErrorResponse } from '$lib/issues/server/http.js';

export async function GET({ params, locals }) {
  try {
    return json(await (await createCrmServices()).issues.listComments(params.issueId, locals.user));
  } catch (error) {
    return issuesErrorResponse(error);
  }
}

export async function POST({ params, request, locals }) {
  try {
    const services = await createCrmServices();
    return json(await services.issues.createComment(params.issueId, await request.json(), locals.user), { status: 201 });
  } catch (error) {
    return issuesErrorResponse(error);
  }
}
