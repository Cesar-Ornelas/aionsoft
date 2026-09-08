import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';

export async function POST({ request }) {
  try {
    const template = await (await createCrmServices({ ensureManagement: true })).documents.templates.create(await request.json());
    return json(template, { status: 201 });
  } catch (cause) {
    const status = cause?.code === 'invalid_input' ? 400 : 500;
    return json({ error: cause?.message || 'Unable to create document template.' }, { status });
  }
}
