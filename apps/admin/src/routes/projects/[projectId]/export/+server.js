import { error, json } from '@sveltejs/kit';
import { requireAdminAppReady } from '$lib/server/admin-guard';
import { exportProjectsSnapshot, getProjectById } from '$lib/server/projects-store';

export async function GET(event) {
	await requireAdminAppReady(event);
	const project = await getProjectById(event.params.projectId);

	if (!project) {
		throw error(404, 'Project not found.');
	}

	const snapshot = await exportProjectsSnapshot(project.id);
	const stamp = snapshot.exportedAt.replace(/[:.]/g, '-');
	const fileName = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';

	return json(snapshot, {
		headers: {
			'content-disposition': `attachment; filename="${fileName}-project-export-${stamp}.json"`
		}
	});
}
