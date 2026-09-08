import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';

export async function GET() {
  return json(await (await createCrmServices({ ensureManagement: true })).forms.listForms());
}

export async function POST({ request }) {
  const payload = await request.json();
  return json(await (await createCrmServices({ ensureManagement: true })).forms.createForm(payload), { status: 201 });
}