import { randomUUID } from 'node:crypto';
import { env } from '$env/dynamic/private';
import postgres from 'postgres';

let sqlClient;
let schemaPromise;

function getRequiredEnv(name) {
	const value = env[name]?.trim();

	if (!value) {
		throw new Error(`Missing required admin data env var: ${name}`);
	}

	return value;
}

function getSql() {
	if (!sqlClient) {
		sqlClient = postgres(getRequiredEnv('DATABASE_URL'), {
			max: 1,
			prepare: false
		});
	}

	return sqlClient;
}

async function ensureSchema() {
	if (!schemaPromise) {
		const sql = getSql();
		schemaPromise = (async () => {
			await sql`
				CREATE TABLE IF NOT EXISTS admin_clients (
					id text PRIMARY KEY,
					company_name text NOT NULL,
					address text NOT NULL DEFAULT '',
					website text NOT NULL DEFAULT '',
					phone text NOT NULL DEFAULT '',
					created_at timestamptz NOT NULL DEFAULT now(),
					updated_at timestamptz NOT NULL DEFAULT now()
				)
			`;

			await sql`
				CREATE TABLE IF NOT EXISTS admin_client_contacts (
					id text PRIMARY KEY,
					client_id text NOT NULL REFERENCES admin_clients(id) ON DELETE CASCADE,
					name text NOT NULL,
					email text NOT NULL DEFAULT '',
					phone text NOT NULL DEFAULT '',
					extension text NOT NULL DEFAULT '',
					title text NOT NULL DEFAULT '',
					is_primary boolean NOT NULL DEFAULT false,
					created_at timestamptz NOT NULL DEFAULT now(),
					updated_at timestamptz NOT NULL DEFAULT now()
				)
			`;

			await sql`
				CREATE UNIQUE INDEX IF NOT EXISTS admin_client_contacts_primary_idx
				ON admin_client_contacts (client_id)
				WHERE is_primary = true
			`;
		})();

		schemaPromise = schemaPromise.catch((error) => {
			schemaPromise = undefined;
			throw error;
		});
	}

	await schemaPromise;
}

function normalizeTimestamp(value) {
	return value?.toISOString?.() ?? value;
}

function normalizeClientContact(contact) {
	return {
		id: contact.id,
		clientId: contact.client_id,
		name: contact.name,
		email: contact.email,
		phone: contact.phone,
		extension: contact.extension,
		title: contact.title,
		isPrimary: Boolean(contact.is_primary),
		createdAt: normalizeTimestamp(contact.created_at),
		updatedAt: normalizeTimestamp(contact.updated_at)
	};
}

function normalizeClient(client) {
	return {
		id: client.id,
		companyName: client.company_name,
		address: client.address,
		website: client.website,
		phone: client.phone,
		createdAt: normalizeTimestamp(client.created_at),
		updatedAt: normalizeTimestamp(client.updated_at)
	};
}

function normalizeClientSummary(record) {
	return {
		...normalizeClient(record),
		primaryContact: record.primary_contact_id
			? {
				id: record.primary_contact_id,
				name: record.primary_contact_name,
				email: record.primary_contact_email,
				phone: record.primary_contact_phone,
				extension: record.primary_contact_extension,
				title: record.primary_contact_title
			}
			: null
	};
}

function normalizeString(value) {
	return String(value ?? '').trim();
}

function normalizeEmail(value) {
	return normalizeString(value).toLowerCase();
}

function normalizeContactsInput(contacts) {
	const normalizedContacts = (contacts ?? []).map((contact) => ({
		name: normalizeString(contact.name),
		email: normalizeEmail(contact.email),
		phone: normalizeString(contact.phone),
		extension: normalizeString(contact.extension),
		title: normalizeString(contact.title),
		isPrimary: Boolean(contact.isPrimary)
	}));

	const populatedContacts = normalizedContacts.filter((contact) =>
		contact.name || contact.email || contact.phone || contact.extension || contact.title
	);

	if (populatedContacts.length === 0) {
		throw new Error('At least one contact is required.');
	}

	const primaryContacts = populatedContacts.filter((contact) => contact.isPrimary);

	if (primaryContacts.length !== 1) {
		throw new Error('Exactly one primary contact is required.');
	}

	for (const contact of populatedContacts) {
		if (!contact.name) {
			throw new Error('Each contact must include a name.');
		}
	}

	return populatedContacts;
}

function normalizeSnapshotClient(input) {
	return {
		companyName: normalizeString(input.companyName),
		address: normalizeString(input.address),
		website: normalizeString(input.website),
		phone: normalizeString(input.phone),
		contacts: normalizeContactsInput(input.contacts)
	};
}

async function insertContacts(tx, clientId, contacts) {
	for (const contact of contacts) {
		await tx`
			INSERT INTO admin_client_contacts (id, client_id, name, email, phone, extension, title, is_primary)
			VALUES (
				${randomUUID()},
				${clientId},
				${contact.name},
				${contact.email},
				${contact.phone},
				${contact.extension},
				${contact.title},
				${contact.isPrimary}
			)
		`;
	}
}

