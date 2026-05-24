import { getAccessStoreErrorMessage, listLocalRoles } from '$lib/server/admin-access-store';

function getNotice(searchParams) {
	if (searchParams.get('created') === '1') {
		return 'The new role was created successfully.';
	}

	if (searchParams.get('updated') === '1') {
		return 'The role was updated successfully.';
	}

	return null;
}

export async function load({ url }) {
	try {
		return {
			roles: await listLocalRoles(),
			notice: getNotice(url.searchParams)
		};
	} catch (error) {
		return {
			roles: [],
			notice: null,
			errorMessage: getAccessStoreErrorMessage(error)
		};
	}
}