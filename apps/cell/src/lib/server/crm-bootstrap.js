import { env } from '$env/dynamic/private';
import { createPocketBaseClient, getAdminPocketBaseClient } from './pocketbase.js';

const COLLECTION_DEFINITIONS = [
  {
    name: 'contacts',
    type: 'auth',
    schema: [
      { name: 'name', type: 'text', required: true },
      { name: 'email', type: 'email' },
      { name: 'phone', type: 'text' },
      { name: 'company', type: 'text' },
      { name: 'status', type: 'select', options: { values: ['lead', 'prospect', 'customer', 'inactive'] }, required: true },
      { name: 'notes', type: 'text' },
      { name: 'owner', type: 'text' }
    ]
  },
  {
    name: 'deals',
    type: 'base',
    schema: [
      { name: 'title', type: 'text', required: true },
      { name: 'contact', type: 'relation', options: { collectionId: 'contacts', cascadeDelete: false } },
      { name: 'value', type: 'number' },
      { name: 'stage', type: 'select', options: { values: ['new', 'qualified', 'proposal', 'won', 'lost'] }, required: true },
      { name: 'owner', type: 'text' },
      { name: 'notes', type: 'text' }
    ]
  },
  {
    name: 'tasks',
    type: 'base',
    schema: [
      { name: 'title', type: 'text', required: true },
      { name: 'description', type: 'text' },
      { name: 'status', type: 'select', options: { values: ['todo', 'in_progress', 'done', 'blocked'] }, required: true },
      { name: 'priority', type: 'select', options: { values: ['low', 'normal', 'high', 'urgent'] }, required: true },
      { name: 'assignee', type: 'text' },
      { name: 'due_date', type: 'date' },
      { name: 'deal', type: 'relation', options: { collectionId: 'deals', cascadeDelete: false } }
    ]
  },
  {
    name: 'activities',
    type: 'base',
    schema: [
      { name: 'type', type: 'text', required: true },
      { name: 'summary', type: 'text', required: true },
      { name: 'related_contact', type: 'relation', options: { collectionId: 'contacts', cascadeDelete: false } },
      { name: 'related_deal', type: 'relation', options: { collectionId: 'deals', cascadeDelete: false } },
      { name: 'owner', type: 'text' }
    ]
  }
];

function normalizeSchemaField(field) {
  return {
    name: field.name,
    type: field.type,
    required: Boolean(field.required),
    unique: Boolean(field.unique),
    options: field.options ?? undefined,
    presentable: Boolean(field.required),
    hidden: false
  };
}

export async function bootstrapPocketBaseCollections(client = createPocketBaseClient()) {
  const existingCollections = await client.collections.getFullList({ batch: 200, sort: 'name' });
  const collectionMap = new Map(existingCollections.map((collection) => [collection.name, collection]));

  for (const definition of COLLECTION_DEFINITIONS) {
    if (collectionMap.has(definition.name)) {
      console.log(`Collection already exists: ${definition.name}`);
      continue;
    }

    const created = await client.collections.create({
      name: definition.name,
      type: definition.type,
      schema: definition.schema.map(normalizeSchemaField)
    });

    console.log(`Created PocketBase collection: ${created.name}`);
  }
}

export async function seedDefaultAdminUser(client = createPocketBaseClient()) {
  const email = env.CRM_DEFAULT_ADMIN_EMAIL || env.PB_ADMIN_EMAIL || 'admin@aionsoft.local';
  const password = env.CRM_DEFAULT_ADMIN_PASSWORD || env.PB_ADMIN_PASSWORD || 'admin123456';
  const name = env.CRM_DEFAULT_ADMIN_NAME || 'Aionsoft Admin';

  if (!email || !password) {
    console.log('Skipping default admin seed because no email/password was provided.');
    return { created: false, skipped: true };
  }

  try {
    const existing = await client.collection('users').getFirstListItem(`email="${email}"`);

    if (existing) {
      console.log(`Default admin already exists: ${email}`);
      return { created: false, skipped: true, userId: existing.id };
    }
  } catch {
    // no existing user found
  }

  const created = await client.collection('users').create({
    email,
    password,
    passwordConfirm: password,
    name,
    emailVisibility: true,
    verified: true
  });

  console.log(`Created default CRM admin user: ${email}`);

  return { created: true, userId: created.id };
}

export async function bootstrapPocketBase() {
  const adminClient = await getAdminPocketBaseClient();
  await bootstrapPocketBaseCollections(adminClient);
  await seedDefaultAdminUser(adminClient);

  return {
    ok: true,
    message: 'PocketBase bootstrap completed successfully.'
  };
}
