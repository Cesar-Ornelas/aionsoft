import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';
import { catalogErrorResponse } from '$lib/catalog/server/http.js';

export async function GET({ url }) {
  try {
    const catalog = (await createCrmServices()).catalog;
    return json(await catalog.list({
      search: url.searchParams.get('search') ?? '',
      status: url.searchParams.get('status') ?? '',
      page: Number(url.searchParams.get('page')) || 1,
      pageSize: Number(url.searchParams.get('pageSize')) || 25
    }));
  } catch (error) {
    return catalogErrorResponse(error);
  }
}

export async function POST({ request }) {
  try {
    const catalog = (await createCrmServices()).catalog;
    return json(await catalog.create(await request.json()), { status: 201 });
  } catch (error) {
    return catalogErrorResponse(error);
  }
}
