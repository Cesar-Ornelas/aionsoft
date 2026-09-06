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
  }
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
    options: normalizedOptions ?? undefined,
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
    if (!existingMap.has(field.name)) {
      merged.push(field);
    }
  }

  return merged;
}
