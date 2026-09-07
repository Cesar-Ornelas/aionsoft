const COLLECTIONS = Object.freeze({
  operationsAccounts: 'operations_accounts',
  operationsEvents: 'operations_events',
  operationsEventAttendees: 'operations_event_attendees',
  operationsCalls: 'operations_calls',
  operationsIssues: 'operations_issues',
  accounts: 'crm_accounts',
  contacts: 'crm_contacts',
  addresses: 'crm_addresses',
  relationships: 'crm_account_relationships',
  catalogServices: 'catalog_services',
  catalogPriceOffers: 'catalog_price_offers',
  catalogPlans: 'catalog_plans',
  catalogPlanItems: 'catalog_plan_items'
  ,billingAgreements: 'billing_agreements'
  ,billingAgreementItems: 'billing_agreement_items'
  ,operationsIssueComments: 'operations_issue_comments'
  ,operationsIssueTags: 'operations_issue_tags'
  ,operationsIssueTagLinks: 'operations_issue_tag_links'
  ,operationsIssueAssignees: 'operations_issue_assignees'
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
    name: COLLECTIONS.operationsCalls,
    fields: [
      dateField('starts_at', true),
      textField('duration_minutes', true),
      textField('contact_id'),
      textField('contact_name'),
      emailField('contact_email'),
      textField('contact_job_title'),
      textField('direction', true),
      textField('outcome', true),
      textField('notes'),
      ...timestampFields()
    ],
    indexes: [
      'CREATE INDEX `idx_operations_calls_account_starts_at` ON `operations_calls` (`account`, `starts_at`)',
      'CREATE INDEX `idx_operations_calls_account_contact` ON `operations_calls` (`account`, `contact_id`)'
    ]
  },
  {
    name: COLLECTIONS.operationsIssues,
    fields: [
      textField('title', true),
      textField('description_markdown'),
      textField('type', true),
      textField('priority', true),
      textField('status', true),
      textField('due_date'),
      textField('created_by'),
      ...timestampFields()
    ],
    indexes: [
      'CREATE INDEX `idx_operations_issues_status` ON `operations_issues` (`status`)',
      'CREATE INDEX `idx_operations_issues_priority` ON `operations_issues` (`priority`)',
      'CREATE INDEX `idx_operations_issues_type` ON `operations_issues` (`type`)',
      'CREATE INDEX `idx_operations_issues_due_date` ON `operations_issues` (`due_date`)',
      'CREATE INDEX `idx_operations_issues_updated` ON `operations_issues` (`updated`)'
    ]
  },
  {
    name: COLLECTIONS.operationsIssueComments,
    fields: [textField('body_markdown', true), textField('author_id', true), ...timestampFields()],
    indexes: ['CREATE INDEX `idx_operations_issue_comments_issue` ON `operations_issue_comments` (`issue`)']
  },
  {
    name: COLLECTIONS.operationsIssueTags,
    fields: [textField('name', true), textField('color'), ...timestampFields()],
    indexes: ['CREATE UNIQUE INDEX `idx_operations_issue_tags_name` ON `operations_issue_tags` (`name`)']
  },
  {
    name: COLLECTIONS.operationsIssueTagLinks,
    fields: [...timestampFields()],
    indexes: ['CREATE UNIQUE INDEX `idx_operations_issue_tag_links_issue_tag` ON `operations_issue_tag_links` (`issue`, `tag`)']
  },
  {
    name: COLLECTIONS.operationsIssueAssignees,
    fields: [...timestampFields()],
    indexes: ['CREATE UNIQUE INDEX `idx_operations_issue_assignees_issue_user` ON `operations_issue_assignees` (`issue`, `user`)']
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
  },
  {
    name: COLLECTIONS.catalogServices,
    fields: [
      textField('name', true),
      textField('description'),
      textField('code', true),
      numberField('customer_price_cents'),
      numberField('internal_cost_cents'),
      textField('currency', true),
      textField('status', true),
      ...timestampFields()
    ],
    indexes: [
      'CREATE UNIQUE INDEX `idx_catalog_services_code` ON `catalog_services` (`code`)',
      'CREATE INDEX `idx_catalog_services_status` ON `catalog_services` (`status`)',
      'CREATE INDEX `idx_catalog_services_name` ON `catalog_services` (`name`)'
    ]
  },
  {
    name: COLLECTIONS.catalogPriceOffers,
    fields: [
      textField('name', true),
      textField('billing_basis', true),
      textField('unit_label', true),
      numberField('sale_price_cents'),
      numberField('internal_cost_cents'),
      textField('currency', true),
      dateField('effective_from'),
      dateField('effective_to'),
      textField('status', true),
      ...timestampFields()
    ],
    indexes: [
      'CREATE INDEX `idx_catalog_price_offers_service_status` ON `catalog_price_offers` (`service`, `status`)',
      'CREATE INDEX `idx_catalog_price_offers_effective_dates` ON `catalog_price_offers` (`effective_from`, `effective_to`)'
    ]
  },
  {
    name: COLLECTIONS.catalogPlans,
    fields: [
      textField('name', true),
      textField('description'),
      textField('code', true),
      numberField('bundle_price_cents', true),
      textField('currency', true),
      textField('term_unit', true),
      numberField('term_quantity', true),
      textField('commitment_enforcement', true),
      textField('unused_quantity_policy', true),
      dateField('effective_from'),
      dateField('effective_to'),
      textField('status', true),
      ...timestampFields()
    ],
    indexes: [
      'CREATE UNIQUE INDEX `idx_catalog_plans_code` ON `catalog_plans` (`code`)',
      'CREATE INDEX `idx_catalog_plans_status` ON `catalog_plans` (`status`)'
    ]
  },
  {
    name: COLLECTIONS.catalogPlanItems,
    fields: [
      numberField('included_quantity', true),
      numberField('overage_price_cents'),
      textField('unit_label', true),
      textField('overage_billing_basis'),
      ...timestampFields()
    ],
    indexes: [
      'CREATE UNIQUE INDEX `idx_catalog_plan_items_plan_service` ON `catalog_plan_items` (`plan`, `service`)',
      'CREATE UNIQUE INDEX `idx_catalog_plan_items_plan_offer` ON `catalog_plan_items` (`plan`, `price_offer`)',
      'CREATE INDEX `idx_catalog_plan_items_plan` ON `catalog_plan_items` (`plan`)'
    ]
  },
  {
    name: COLLECTIONS.billingAgreements,
    fields: [
      textField('agreement_number', true),
      textField('name', true),
      textField('status', true),
      dateField('effective_from'),
      dateField('effective_to'),
      textField('renewal_behavior', true),
      dateField('cancelled_at'),
      textField('cancellation_reason'),
      textField('notes'),
      ...timestampFields()
    ],
    indexes: [
      'CREATE UNIQUE INDEX `idx_billing_agreements_number` ON `billing_agreements` (`agreement_number`)',
      'CREATE INDEX `idx_billing_agreements_account_status` ON `billing_agreements` (`operations_account`, `status`)',
      'CREATE INDEX `idx_billing_agreements_effective_dates` ON `billing_agreements` (`effective_from`, `effective_to`)'
    ]
  },
  {
    name: COLLECTIONS.billingAgreementItems,
    fields: [
      numberField('quantity', true),
      textField('billing_basis', true),
      textField('unit_label', true),
      numberField('unit_price_cents', true),
      numberField('bundle_price_cents', true),
      textField('currency', true),
      dateField('effective_from'),
      dateField('effective_to'),
      textField('status', true),
      dateField('ended_at'),
      ...timestampFields()
    ],
    indexes: [
      'CREATE INDEX `idx_billing_agreement_items_agreement` ON `billing_agreement_items` (`agreement`)',
      'CREATE INDEX `idx_billing_agreement_items_status` ON `billing_agreement_items` (`status`)'
    ]
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

function numberField(name, required = false) {
  return { name, type: 'number', required, presentable: required, hidden: false };
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

function hasFieldDifferences(existingFields, desiredFields) {
  return desiredFields.some((desired) => {
    const existing = existingFields.find((field) => field.name === desired.name);
    return existing && (
      existing.type !== desired.type ||
      existing.required !== desired.required
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
      indexes: [
        COLLECTIONS.operationsEvents,
        COLLECTIONS.operationsEventAttendees,
        COLLECTIONS.operationsCalls,
          COLLECTIONS.operationsIssueComments,
          COLLECTIONS.operationsIssueTagLinks,
          COLLECTIONS.operationsIssueAssignees,
        COLLECTIONS.catalogPriceOffers,
        COLLECTIONS.catalogPlanItems,
        COLLECTIONS.billingAgreementItems,
        COLLECTIONS.billingAgreements
      ].includes(definition.name) ? [] : definition.indexes,
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
    [COLLECTIONS.operationsCalls, [relationField('account', collections.get(COLLECTIONS.operationsAccounts).id, true, false)]],
    [COLLECTIONS.operationsIssues, [
      relationField('company', collections.get(COLLECTIONS.accounts).id, false, false),
      relationField('operations_account', collections.get(COLLECTIONS.operationsAccounts).id, false, false)
    ]],
    [COLLECTIONS.operationsIssueComments, [
      relationField('issue', collections.get(COLLECTIONS.operationsIssues).id, true, true),
      relationField('author', collections.get('users').id, true, false)
    ]],
    [COLLECTIONS.operationsIssueTags, []],
    [COLLECTIONS.operationsIssueTagLinks, [
      relationField('issue', collections.get(COLLECTIONS.operationsIssues).id, true, true),
      relationField('tag', collections.get(COLLECTIONS.operationsIssueTags).id, true, true)
    ]],
    [COLLECTIONS.operationsIssueAssignees, [
      relationField('issue', collections.get(COLLECTIONS.operationsIssues).id, true, true),
      relationField('user', collections.get('users').id, true, false)
    ]],
    [COLLECTIONS.accounts, [
      relationField('primary_contact', collections.get(COLLECTIONS.contacts).id, false, false),
      relationField('operations_account', collections.get(COLLECTIONS.operationsAccounts).id, false, false)
    ]],
    [COLLECTIONS.contacts, [relationField('account', collections.get(COLLECTIONS.accounts).id, false, false)]],
    [COLLECTIONS.addresses, [relationField('account', collections.get(COLLECTIONS.accounts).id, true, true)]],
    [COLLECTIONS.relationships, [
      relationField('source_account', collections.get(COLLECTIONS.accounts).id, true, true),
      relationField('target_account', collections.get(COLLECTIONS.accounts).id, true, true)
    ]],
    [COLLECTIONS.catalogServices, []],
    [COLLECTIONS.catalogPriceOffers, [relationField('service', collections.get(COLLECTIONS.catalogServices).id, true, true)]],
    [COLLECTIONS.catalogPlans, []],
    [COLLECTIONS.catalogPlanItems, [
      relationField('plan', collections.get(COLLECTIONS.catalogPlans).id, true, true),
      relationField('service', collections.get(COLLECTIONS.catalogServices).id, false, false),
      relationField('price_offer', collections.get(COLLECTIONS.catalogPriceOffers).id, false, false)
    ]],
    [COLLECTIONS.billingAgreements, [
      relationField('operations_account', collections.get(COLLECTIONS.operationsAccounts).id, true, false),
      relationField('company', collections.get(COLLECTIONS.accounts).id, false, false)
    ]],
    [COLLECTIONS.billingAgreementItems, [
      relationField('agreement', collections.get(COLLECTIONS.billingAgreements).id, true, true),
      relationField('service', collections.get(COLLECTIONS.catalogServices).id, false, false),
      relationField('plan', collections.get(COLLECTIONS.catalogPlans).id, false, false),
      relationField('offer', collections.get(COLLECTIONS.catalogPriceOffers).id, false, false)
    ]]
  ]);

  for (const definition of BASE_DEFINITIONS) {
    const collection = await client.collections.getOne(definition.name);
    const existingFields = getCustomFields(collection);
    const desiredFields = [...definition.fields, ...(relationDefinitions.get(definition.name) ?? [])];
    const mergedFields = mergeMissingFields(existingFields, desiredFields);
    const fieldsDiffer = mergedFields.length !== existingFields.length || hasRelationDifferences(existingFields, desiredFields) || hasFieldDifferences(existingFields, desiredFields);
    const indexesDiffer = JSON.stringify(collection.indexes ?? []) !== JSON.stringify(definition.indexes);
    const rulesAreOpen = [collection.listRule, collection.viewRule, collection.createRule, collection.updateRule, collection.deleteRule]
      .some((rule) => rule !== null);

    if (!fieldsDiffer && !indexesDiffer && !rulesAreOpen) {
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
