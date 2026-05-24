import {
 	getAccessStoreErrorMessage,
	listLocalPermissions
} from '$lib/server/admin-access-store';

function getNotice(searchParams) {
	if (searchParams.get('created') === '1') {
		return 'The new permission was created successfully.';
	}

	if (searchParams.get('updated') === '1') {
		return 'The permission was updated successfully.';
	}

	return null;
}

export async function load({ url }) {
	try {
		return {
			permissions: await listLocalPermissions(),
			notice: getNotice(url.searchParams)
		};
	} catch (error) {
		return {
			permissions: [],
			notice: null,
			errorMessage: getAccessStoreErrorMessage(error)
		};
	}
}