import {
	getMonitoringStoreErrorMessage,
	listMonitoringSites
} from '$lib/server/monitoring-store';

export async function load() {
	try {
		const sites = await listMonitoringSites();

		return {
			siteCount: sites.length,
			recentSites: sites
				.toSorted((left, right) => {
					const leftTime = new Date(left.updatedAt ?? left.createdAt).getTime();
					const rightTime = new Date(right.updatedAt ?? right.createdAt).getTime();

					return rightTime - leftTime;
				})
				.slice(0, 3)
		};
	} catch (error) {
		return {
			siteCount: 0,
			recentSites: [],
			errorMessage: getMonitoringStoreErrorMessage(error)
		};
	}
}