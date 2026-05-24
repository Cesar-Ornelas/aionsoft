function readTrimmedString(formData, name) {
	return String(formData.get(name) ?? '').trim();
}

function getEmptyContact() {
	return {
		name: '',
		email: '',
		phone: '',
		extension: '',
		title: '',
		isPrimary: false
	};
}

function normalizeContact(contact = {}) {
	return {
		name: String(contact.name ?? '').trim(),
		email: String(contact.email ?? '').trim().toLowerCase(),
		phone: String(contact.phone ?? '').trim(),
		extension: String(contact.extension ?? '').trim(),
		title: String(contact.title ?? '').trim(),
		isPrimary: Boolean(contact.isPrimary)
	};
}

export function parseClientFormData(formData) {
	const contacts = new Map();
	const primaryContactIndex = readTrimmedString(formData, 'primaryContactIndex');

	for (const [key, value] of formData.entries()) {
		const match = /^contacts\[(\d+)\]\[(name|email|phone|extension|title)\]$/.exec(key);

		if (!match) {
			continue;
		}

		const index = Number(match[1]);
		const field = match[2];
		const currentContact = contacts.get(index) ?? getEmptyContact();
		currentContact[field] = String(value ?? '').trim();
		contacts.set(index, currentContact);
	}

	const orderedContacts = [...contacts.entries()]
		.sort((left, right) => left[0] - right[0])
		.map(([index, contact]) =>
			normalizeContact({
				...contact,
				isPrimary: String(index) === primaryContactIndex
			})
		);

	return {
		companyName: readTrimmedString(formData, 'companyName'),
		address: readTrimmedString(formData, 'address'),
		website: readTrimmedString(formData, 'website'),
		phone: readTrimmedString(formData, 'phone'),
		contacts: orderedContacts
	};
}

export function validateClientInput(input) {
	const errors = {};
	const populatedContacts = input.contacts.filter((contact) =>
		contact.name || contact.email || contact.phone || contact.extension || contact.title
	);

	if (!input.companyName) {
		errors.companyName = 'Company name is required.';
	}

	if (populatedContacts.length === 0) {
		errors.contacts = 'At least one contact is required.';
	} else if (populatedContacts.filter((contact) => contact.isPrimary).length !== 1) {
		errors.contacts = 'Select exactly one primary contact.';
	} else if (populatedContacts.some((contact) => !contact.name)) {
		errors.contacts = 'Each contact must include a name.';
	}

	return errors;
}

export function buildClientFormValues(input) {
	return {
		companyName: input.companyName,
		address: input.address,
		website: input.website,
		phone: input.phone,
		contacts: input.contacts.length > 0 ? input.contacts.map(normalizeContact) : [getEmptyContact()]
	};
}