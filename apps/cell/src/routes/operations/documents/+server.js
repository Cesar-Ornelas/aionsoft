import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';

export async function GET() {
  try { return json(await (await createCrmServices({ ensureManagement: true })).documents.instances.list()); }
  catch (cause) { return json({ error: cause?.message || 'Unable to list documents.' }, { status: 500 }); }
}

export async function POST({ request }) {
  try { return json(await (await createCrmServices({ ensureManagement: true })).documents.instances.generate(await request.json()), { status: 201 }); }
  catch (cause) {
    const status = cause?.code === 'invalid_input' || cause?.code === 'conflict' ? 400 : cause?.code === 'not_found' ? 404 : 500;
    return json({ error: cause?.message || 'Unable to generate document.' }, { status });
  }
}
