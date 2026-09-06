const COLLECTIONS = Object.freeze({
  operationsAccounts: 'operations_accounts',
  operationsEvents: 'operations_events',
  operationsEventAttendees: 'operations_event_attendees',
  accounts: 'crm_accounts',
  contacts: 'crm_contacts',
  addresses: 'crm_addresses',
  relationships: 'crm_account_relationships'
});

const BASE_DEFINITIONS = [
  {
    name: COLLECTIONS.operationsAccounts,
    fields: [
      textField('name', true),
      textField('description'),
      textField('status', true),
      ...timestampFields()
    ],
    indexes: [
      'CREATE INDEX `idx_operations_accounts_name` ON `operations_accounts` (`name`)',
      'CREATE INDEX `idx_operations_accounts_status` ON `operations_accounts` (`status`)'
    ]
  },
  {
    name: COLLECTIONS.operationsEvents,
    fields: [
      textField('type', true),
      textField('title', true),
      textField('description'),
      dateField('starts_at', true),
      dateField('ends_at'),
      boolField('all_day'),
      textField('url'),
      textField('status', true),
      ...timestampFields()
    ],
    indexes: [
      'CREATE INDEX `idx_operations_events_account_starts_at` ON `operations_events` (`account`, `starts_at`)',
      'CREATE INDEX `idx_operations_events_account_status` ON `operations_events` (`account`, `status`)'
    ]
  },
  {
    name: COLLECTIONS.operationsEventAttendees,
    fields: [
      textField('kind', true),
      textField('participant_id', true),
      textField('name', true),
      textField('email'),
      textField('job_title'),
      ...timestampFields()
    ],
    indexes: [
      'CREATE UNIQUE INDEX `idx_operations_event_attendees_event_participant` ON `operations_event_attendees` (`event`, `kind`, `participant_id`)',
      'CREATE INDEX `idx_operations_event_attendees_event` ON `operations_event_attendees` (`event`)'
    ]
  },
  {
    name: COLLECTIONS.accounts,
    fields: [
      textField('type', true),
      textField('legal_name', true),
      textField('display_name'),
      textField('lifecycle', true),
      textField('phone'),
      textField('phone_normalized'),
      ...timestampFields()
    ],
    indexes: [
      'CREATE INDEX `idx_crm_accounts_legal_name` ON `crm_accounts` (`legal_name`)',
      'CREATE INDEX `idx_crm_accounts_display_name` ON `crm_accounts` (`display_name`)',
      'CREATE INDEX `idx_crm_accounts_lifecycle` ON `crm_accounts` (`lifecycle`)',
      'CREATE INDEX `idx_crm_accounts_phone` ON `crm_accounts` (`phone_normalized`)'
    ]
  },
  {
    name: COLLECTIONS.contacts,
    fields: [
      textField('first_name', true),
      textField('last_name', true),
      textField('job_title'),
      emailField('email'),
      textField('phone'),
      textField('phone_normalized'),
      textField('extension'),
      ...timestampFields()
    ],
    indexes: [
      'CREATE INDEX `idx_crm_contacts_phone` ON `crm_contacts` (`phone_normalized`)',
      'CREATE INDEX `idx_crm_contacts_email` ON `crm_contacts` (`email`)'
    ]
  },
  {
    name: COLLECTIONS.addresses,
    fields: [
      textField('label', true),
      textField('type', true),
      textField('line_1', true),
      textField('line_2'),
      textField('city', true),
      textField('region'),
      textField('postal_code', true),
      textField('country', true),
      ...timestampFields()
    ],
    indexes: ['CREATE INDEX `idx_crm_addresses_postal_code` ON `crm_addresses` (`postal_code`)']
  },
  {
    name: COLLECTIONS.relationships,
    fields: [textField('type', true), ...timestampFields()],
    indexes: []
  }
];

function textField(name, required = false) {
  return { name, type: 'text', required, presentable: required, hidden: false };
}

function emailField(name) {
  return { name, type: 'email', required: false, presentable: false, hidden: false };
}

function dateField(name, required = false) {
  return { name, type: 'date', required, presentable: required, hidden: false };
}

function boolField(name, required = false) {
  return { name, type: 'bool', required, presentable: false, hidden: false };
}

function timestampFields() {
  return [
    { name: 'created', type: 'autodate', onCreate: true, onUpdate: false, presentable: false, hidden: false },
    { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true, presentable: false, hidden: false }
  ];
}

