import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';
import { issuesErrorResponse } from '$lib/issues/server/http.js';

export async function GET({ url }) {
  try {
    return json(await (await createCrmServices()).issues.list({
      search: url.searchParams.get('search') ?? '',
      status: url.searchParams.get('status') ?? '',
      priority: url.searchParams.get('priority') ?? '',
      type: url.searchParams.get('type') ?? '',
      tag: url.searchParams.get('tag') ?? ''
    }));
  } catch (error) {
    return issuesErrorResponse(error);
  }
}

export async function POST({ request }) {
  try {
    return json(await (await createCrmServices()).issues.create(await request.json()), { status: 201 });
  } catch (error) {
    return issuesErrorResponse(error);
  }
}