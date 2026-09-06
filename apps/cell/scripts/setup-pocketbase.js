import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import PocketBase from 'pocketbase';
import { ensureCrmCompanyCollections } from '../src/lib/crm/server/adapters/pocketbase/schema.js';

const envFilePath = resolve(process.cwd(), '.env');
const env = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => key.startsWith('CRM_') || key.startsWith('PB_'))
);

const envVars = {
  PB_URL: env.PB_URL || process.env.PB_URL || 'http://127.0.0.1:8090',
  PB_EMAIL: env.PB_EMAIL || process.env.PB_EMAIL || 'admin@aionsoft.local',
  PB_PASSWORD: env.PB_PASSWORD || process.env.PB_PASSWORD || 'admin123456',
  CRM_DEFAULT_ADMIN_EMAIL:
    env.CRM_DEFAULT_ADMIN_EMAIL || process.env.CRM_DEFAULT_ADMIN_EMAIL || 'admin@aionsoft.local',
  CRM_DEFAULT_ADMIN_PASSWORD:
    env.CRM_DEFAULT_ADMIN_PASSWORD || process.env.CRM_DEFAULT_ADMIN_PASSWORD || 'admin123456',
  CRM_DEFAULT_ADMIN_NAME:
    env.CRM_DEFAULT_ADMIN_NAME || process.env.CRM_DEFAULT_ADMIN_NAME || 'Aionsoft Admin'
};

const baseDefinitions = [
  {
    name: 'contacts',
    type: 'auth',
    schema: [
      { name: 'name', type: 'text', required: true },
      { name: 'email', type: 'email' },
      { name: 'phone', type: 'text' },
      { name: 'company', type: 'text' },
      { name: 'status', type: 'text', required: true },
      { name: 'notes', type: 'text' },
      { name: 'owner', type: 'text' }
    ]
  },
  {
    name: 'deals',
    type: 'base',
    schema: [
      { name: 'title', type: 'text', required: true },
      { name: 'contact', type: 'relation', required: false, options: { collectionId: 'contacts', cascadeDelete: false } },
      { name: 'value', type: 'number' },
      { name: 'stage', type: 'text', required: true },
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
      { name: 'status', type: 'text', required: true },
      { name: 'priority', type: 'text', required: true },
      { name: 'assignee', type: 'text' },
      { name: 'due_date', type: 'date' },
      { name: 'deal', type: 'relation', required: false, options: { collectionId: 'deals', cascadeDelete: false } }
    ]
  },
  {
    name: 'activities',
    type: 'base',
    schema: [
      { name: 'type', type: 'text', required: true },
      { name: 'summary', type: 'text', required: true },
      { name: 'related_contact', type: 'relation', required: false, options: { collectionId: 'contacts', cascadeDelete: false } },
      { name: 'related_deal', type: 'relation', required: false, options: { collectionId: 'deals', cascadeDelete: false } },
      { name: 'owner', type: 'text' }
    ]
  }
];

function ensureEnvFile() {
  if (existsSync(envFilePath)) return;

  const fileContent = [
    'PB_URL=http://127.0.0.1:8090',
    'PB_EMAIL=admin@aionsoft.local',
    'PB_PASSWORD=admin123456',
    'CRM_DEFAULT_ADMIN_EMAIL=admin@aionsoft.local',
    'CRM_DEFAULT_ADMIN_PASSWORD=admin123456',
    'CRM_DEFAULT_ADMIN_NAME=Aionsoft Admin',
    ''
  ].join('\n');

  mkdirSync(dirname(envFilePath), { recursive: true });
  writeFileSync(envFilePath, fileContent, 'utf8');
}

async function waitForPocketBase(url) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${url.replace(/\/$/, '')}/api/health`);

      if (response.ok) {
        return new PocketBase(url);
      }
    } catch {
      // retry until the API is ready
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`PocketBase was not reachable at ${url} after waiting.`);
}

async function bootstrapCollections(client) {
  const existing = await client.collections.getFullList({ batch: 200, sort: 'name' });
  const map = new Map(existing.map((collection) => [collection.name, collection]));

  for (const definition of baseDefinitions) {
    const existingCollection = map.get(definition.name);

    if (existingCollection) {
      console.log(`Collection exists: ${definition.name}`);
      continue;
    }

    const collectionData = {
      name: definition.name,
      type: definition.type,
      schema: definition.schema.map((field) => ({
        ...field,
        presentable: !!field.required,
        hidden: false,
        required: Boolean(field.required),
        unique: field.unique ?? false,
        options: field.options ?? undefined
      }))
    };

    const created = await client.collections.create(collectionData);
    console.log(`Created collection: ${created.name}`);
  }
}

async function ensureAdminUser(client) {
  const email = envVars.CRM_DEFAULT_ADMIN_EMAIL;
  const password = envVars.CRM_DEFAULT_ADMIN_PASSWORD;
  const name = envVars.CRM_DEFAULT_ADMIN_NAME;

  if (!email || !password) {
    console.log('Skipping default admin seeding because CRM_DEFAULT_ADMIN_EMAIL/PASSWORD are not set.');
    return;
  }

  try {
    const existing = await client.collection('users').getFirstListItem(`email="${email}"`);

    if (existing) {
      console.log(`Default admin already exists: ${email}`);
      return;
    }
  } catch {
    // ignore missing user
  }

  await client.collection('users').create({
    email,
    password,
    passwordConfirm: password,
    name,
    emailVisibility: true,
    verified: true
  });

  console.log(`Created default admin user: ${email}`);
}

async function main() {
  ensureEnvFile();

  const url = envVars.PB_URL;
  const client = await waitForPocketBase(url);

  try {
    await client.admins.authWithPassword(envVars.PB_EMAIL, envVars.PB_PASSWORD);
  } catch {
    console.warn('PocketBase admin auth failed. If PB_EMAIL/PB_PASSWORD are not yet initialized, run the PocketBase admin setup first.');
  }

  await bootstrapCollections(client);
  await ensureCrmCompanyCollections(client);
  await ensureAdminUser(client);

  console.log(`PocketBase bootstrap complete for ${url}`);
}

main().catch((error) => {
  console.error('PocketBase bootstrap failed:', error);
  process.exit(1);
});
