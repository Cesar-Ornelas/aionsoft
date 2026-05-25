
import { getAlertsSummary } from '$lib/server/alerts-store';

export async function load({ locals, url }) {
	let alertsSummary = {
		alerts: [],
		activeCount: 0,
		highestSeverity: null
	};

	if (locals.user) {
		try {
			alertsSummary = await getAlertsSummary();
		} catch {
			alertsSummary = {
				alerts: [],
				activeCount: 0,
				highestSeverity: null
			};
		}
	}

	return {
		user: locals.user ?? null,
		currentPath: url.pathname,
		alertsSummary
	};
}