import { DataAccessError } from './data-access-error.js';

const KEY_PATTERN = /^[a-z][a-z0-9_]*$/;
const clean = (value) => String(value ?? '').trim();

function fail(code, message, details = {}) {
  throw new DataAccessError(code, message, { details });
}

export function normalizeDocumentVariable(input, { partial = false } = {}) {
  const variable = input && typeof input === 'object' ? input : {};
  const key = variable.key === undefined && partial ? undefined : clean(variable.key);
  const label = variable.label === undefined && partial ? undefined : clean(variable.label);
  const value = variable.value === undefined && partial ? undefined : String(variable.value ?? '');
  const description = variable.description === undefined && partial ? undefined : clean(variable.description);
  const status = variable.status === undefined && partial ? undefined : clean(variable.status || 'active');

  if (key !== undefined) {
    if (!key) fail('INVALID_INPUT', 'Variable key is required.');
    if (!KEY_PATTERN.test(key)) fail('INVALID_INPUT', 'Variable keys must use lowercase letters, numbers, and underscores.');
  }
  if (label !== undefined && !label) fail('INVALID_INPUT', 'Variable label is required.');
  if (value !== undefined && value.length > 10000) fail('INVALID_INPUT', 'Variable values must be 10,000 characters or fewer.');
  if (description !== undefined && description.length > 1000) fail('INVALID_INPUT', 'Variable descriptions must be 1,000 characters or fewer.');
  if (status !== undefined && !['active', 'archived'].includes(status)) fail('INVALID_INPUT', 'Variable status must be active or archived.');

  return {
    ...(variable.id ? { id: clean(variable.id) } : {}),
    ...(key !== undefined ? { key } : {}),
    ...(label !== undefined ? { label } : {}),
    ...(value !== undefined ? { value } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(variable.createdAt ? { createdAt: variable.createdAt } : {}),
    ...(variable.updatedAt ? { updatedAt: variable.updatedAt } : {})
  };
}

export function normalizeDocumentVariables(items) {
  if (!Array.isArray(items)) fail('INVALID_INPUT', 'Document variables must be an array.');
  const variables = items.map((item) => normalizeDocumentVariable(item));
  const keys = new Set();
  for (const variable of variables) {
    if (keys.has(variable.key)) fail('CONFLICT', `Document variable key is duplicated: ${variable.key}.`, { key: variable.key });
    keys.add(variable.key);
  }
  return variables;
}

export function variableKey(value) {
  const key = clean(value);
  if (!KEY_PATTERN.test(key)) fail('INVALID_INPUT', 'Variable keys must use lowercase letters, numbers, and underscores.');
  return key;
}
