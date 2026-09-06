import { redirect } from '@sveltejs/kit';

export function load({ params, url }) {
  redirect(308, `/crm/companies/${params.customerId}${url.search}`);
}
