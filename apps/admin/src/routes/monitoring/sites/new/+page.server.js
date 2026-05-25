import { fail, redirect } from '@sveltejs/kit';
import {
	createMonitoringSite,
	getMonitoringStoreErrorMessage
} from '$lib/server/monitoring-store';

function readTrimmedString(formData, name) {
	return String(formData.get(name) ?? '').trim();
}

export const actions = {
	default: async ({ request }) => {
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
			await createMonitoringSite(input);
		} catch (error) {
			return fail(error?.status ?? 500, {
				message: getMonitoringStoreErrorMessage(error),
				values: input
			});
		}

		throw redirect(303, '/monitoring/sites?created=1');
	}
};