import { fail, redirect } from '@sveltejs/kit';
import {
	buildClientFormValues,
	parseClientFormData,
	validateClientInput
} from '$lib/server/client-form';
import { createClient, getClientsStoreErrorMessage } from '$lib/server/clients-store';

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const input = parseClientFormData(formData);
		const errors = validateClientInput(input);

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				errors,
				values: buildClientFormValues(input)
			});
		}

		try {
			await createClient(input);
		} catch (error) {
			return fail(error?.status ?? 500, {
				message: getClientsStoreErrorMessage(error),
				values: buildClientFormValues(input)
			});
		}

		throw redirect(303, '/clients?created=1');
	}
};