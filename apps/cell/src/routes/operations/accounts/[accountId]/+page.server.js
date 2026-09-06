import { error } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';
import { CrmDataAccessError } from '$lib/crm/model/data-access-error.js';

export async function load({ params }) {
  const services = await createCrmServices();
  try {
    const [account, companies, companyResult] = await Promise.all([
      services.operations.get(params.accountId),
      services.operations.listCompanies(params.accountId),
      services.accounts.list({ page: 1, pageSize: 100, sort: 'name' })
    ]);
    return {
      account,
      companies,
      customerCompanies: companyResult.items.filter((company) => company.lifecycle === 'customer' && !company.operationsAccountId)
    };
  } catch (cause) {
    if (cause instanceof CrmDataAccessError && cause.code === 'not_found') throw error(404, cause.message);
    throw cause;
  }
}
