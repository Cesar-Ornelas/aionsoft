import { error, fail, redirect } from '@sveltejs/kit';
import {
	getMonitoringSiteById,
	getMonitoringStoreErrorMessage,
	updateMonitoringSite
} from '$lib/server/monitoring-store';

function readTrimmedString(formData, name) {
	return String(formData.get(name) ?? '').trim();
}

export async function load({ params }) {
	try {
		const site = await getMonitoringSiteById(params.siteId);

		if (!site) {
			throw error(404, 'Monitoring site not found.');
		}

		return { site };
	} catch (caughtError) {
		throw error(caughtError?.status ?? 500, getMonitoringStoreErrorMessage(caughtError));
	}
}

export const actions = {
	default: async ({ params, request }) => {
		const formData = await request.formData();
		const input = {
			name: readTrimmedString(formData, 'name'),
			url: readTrimmedString(formData, 'url'),
			description: readTrimmedString(formData, 'description')
		};
		const errors = {};

		if (!input.name) {
			errors.name = 'Site name is required.';
		}

		if (!input.url) {
			errors.url = 'Site URL is required.';
		}

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				errors,
				values: input
			});
		}

		try {
			const site = await updateMonitoringSite(params.siteId, input);

			if (!site) {
				throw error(404, 'Monitoring site not found.');
			}
		} catch (caughtError) {
			return fail(caughtError?.status ?? 500, {
				message: getMonitoringStoreErrorMessage(caughtError),
				values: input
			});
		}

		throw redirect(303, '/monitoring/sites?updated=1');
	}
};