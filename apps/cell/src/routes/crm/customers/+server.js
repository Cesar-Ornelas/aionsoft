import { redirect } from '@sveltejs/kit';

function redirectToCompanies({ url }) {
  redirect(308, `/crm/companies${url.search}`);
}

export const GET = redirectToCompanies;
export const POST = redirectToCompanies;
