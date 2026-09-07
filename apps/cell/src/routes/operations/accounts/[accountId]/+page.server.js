import { error } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';
import { CrmDataAccessError } from '$lib/crm/model/data-access-error.js';

export async function load({ params }) {
  const services = await createCrmServices();
  try {
    const currentMonth = new Date();
    const from = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString();
    const to = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
    const [account, companies, companyResult, events, attendeeOptions, calls, callContacts, agreements] = await Promise.all([
      services.operations.get(params.accountId),
      services.operations.listCompanies(params.accountId),
      services.accounts.list({ page: 1, pageSize: 100, sort: 'name' }),
      services.events.listForAccount(params.accountId, { from, to }).catch((cause) => {
        if (cause instanceof CrmDataAccessError && cause.code === 'not_found' && cause.message.startsWith('Unable to list Operations event')) {
          return [];
        }
        throw cause;
      }),
      services.events.listAttendeeOptions(params.accountId).catch((cause) => {
        if (cause instanceof CrmDataAccessError && cause.code === 'not_found' && cause.message === 'Unable to list Operations event attendees.') {
          return { team: [], account: [] };
        }
        throw cause;
      }),
      services.calls.listForAccount(params.accountId, { from, to }).catch((cause) => {
        if (cause instanceof CrmDataAccessError && cause.code === 'not_found' && cause.message.startsWith('Unable to list Operations calls')) {
          return [];
        }
        throw cause;
      }),
      services.calls.listContactOptions(params.accountId).catch((cause) => {
        if (cause instanceof CrmDataAccessError && cause.code === 'not_found' && cause.message.startsWith('Unable to list Operations call contacts')) {
          return [];
        }
        throw cause;
      }),
      services.billing.list({ operationsAccountId: params.accountId }).catch((cause) => {
        if (cause?.code === 'not_found') return [];
        throw cause;
      })
    ]);
    return {
      account,
      companies,
      events,
      attendeeOptions,
      calls,
      callContacts,
      agreements,
      customerCompanies: companyResult.items.filter((company) => company.lifecycle === 'customer' && !company.operationsAccountId)
    };
  } catch (cause) {
    if (cause instanceof CrmDataAccessError && cause.code === 'not_found') throw error(404, cause.message);
    throw cause;
  }
}
