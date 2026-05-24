import { error } from '@sveltejs/kit';
import { getClientById, getClientsStoreErrorMessage } from '$lib/server/clients-store';

export async function load({ params }) {
	try {
		const client = await getClientById(params.clientId);
		const primaryContact = client?.contacts.find((contact) => contact.isPrimary) ?? client?.contacts[0] ?? null;

		if (!client) {
			throw error(404, 'Client not found.');
		}

		return {
			client,
			workspaceShell: {
				kicker: 'Client Workspace',
				title: client.companyName,
				subtitle: primaryContact
					? `${primaryContact.name}${primaryContact.title ? ` · ${primaryContact.title}` : ''}`
					: 'Client navigation',
				navItems: [
					{
						href: `/clients/${client.id}/overview`,
						label: 'Profile',
						description: 'Summary, company details, contacts'
					}
				],
				exitHref: '/clients',
				exitLabel: 'Exit client'
			}
		};
	} catch (caughtError) {
		throw error(caughtError?.status ?? 500, getClientsStoreErrorMessage(caughtError));
	}
}