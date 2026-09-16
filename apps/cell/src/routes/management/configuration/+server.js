import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';

function statusFor(error) {
  if (error?.code === 'INVALID_INPUT') return 400;
  if (error?.code === 'CONFLICT') return 409;
  if (error?.code === 'NOT_FOUND') return 404;
  return 500;
}

export async function GET() {
  try {
    const services = await createCrmServices({ ensureManagement: true });
    return json({ variables: await services.configuration.documentVariables.list() });
  } catch (error) {
    return json({ error: error?.message || 'Unable to list document variables.' }, { status: statusFor(error) });
  }
}

export async function POST({ request }) {
  try {
    const services = await createCrmServices({ ensureManagement: true });
    return json({ variable: await services.configuration.documentVariables.create(await request.json()) }, { status: 201 });
  } catch (error) {
    return json({ error: error?.message || 'Unable to create document variable.' }, { status: statusFor(error) });
  }
}

export async function PATCH({ request, url }) {
  try {
    const id = url.searchParams.get('id');
    if (!id) return json({ error: 'Variable id is required.' }, { status: 400 });
    const services = await createCrmServices({ ensureManagement: true });
    return json({ variable: await services.configuration.documentVariables.update(id, await request.json()) });
  } catch (error) {
    return json({ error: error?.message || 'Unable to update document variable.' }, { status: statusFor(error) });
  }
}

export async function DELETE({ url }) {
  try {
    const id = url.searchParams.get('id');
    if (!id) return json({ error: 'Variable id is required.' }, { status: 400 });
    const services = await createCrmServices({ ensureManagement: true });
    return json({ variable: await services.configuration.documentVariables.archive(id) });
  } catch (error) {
    return json({ error: error?.message || 'Unable to archive document variable.' }, { status: statusFor(error) });
  }
}