async function getClientWithContacts(executor, clientId) {
	const [client] = await executor`
		SELECT *
		FROM admin_clients
		WHERE id = ${clientId}
		LIMIT 1
	`;

	if (!client) {
		return null;
	}

	const contacts = await executor`
		SELECT *
		FROM admin_client_contacts
		WHERE client_id = ${clientId}
		ORDER BY is_primary DESC, name ASC, created_at ASC
	`;

	return {
		...normalizeClient(client),
		contacts: contacts.map(normalizeClientContact)
	};
}

export function getClientsStoreErrorMessage(error, fallback = 'The requested client change could not be completed.') {
	if (error?.code === '23505') {
		return 'Only one primary contact can be selected for a client.';
	}

	if (error instanceof Error && error.message) {
		return error.message;
	}

	return fallback;
}

export async function listClients() {
	await ensureSchema();
	const sql = getSql();
	const clients = await sql`
		SELECT
			c.*,
			pc.id AS primary_contact_id,
			pc.name AS primary_contact_name,
			pc.email AS primary_contact_email,
			pc.phone AS primary_contact_phone,
			pc.extension AS primary_contact_extension,
			pc.title AS primary_contact_title
		FROM admin_clients c
		LEFT JOIN admin_client_contacts pc
			ON pc.client_id = c.id
			AND pc.is_primary = true
		ORDER BY c.company_name ASC
	`;

	return clients.map(normalizeClientSummary);
}

export async function exportClientsSnapshot() {
	await ensureSchema();
	const sql = getSql();
	const clients = await listClients();
	const detailedClients = await Promise.all(clients.map((client) => getClientWithContacts(sql, client.id)));

	return {
		version: 1,
		exportedAt: new Date().toISOString(),
		clients: detailedClients
			.filter(Boolean)
			.map((client) => ({
				companyName: client.companyName,
				address: client.address,
				website: client.website,
				phone: client.phone,
				contacts: client.contacts.map((contact) => ({
					name: contact.name,
					email: contact.email,
					phone: contact.phone,
					extension: contact.extension,
					title: contact.title,
					isPrimary: contact.isPrimary
				}))
			}))
	};
}

export async function getClientById(clientId) {
	await ensureSchema();
	const sql = getSql();
	return getClientWithContacts(sql, clientId);
}

export async function createClient(input) {
	await ensureSchema();
	const sql = getSql();
	const companyName = normalizeString(input.companyName);
	const contacts = normalizeContactsInput(input.contacts);

	if (!companyName) {
		throw new Error('Company name is required.');
	}

	return sql.begin(async (tx) => {
		const [client] = await tx`
			INSERT INTO admin_clients (id, company_name, address, website, phone)
			VALUES (
				${randomUUID()},
				${companyName},
				${normalizeString(input.address)},
				${normalizeString(input.website)},
				${normalizeString(input.phone)}
			)
			RETURNING *
		`;

		await insertContacts(tx, client.id, contacts);

		return getClientWithContacts(tx, client.id);
	});
}

export async function updateClient(clientId, input) {
	await ensureSchema();
	const sql = getSql();
	const companyName = normalizeString(input.companyName);
	const contacts = normalizeContactsInput(input.contacts);

	if (!companyName) {
		throw new Error('Company name is required.');
	}

	return sql.begin(async (tx) => {
		const [client] = await tx`
			UPDATE admin_clients
			SET company_name = ${companyName},
				address = ${normalizeString(input.address)},
				website = ${normalizeString(input.website)},
				phone = ${normalizeString(input.phone)},
				updated_at = now()
			WHERE id = ${clientId}
			RETURNING *
		`;

		if (!client) {
			return null;
		}

		await tx`
			DELETE FROM admin_client_contacts
			WHERE client_id = ${clientId}
		`;

		await insertContacts(tx, clientId, contacts);

		return getClientWithContacts(tx, clientId);
	});
}

export async function importClientsSnapshot(snapshot) {
	await ensureSchema();
	const sql = getSql();
	const rawClients = snapshot?.clients;

	if (!Array.isArray(rawClients) || rawClients.length === 0) {
		throw new Error('The import file must include at least one client.');
	}

	const clients = rawClients.map(normalizeSnapshotClient);

	return sql.begin(async (tx) => {
		for (const client of clients) {
			const [clientRecord] = await tx`
				INSERT INTO admin_clients (id, company_name, address, website, phone)
				VALUES (
					${randomUUID()},
					${client.companyName},
					${client.address},
					${client.website},
					${client.phone}
				)
				RETURNING id
			`;

			await insertContacts(tx, clientRecord.id, client.contacts);
		}

		return {
			importedCount: clients.length
		};
	});
}