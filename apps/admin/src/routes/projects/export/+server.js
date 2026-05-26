import { json } from '@sveltejs/kit';
import { requireAdminAppReady } from '$lib/server/admin-guard';
import { exportProjectsSnapshot } from '$lib/server/projects-store';

export async function GET(event) {
	await requireAdminAppReady(event);
	const snapshot = await exportProjectsSnapshot();
	const stamp = snapshot.exportedAt.replace(/[:.]/g, '-');

	return json(snapshot, {
		headers: {
			'content-disposition': `attachment; filename="projects-export-${stamp}.json"`
		}
	});
}
