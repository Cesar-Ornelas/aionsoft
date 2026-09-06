import { error } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';
import { CrmDataAccessError } from '$lib/crm/model/data-access-error.js';

export async function load({ params }) {
  const crm = await createCrmServices();

  try {
    const account = await crm.accounts.get(params.companyId);
    const [contacts, addresses, relationships, accountOptions] = await Promise.all([
      crm.contacts.list(params.companyId),
      crm.addresses.list(params.companyId),
      crm.relationships.list(params.companyId),
      crm.accounts.list({ page: 1, pageSize: 100, sort: 'name' })
    ]);

    return {
      account,
      contacts,
      addresses,
      relationships,
      accountOptions: accountOptions.items.filter((item) => item.id !== account.id)
    };
  } catch (cause) {
    if (cause instanceof CrmDataAccessError && cause.code === 'not_found') throw error(404, cause.message);
    throw cause;
  }
}
