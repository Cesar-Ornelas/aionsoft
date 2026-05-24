import { getClientsStoreErrorMessage, listClients } from '$lib/server/clients-store';

function getNotice(searchParams) {
	if (searchParams.get('created') === '1') {
		return 'The new client was created successfully.';
	}

	if (searchParams.get('updated') === '1') {
		return 'The client was updated successfully.';
	}

	return null;
}

export async function load({ url }) {
	try {
		return {
			clients: await listClients(),
			notice: getNotice(url.searchParams)
		};
	} catch (error) {
		return {
			clients: [],
			notice: null,
			errorMessage: getClientsStoreErrorMessage(error)
		};
	}
}