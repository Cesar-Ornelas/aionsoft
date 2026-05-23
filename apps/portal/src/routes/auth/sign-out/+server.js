import { buildPostSignOutUrl } from '$lib/server/auth';

async function signOut({ locals, url }) {
	await locals.logtoClient.signOut(buildPostSignOutUrl(url));
}

export const GET = signOut;
export const POST = signOut;