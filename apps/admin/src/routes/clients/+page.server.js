import { fail, redirect } from '@sveltejs/kit';
import {
	getClientsStoreErrorMessage,
	importClientsSnapshot,
	listClients
} from '$lib/server/clients-store';

function getNotice(searchParams) {
	if (searchParams.get('created') === '1') {
		return 'The new client was created successfully.';
	}

	if (searchParams.get('updated') === '1') {
		return 'The client was updated successfully.';
	}

	const importedCount = Number(searchParams.get('imported') ?? '0');

	if (importedCount > 0) {
		return `${importedCount} ${importedCount === 1 ? 'client was' : 'clients were'} imported successfully.`;
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

export const actions = {
	import: async ({ request }) => {
		const formData = await request.formData();
		const file = formData.get('file');

		if (!(file instanceof File) || file.size === 0) {
			return fail(400, {
				message: 'Choose a JSON export file to import.'
			});
		}

		let snapshot;

		try {
			snapshot = JSON.parse(await file.text());
		} catch {
			return fail(400, {
				message: 'The selected file is not valid JSON.'
			});
		}

		try {
			const result = await importClientsSnapshot(snapshot);
			throw redirect(303, `/clients?imported=${result.importedCount}`);
		} catch (error) {
			if (error?.status === 303) {
				throw error;
			}

			return fail(error?.status ?? 500, {
				message: getClientsStoreErrorMessage(error, 'The client export could not be imported.')
			});
		}
	}
};