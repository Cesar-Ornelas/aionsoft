export const MANAGEMENT_COLLECTION_DEFINITIONS = [
  {
    name: 'users',
    type: 'auth',
    schema: [
      { name: 'name', type: 'text', required: true },
      { name: 'username', type: 'text' },
      { name: 'status', type: 'text', required: true },
      { name: 'avatar', type: 'file', options: { maxSelect: 1, maxSize: 5242880, mimeTypes: ['image/*'] } },
      { name: 'emailVisibility', type: 'bool' },
      { name: 'verified', type: 'bool' },
      { name: 'first_name', type: 'text' },
      { name: 'last_name', type: 'text' },
      { name: 'timezone', type: 'text' },
      { name: 'last_login_at', type: 'date' }
    ]
  },
  {
    name: 'management_groups',
    type: 'base',
    schema: [
      { name: 'name', type: 'text', required: true },
      { name: 'slug', type: 'text', required: true },
      { name: 'description', type: 'text' },
      { name: 'status', type: 'text', required: true }
    ]
  },
  {
    name: 'management_permissions',
    type: 'base',
    schema: [
      { name: 'name', type: 'text', required: true },
      { name: 'key', type: 'text', required: true },
      { name: 'description', type: 'text' },
      { name: 'category', type: 'text' },
      { name: 'status', type: 'text', required: true }
    ]
  },
  {
    name: 'management_roles',
    type: 'base',
    schema: [
      { name: 'name', type: 'text', required: true },
      { name: 'key', type: 'text', required: true },
      { name: 'description', type: 'text' },
      { name: 'permissions', type: 'json' },
      { name: 'status', type: 'text', required: true }
    ]
  },
  {
    name: 'management_role_permissions',
    type: 'base',
    schema: [
      { name: 'role', type: 'relation', options: { collectionId: 'management_roles', cascadeDelete: false }, required: true },
      { name: 'permission', type: 'relation', options: { collectionId: 'management_permissions', cascadeDelete: false }, required: true }
    ]
  },
  {
    name: 'management_user_groups',
    type: 'base',
    schema: [
      { name: 'user', type: 'relation', options: { collectionId: 'users', cascadeDelete: true }, required: true },
      { name: 'group', type: 'relation', options: { collectionId: 'management_groups', cascadeDelete: true }, required: true }
    ]
  },
  {
    name: 'management_group_roles',
    type: 'base',
    schema: [
      { name: 'group', type: 'relation', options: { collectionId: 'management_groups', cascadeDelete: true }, required: true },
      { name: 'role', type: 'relation', options: { collectionId: 'management_roles', cascadeDelete: true }, required: true }
    ]
  },
  {
    name: 'management_migrations',
    type: 'base',
    schema: [
      { name: 'name', type: 'text', required: true },
      { name: 'version', type: 'text', required: true },
      { name: 'status', type: 'text', required: true },
      { name: 'checksum', type: 'text' },
      { name: 'applied_at', type: 'date' },
      { name: 'notes', type: 'text' }
    ]
  },
  {
    name: 'management_document_variables',
    type: 'base',
    schema: [
      { name: 'variable_key', type: 'text', required: true },
      { name: 'label', type: 'text', required: true },
      { name: 'value', type: 'text' },
      { name: 'description', type: 'text' },
      { name: 'status', type: 'text', required: true },
      { name: 'created_at', type: 'date', required: true },
      { name: 'updated_at', type: 'date', required: true }
    ],
    indexes: [
      'CREATE UNIQUE INDEX `idx_management_document_variables_key` ON `management_document_variables` (`variable_key`)'
    ]
  },
  {
    name: 'management_forms',
    type: 'base',
    schema: [
      { name: 'name', type: 'text', required: true },
      { name: 'description', type: 'text' },
      { name: 'category', type: 'text' },
      { name: 'status', type: 'text', required: true }
    ]
  },
  {
    name: 'management_form_versions',
    type: 'base',
    schema: [
      { name: 'form', type: 'relation', options: { collectionId: 'management_forms', cascadeDelete: true }, required: true },
      { name: 'version_number', type: 'number', required: true },
      { name: 'schema', type: 'json', required: true },
      { name: 'is_published', type: 'bool' },
      { name: 'status', type: 'text', required: true },
      { name: 'created_at', type: 'date', required: true }
    ]
  },
  {
    name: 'documents_templates',
    type: 'base',
    schema: [
      { name: 'name', type: 'text', required: true },
      { name: 'description', type: 'text' },
      { name: 'form_id', type: 'relation', options: { collectionId: 'management_forms', cascadeDelete: false } },
      { name: 'status', type: 'text', required: true }
    ]
  },
  {
    name: 'resources',
    type: 'base',
    schema: [
      { name: 'resource_key', type: 'text', required: true },
      { name: 'scope_key', type: 'text', required: true },
      { name: 'resource_type', type: 'text', required: true },
      { name: 'file', type: 'file', required: true, options: { maxSelect: 1, maxSize: 5242880, mimeTypes: ['image/png', 'image/jpeg'] } },
      { name: 'name', type: 'text', required: true },
      { name: 'media_type', type: 'text', required: true },
      { name: 'size_bytes', type: 'number', required: true },
      { name: 'checksum', type: 'text' },
      { name: 'width', type: 'number' },
      { name: 'height', type: 'number' },
      { name: 'created_at', type: 'date', required: true }
    ],
    indexes: [
      'CREATE UNIQUE INDEX `idx_resources_resource_key` ON `resources` (`resource_key`)',
      'CREATE INDEX `idx_resources_scope_type` ON `resources` (`scope_key`, `resource_type`)'
    ]
  },
  {
    name: 'documents_template_versions',
    type: 'base',
    schema: [
      { name: 'template', type: 'relation', options: { collectionId: 'documents_templates', cascadeDelete: true }, required: true },
      { name: 'version_number', type: 'number', required: true },
      { name: 'content', type: 'json', required: true },
      { name: 'sample_data', type: 'json' },
      { name: 'page_config', type: 'json' },
      { name: 'form_version', type: 'relation', options: { collectionId: 'management_form_versions', cascadeDelete: false } },
      { name: 'is_published', type: 'bool' },
      { name: 'status', type: 'text', required: true },
      { name: 'created_at', type: 'date', required: true }
    ]
  },
  {
    name: 'documents',
    type: 'base',
    schema: [
      { name: 'operations_account', type: 'relation', options: { collectionId: 'operations_accounts', cascadeDelete: false } },
      { name: 'template_version', type: 'relation', options: { collectionId: 'documents_template_versions', cascadeDelete: false }, required: true },
      { name: 'form_version', type: 'relation', options: { collectionId: 'management_form_versions', cascadeDelete: false } },
      { name: 'status', type: 'text', required: true },
      { name: 'data_snapshot', type: 'json', required: true },
      { name: 'rendered_html', type: 'text', required: true },
      { name: 'created_at', type: 'date', required: true }
    ]
  },
  {
    name: 'documents_review_comments',
    type: 'base',
    schema: [
      { name: 'template_version', type: 'relation', options: { collectionId: 'documents_template_versions', cascadeDelete: true }, required: true },
      { name: 'body', type: 'text', required: true },
      { name: 'excerpt', type: 'text' },
      { name: 'anchor', type: 'json', required: true },
      { name: 'issue_id', type: 'text' },
      { name: 'author_id', type: 'text' },
      { name: 'author_name', type: 'text' },
      { name: 'created_at', type: 'date', required: true }
    ]
  },
  {
    name: 'documents_review_comment_votes',
    type: 'base',
    schema: [
      { name: 'review_comment', type: 'relation', options: { collectionId: 'documents_review_comments', cascadeDelete: true }, required: true },
      { name: 'voter', type: 'relation', options: { collectionId: 'users', cascadeDelete: false }, required: true },
      { name: 'voter_name', type: 'text' },
      { name: 'created_at', type: 'date', required: true }
    ],
    indexes: [
      'CREATE UNIQUE INDEX `idx_documents_review_comment_votes_comment_voter` ON `documents_review_comment_votes` (`review_comment`, `voter`)',
      'CREATE INDEX `idx_documents_review_comment_votes_comment` ON `documents_review_comment_votes` (`review_comment`)'
    ]
  },
];

