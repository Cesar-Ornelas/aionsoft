import { createCrmServices } from '$lib/crm/server/composition.js';

export async function load({ url }) {
  const crm = await createCrmServices();
  const filters = {
    name: url.searchParams.get('name') ?? '',
    email: url.searchParams.get('email') ?? '',
    phone: url.searchParams.get('phone') ?? '',
    jobTitle: url.searchParams.get('jobTitle') ?? '',
    companyState: url.searchParams.get('companyState') ?? 'all',
    companyId: url.searchParams.get('companyId') ?? ''
  };

  const [contacts, companies] = await Promise.all([
    crm.contacts.listAll(filters),
    crm.accounts.list({ page: 1, pageSize: 100, sort: 'name' })
  ]);

  return { contacts, companies: companies.items, filters };
}
