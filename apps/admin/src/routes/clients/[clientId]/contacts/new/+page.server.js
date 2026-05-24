import { error, fail, redirect } from '@sveltejs/kit';
import { createClientContact, getClientById, getClientsStoreErrorMessage } from '$lib/server/clients-store';

function readTrimmedString(formData, name) {
	return String(formData.get(name) ?? '').trim();
}

function readContactInput(formData) {
	return {
		name: readTrimmedString(formData, 'name'),
		email: readTrimmedString(formData, 'email'),
		phone: readTrimmedString(formData, 'phone'),
		extension: readTrimmedString(formData, 'extension'),
		title: readTrimmedString(formData, 'title'),
		isPrimary: formData.get('isPrimary') === 'on'
	};
}

export async function load({ params }) {
	try {
		const client = await getClientById(params.clientId);

		if (!client) {
			throw error(404, 'Client not found.');
		}

		return { client };
	} catch (caughtError) {
		throw error(caughtError?.status ?? 500, getClientsStoreErrorMessage(caughtError));
	}
}

export const actions = {
	default: async ({ params, request }) => {
		const formData = await request.formData();
		const input = readContactInput(formData);
		const errors = {};

		if (!input.name) {
			errors.name = 'Contact name is required.';
		}

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				errors,
				values: input
			});
		}

		try {
			const contact = await createClientContact(params.clientId, input);

			if (!contact) {
				throw error(404, 'Client not found.');
			}
		} catch (caughtError) {
			return fail(caughtError?.status ?? 500, {
				message: getClientsStoreErrorMessage(caughtError),
				values: input
			});
		}

		throw redirect(303, `/clients/${params.clientId}/overview?contact=created`);
	}
};