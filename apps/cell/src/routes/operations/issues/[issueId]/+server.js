import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';
import { issuesErrorResponse } from '$lib/issues/server/http.js';

export async function PATCH({ params, request }) {
  try {
    return json(await (await createCrmServices()).issues.update(params.issueId, await request.json()));
  } catch (error) {
    return issuesErrorResponse(error);
  }
}