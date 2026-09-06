import { error } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';
import { CrmDataAccessError } from '$lib/crm/model/data-access-error.js';

export async function load({ params }) {
  const crm = await createCrmServices();

  try {
    const [contact, companies] = await Promise.all([
      crm.contacts.get(params.contactId),
      crm.accounts.list({ page: 1, pageSize: 100, sort: 'name' })
    ]);
    return { contact, companies: companies.items };
  } catch (cause) {
    if (cause instanceof CrmDataAccessError && cause.code === 'not_found') throw error(404, cause.message);
    throw cause;
  }
}
