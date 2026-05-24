import { error, fail, redirect } from '@sveltejs/kit';
import {
	buildClientFormValues,
	parseClientFormData,
	validateClientInput
} from '$lib/server/client-form';
import {
	getClientById,
	getClientsStoreErrorMessage,
	updateClient
} from '$lib/server/clients-store';

export async function load({ params }) {
	try {
		const client = await getClientById(params.clientId);

		if (!client) {
			throw error(404, 'Client not found.');
		}

		return {
			client
		};
	} catch (caughtError) {
		throw error(caughtError?.status ?? 500, getClientsStoreErrorMessage(caughtError));
	}
}

export const actions = {
	default: async ({ params, request }) => {
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
			const client = await updateClient(params.clientId, input);

			if (!client) {
				throw error(404, 'Client not found.');
			}
		} catch (caughtError) {
			return fail(caughtError?.status ?? 500, {
				message: getClientsStoreErrorMessage(caughtError),
				values: buildClientFormValues(input)
			});
		}

		throw redirect(303, '/clients?updated=1');
	}
};