function getNotice(searchParams) {
	if (searchParams.get('updated') === '1') {
		return 'The client was updated successfully.';
	}

	if (searchParams.get('contact') === 'created') {
		return 'The contact was created successfully.';
	}

	if (searchParams.get('contact') === 'updated') {
		return 'The contact was updated successfully.';
	}

	return null;
}

export function load({ url }) {
	return {
		notice: getNotice(url.searchParams)
	};
}