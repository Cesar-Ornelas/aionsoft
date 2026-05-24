import { json } from '@sveltejs/kit';
import { requireAdminAppReady } from '$lib/server/admin-guard';
import { exportClientsSnapshot } from '$lib/server/clients-store';

export async function GET(event) {
	await requireAdminAppReady(event);
	const snapshot = await exportClientsSnapshot();
	const stamp = snapshot.exportedAt.replace(/[:.]/g, '-');

	return json(snapshot, {
		headers: {
			'content-disposition': `attachment; filename="clients-export-${stamp}.json"`
		}
	});
}