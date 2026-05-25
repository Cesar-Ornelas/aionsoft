import { redirect } from '@sveltejs/kit';

export function load({ params, url }) {
	const redirectUrl = new URL('/tasks', url);
	redirectUrl.searchParams.set('edit', params.taskId);
	throw redirect(303, `${redirectUrl.pathname}?${redirectUrl.searchParams.toString()}`);
}