import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';
import { catalogErrorResponse } from '$lib/catalog/server/http.js';

export async function GET() {
  try {
    return json(await (await createCrmServices()).catalog.listPlans());
  } catch (error) {
    return catalogErrorResponse(error);
  }
}

export async function POST({ request }) {
  try {
    return json(await (await createCrmServices()).catalog.createPlan(await request.json()), { status: 201 });
  } catch (error) {
    return catalogErrorResponse(error);
  }
}

export async function PATCH({ request }) {
  try {
    const input = await request.json();
    const services = await createCrmServices();
    const existing = (await services.catalog.listPlans()).find((entry) => entry.id === input.id);
    if (!existing) return json({ error: 'Catalog plan was not found.' }, { status: 404 });
    const plan = await services.catalog.updatePlan(input.id, input);
    const item = existing.items[0];
    if (item && input.item) await services.catalog.updatePlanItem(plan.id, item.id, input.item);
    return json((await services.catalog.listPlans()).find((entry) => entry.id === plan.id));
  } catch (error) {
    return catalogErrorResponse(error);
  }
}
