import { requireAdminAppReady } from '$lib/server/admin-guard';

export function load(event) {
	return requireAdminAppReady(event);
}