export function resolveCollectionIdName(collectionIdOrName, collectionIdMap = new Map()) {
  if (!collectionIdOrName || typeof collectionIdOrName !== 'string') return collectionIdOrName;
  if (collectionIdMap.has(collectionIdOrName)) return collectionIdMap.get(collectionIdOrName);
  return collectionIdOrName;
}

export function normalizeSchemaField(field, collectionIdMap = new Map()) {
  const isRelationField = field.type === 'relation';
  const safeType = field.type;

  const normalizedOptions = field.options && typeof field.options === 'object'
    ? { ...field.options }
    : undefined;

  if (normalizedOptions && typeof normalizedOptions.collectionId === 'string') {
    normalizedOptions.collectionId = resolveCollectionIdName(normalizedOptions.collectionId, collectionIdMap);
  }

  return {
    name: field.name,
    type: safeType,
    required: Boolean(field.required),
    unique: Boolean(field.unique),
    ...(isRelationField && normalizedOptions?.collectionId
      ? {
          collectionId: normalizedOptions.collectionId,
          cascadeDelete: Boolean(normalizedOptions.cascadeDelete),
          maxSelect: normalizedOptions.maxSelect ?? 1,
          minSelect: normalizedOptions.minSelect ?? 0
        }
      : { options: normalizedOptions ?? undefined }),
    presentable: Boolean(field.required),
    hidden: false
  };
}

export function createNormalizedSchema(definition, collectionIdMap = new Map()) {
  return definition.schema.map((field) => normalizeSchemaField(field, collectionIdMap));
}

export function getCollectionFields(existingCollection, definition) {
  const fields = existingCollection?.fields ?? existingCollection?.schema ?? [];
  return fields.filter((field) => !field?.system);
}

export function mergeCollectionSchema(existingCollection, definition, collectionIdMap = new Map()) {
  const desiredSchema = createNormalizedSchema(definition, collectionIdMap);
  const existingFields = getCollectionFields(existingCollection, definition);
  const existingMap = new Map(existingFields.map((field) => [field.name, field]));
  const merged = [...existingFields];

  for (const field of desiredSchema) {
    const existingField = existingMap.get(field.name);
    if (!existingField) {
      merged.push(field);
      continue;
    }

    if (existingField.required !== field.required) {
      const existingIndex = merged.findIndex((candidate) => candidate.name === field.name);
      merged[existingIndex] = { ...existingField, required: field.required };
    }
  }

  return merged;
}