function relationField(name, collectionId, required, cascadeDelete) {
  return {
    name,
    type: 'relation',
    collectionId,
    cascadeDelete,
    maxSelect: 1,
    required,
    presentable: required,
    hidden: false
  };
}

function getCustomFields(collection) {
  return (collection?.fields ?? collection?.schema ?? []).filter((field) => !field?.system);
}

function mergeMissingFields(existingFields, desiredFields) {
  const desiredByName = new Map(desiredFields.map((field) => [field.name, field]));
  const merged = existingFields.map((field) => desiredByName.get(field.name) ?? field);
  const names = new Set(existingFields.map((field) => field.name));
  return [...merged, ...desiredFields.filter((field) => !names.has(field.name))];
}

function hasRelationDifferences(existingFields, desiredFields) {
  return desiredFields.some((desired) => {
    if (desired.type !== 'relation') return false;
    const existing = existingFields.find((field) => field.name === desired.name);
    return existing && (
      existing.required !== desired.required ||
      existing.cascadeDelete !== desired.cascadeDelete ||
      existing.collectionId !== desired.collectionId
    );
  });
}

/**
 * Additively creates the CRM company collections and their relations.
 * Existing fields and records are never removed.
 *
 * @param {import('pocketbase').default} client
 */
export async function ensureCrmCompanyCollections(client) {
  const existing = await client.collections.getFullList({ batch: 200, sort: 'name' });
  const collections = new Map(existing.map((collection) => [collection.name, collection]));

  for (const definition of BASE_DEFINITIONS) {
    if (collections.has(definition.name)) continue;

    const created = await client.collections.create({
      name: definition.name,
      type: 'base',
      fields: definition.fields,
      // The events relation is added in the reconciliation pass below.
      indexes: [COLLECTIONS.operationsEvents, COLLECTIONS.operationsEventAttendees].includes(definition.name) ? [] : definition.indexes,
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null
    });
    collections.set(created.name, created);
    console.log(`Created CRM collection: ${created.name}`);
  }

  const relationDefinitions = new Map([
    [COLLECTIONS.operationsAccounts, []],
    [COLLECTIONS.operationsEvents, [relationField('account', collections.get(COLLECTIONS.operationsAccounts).id, true, false)]],
    [COLLECTIONS.operationsEventAttendees, [relationField('event', collections.get(COLLECTIONS.operationsEvents).id, true, true)]],
    [COLLECTIONS.accounts, [
      relationField('primary_contact', collections.get(COLLECTIONS.contacts).id, false, false),
      relationField('operations_account', collections.get(COLLECTIONS.operationsAccounts).id, false, false)
    ]],
    [COLLECTIONS.contacts, [relationField('account', collections.get(COLLECTIONS.accounts).id, false, false)]],
    [COLLECTIONS.addresses, [relationField('account', collections.get(COLLECTIONS.accounts).id, true, true)]],
    [COLLECTIONS.relationships, [
      relationField('source_account', collections.get(COLLECTIONS.accounts).id, true, true),
      relationField('target_account', collections.get(COLLECTIONS.accounts).id, true, true)
    ]]
  ]);

  for (const definition of BASE_DEFINITIONS) {
    const collection = await client.collections.getOne(definition.name);
    const existingFields = getCustomFields(collection);
    const desiredFields = [...definition.fields, ...(relationDefinitions.get(definition.name) ?? [])];
    const mergedFields = mergeMissingFields(existingFields, desiredFields);
    const hasFieldDifferences = mergedFields.length !== existingFields.length || hasRelationDifferences(existingFields, desiredFields);
    const indexesDiffer = JSON.stringify(collection.indexes ?? []) !== JSON.stringify(definition.indexes);
    const rulesAreOpen = [collection.listRule, collection.viewRule, collection.createRule, collection.updateRule, collection.deleteRule]
      .some((rule) => rule !== null);

    if (!hasFieldDifferences && !indexesDiffer && !rulesAreOpen) {
      console.log(`CRM collection already matches schema: ${definition.name}`);
      continue;
    }

    const updated = await client.collections.update(collection.id, {
      fields: mergedFields,
      indexes: definition.indexes,
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null
    });
    collections.set(updated.name, updated);
    console.log(`Updated CRM collection schema: ${updated.name}`);
  }
}

export { COLLECTIONS as CRM_COLLECTIONS };
