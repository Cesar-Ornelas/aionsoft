import { buildProjectDashboard, getProjectsStoreErrorMessage } from '$lib/server/projects-store';

function getNotice(searchParams) {
	if (searchParams.get('created') === '1') return 'The project was created successfully.';
	if (searchParams.get('updated') === '1') return 'The project was updated successfully.';
	if (searchParams.get('task') === 'created') return 'The project task was created successfully.';
	return null;
}

export async function load({ params, url }) {
	try {
		return {
			dashboard: await buildProjectDashboard(params.projectId),
			notice: getNotice(url.searchParams)
		};
	} catch (error) {
		return {
			dashboard: null,
			notice: null,
			errorMessage: getProjectsStoreErrorMessage(error, 'The project overview could not be loaded.')
		};
	}
}
