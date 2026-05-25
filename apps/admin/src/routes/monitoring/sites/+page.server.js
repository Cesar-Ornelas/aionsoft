import {
	getMonitoringStoreErrorMessage,
	listMonitoringSites
} from '$lib/server/monitoring-store';

function getNotice(searchParams) {
	if (searchParams.get('created') === '1') {
		return 'The monitoring site was created successfully.';
	}

	if (searchParams.get('updated') === '1') {
		return 'The monitoring site was updated successfully.';
	}

	return null;
}

export async function load({ url }) {
	try {
		return {
			sites: await listMonitoringSites(),
			notice: getNotice(url.searchParams)
		};
	} catch (error) {
		return {
			sites: [],
			notice: null,
			errorMessage: getMonitoringStoreErrorMessage(error)
		};
	}
}