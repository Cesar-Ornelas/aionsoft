import { getPublicErrorMessage, listUsers } from '$lib/server/logto-management';

function getNotice(searchParams) {
	if (searchParams.get('created') === '1') {
		return 'The new user was created successfully.';
	}

	if (searchParams.get('updated') === '1') {
		return 'The user was updated successfully.';
	}

	if (searchParams.get('created') === 'setup') {
		return 'Security setup is complete. Your organization and first user are now in Logto.';
	}

	return null;
}

export async function load({ url }) {
	try {
		return {
			users: await listUsers(),
			notice: getNotice(url.searchParams)
		};
	} catch (error) {
		return {
			users: [],
			notice: null,
			errorMessage: getPublicErrorMessage(error)
		};
	}
}