import { redirect } from '@sveltejs/kit';

function redirectToCompanies({ params, url }) {
  redirect(308, `/crm/companies/${params.path}${url.search}`);
}

export const GET = redirectToCompanies;
export const POST = redirectToCompanies;
export const PUT = redirectToCompanies;
export const PATCH = redirectToCompanies;
export const DELETE = redirectToCompanies;
