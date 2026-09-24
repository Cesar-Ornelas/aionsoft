import { FormSchemaError } from './form-errors.js';
import { detectFormulaCycles, formulaFieldKeys } from './form-calculations.js';

const FIELD_TYPES = new Set(['text', 'textarea', 'number', 'money', 'percent', 'date', 'datetime', 'radio', 'select', 'button-select', 'checkbox', 'button-multi-select', 'calculation', 'aggregate', 'derived-hidden', 'list', 'section', 'template-section', 'divider', 'hidden', 'file', 'signature', 'user-select']);
const OPTION_TYPES = new Set(['radio', 'select', 'button-select', 'checkbox', 'button-multi-select']);
const CALCULATION_TYPES = new Set(['calculation', 'derived-hidden']);
const LIST_CHILD_TYPES = new Set(['text', 'textarea', 'number', 'money', 'percent', 'date', 'datetime', 'radio', 'select', 'button-select', 'checkbox', 'button-multi-select']);
const AGGREGATE_OPERATIONS = new Set(['sum', 'avg']);
const MAX_REGEX_LENGTH = 256;

const clean = (value) => String(value ?? '').trim();
const clone = (value) => structuredClone(value);
const normalizeFieldType = (value) => clean(value) === 'repeatable-group' ? 'section' : clean(value);

function schemaError(code, message, details = {}) {
  return new FormSchemaError(code, message, { details });
}

function normalizeValidation(validation = {}) {
  const result = {};
  for (const key of ['required', 'minLength', 'maxLength', 'min', 'max', 'minRows', 'maxRows', 'pattern', 'patternMessage']) {
    if (validation[key] !== undefined) result[key] = validation[key];
  }
  if (result.minLength !== undefined && (!Number.isInteger(result.minLength) || result.minLength < 0)) throw schemaError('INVALID_INPUT', 'Minimum length must be a non-negative integer.');
  if (result.maxLength !== undefined && (!Number.isInteger(result.maxLength) || result.maxLength < 0)) throw schemaError('INVALID_INPUT', 'Maximum length must be a non-negative integer.');
  if (result.minLength !== undefined && result.maxLength !== undefined && result.maxLength < result.minLength) throw schemaError('INVALID_INPUT', 'Maximum length must be at least minimum length.');
  if (result.minRows !== undefined && (!Number.isInteger(result.minRows) || result.minRows < 0)) throw schemaError('INVALID_INPUT', 'Minimum rows must be a non-negative integer.');
  if (result.maxRows !== undefined && (!Number.isInteger(result.maxRows) || result.maxRows < 1)) throw schemaError('INVALID_INPUT', 'Maximum rows must be a positive integer.');
  if (result.minRows !== undefined && result.maxRows !== undefined && result.maxRows < result.minRows) throw schemaError('INVALID_INPUT', 'Maximum rows must be at least minimum rows.');
  if (result.pattern !== undefined) {
    if (typeof result.pattern !== 'string' || result.pattern.length > MAX_REGEX_LENGTH) throw schemaError('INVALID_INPUT', 'Validation patterns must be short strings.');
    try { new RegExp(result.pattern); } catch { throw schemaError('INVALID_INPUT', 'Validation pattern is invalid.'); }
  }
  return result;
}

function normalizeField(field, index, parentId = null) {
  const type = normalizeFieldType(field.type);
  if (!FIELD_TYPES.has(type)) throw schemaError('INVALID_INPUT', `Unsupported form field type: ${type || 'empty'}.`, { fieldIndex: index });
  const id = clean(field.id);
  const label = clean(field.label);
  if (!id || !label) throw schemaError('INVALID_INPUT', 'Every form field needs an id and label.', { fieldIndex: index });
  const normalized = { id, type, label, fieldKey: clean(field.fieldKey) || undefined, placeholder: clean(field.placeholder) || undefined, helpText: clean(field.helpText) || undefined, validation: normalizeValidation(field.validation), ...(field.defaultValue !== undefined && { defaultValue: clone(field.defaultValue) }), ...(field.colSpan !== undefined && { colSpan: field.colSpan }) };
  if (field.condition) normalized.condition = { fieldId: clean(field.condition.fieldId), values: (field.condition.values ?? []).map(clean).filter(Boolean) };
  if (normalized.colSpan !== undefined && ![1, 0.5].includes(normalized.colSpan)) throw schemaError('INVALID_INPUT', 'Field column span must be 1 or 0.5.', { fieldId: id });
  if (OPTION_TYPES.has(type)) {
    if (!Array.isArray(field.options)) throw schemaError('INVALID_INPUT', 'Choice fields need an options array.', { fieldId: id });
    normalized.options = field.options.map((option) => ({ label: clean(option.label), value: clean(option.value) }));
    if (normalized.options.some((option) => !option.label || !option.value)) throw schemaError('INVALID_INPUT', 'Choice options need labels and values.', { fieldId: id });
    if (new Set(normalized.options.map((option) => option.value)).size !== normalized.options.length) throw schemaError('CONFLICT', 'Choice option values must be unique.', { fieldId: id });
  }
  if (CALCULATION_TYPES.has(type)) {
    normalized.formula = clean(field.formula);
    normalized.calculationFormat = field.calculationFormat || 'number';
    if (!normalized.formula) throw schemaError('INVALID_INPUT', 'Calculated fields need a formula.', { fieldId: id });
  }
  if (type === 'aggregate') {
    normalized.sourceListFieldId = clean(field.sourceListFieldId);
    normalized.sourceChildFieldId = clean(field.sourceChildFieldId);
    normalized.operation = clean(field.operation);
    normalized.calculationFormat = field.calculationFormat || 'number';
    if (!normalized.sourceListFieldId || !normalized.sourceChildFieldId || !AGGREGATE_OPERATIONS.has(normalized.operation)) throw schemaError('INVALID_INPUT', 'Aggregate fields need a List, numeric column, and operation.', { fieldId: id });
  }
  if (type === 'list') {
    if (parentId) throw schemaError('INVALID_INPUT', 'Lists must be top-level fields.', { fieldId: id });
    normalized.fields = (field.fields ?? []).map((child, childIndex) => normalizeField(child, childIndex, id));
    if (!normalized.fields.length) throw schemaError('INVALID_INPUT', 'Lists need at least one column.', { fieldId: id });
    if (normalized.fields.some((child) => !LIST_CHILD_TYPES.has(child.type) || child.condition)) throw schemaError('INVALID_INPUT', 'Lists may only contain scalar input fields without conditions.', { fieldId: id });
  }
  if (type === 'section' || type === 'template-section') {
    normalized.fields = (field.fields ?? []).map((child, childIndex) => normalizeField(child, childIndex, id));
    if (normalized.fields.some((child) => child.type === 'section' || child.type === 'template-section' || child.type === 'list')) throw schemaError('INVALID_INPUT', 'Sections may only contain one level of scalar fields.', { fieldId: id });
  }
  return normalized;
}

function collectFields(fields, result = [], parentId = null) {
  for (const field of fields) {
    result.push({ field, parentId });
    if (field.fields) collectFields(field.fields, result, field.id);
  }
  return result;
}

export function normalizeFormSchema(input) {
  if (!input || !Array.isArray(input.fields)) throw schemaError('INVALID_INPUT', 'Form schema must contain a fields array.');
  const fields = input.fields.map((field, index) => normalizeField(field, index));
  const entries = collectFields(fields);
  const ids = new Set();
  const keys = new Set();
  for (const { field } of entries) {
    if (ids.has(field.id)) throw schemaError('CONFLICT', `Form field id is duplicated: ${field.id}.`, { fieldId: field.id });
    ids.add(field.id);
    if (field.fieldKey) {
      if (!/^[a-z][a-z0-9_]*$/.test(field.fieldKey)) throw schemaError('INVALID_INPUT', 'Field keys must use lowercase letters, numbers, and underscores.', { fieldId: field.id });
      if (keys.has(field.fieldKey)) throw schemaError('CONFLICT', `Form field key is duplicated: ${field.fieldKey}.`, { fieldId: field.id });
      keys.add(field.fieldKey);
    }
  }
  for (const { field } of entries) {
    if (field.type !== 'aggregate') continue;
    const listField = fields.find((candidate) => candidate.id === field.sourceListFieldId && candidate.type === 'list');
    const childField = listField?.fields?.find((candidate) => candidate.id === field.sourceChildFieldId);
    if (!listField || !childField) throw schemaError('BROKEN_REFERENCE', 'Aggregate source must reference a column in an existing List.', { fieldId: field.id });
    if (!['number', 'money', 'percent'].includes(childField.type)) throw schemaError('INVALID_INPUT', 'Aggregate source columns must be numeric.', { fieldId: field.id });
  }
  const fieldKeys = new Set([...keys]);
  for (const { field } of entries) {
    if (!field.formula) continue;
    for (const reference of formulaFieldKeys(field.formula)) {
      if (!fieldKeys.has(reference)) throw schemaError('BROKEN_REFERENCE', `Formula references an unknown field key: ${reference}.`, { fieldId: field.id });
    }
  }
  detectFormulaCycles(entries.map(({ field }) => field));
  const fieldIds = new Set(entries.map(({ field }) => field.id));
  for (const { field } of entries) {
    if (field.condition && (!fieldIds.has(field.condition.fieldId) || field.condition.fieldId === field.id)) throw schemaError('BROKEN_REFERENCE', `Condition references an unknown field: ${field.condition.fieldId}.`, { fieldId: field.id });
  }
  return { fields };
}

export function flattenFormFields(schema) {
  return collectFields(schema.fields).map(({ field, parentId }) => ({ field, parentId }));
}

export function getVisibleFormFields(schema, values = {}) {
  const visible = [];
  for (const { field, parentId } of flattenFormFields(schema)) {
    if (field.condition) {
      const actual = values[field.condition.fieldId];
      const actualValues = Array.isArray(actual) ? actual : [actual];
      if (!field.condition.values.some((expected) => actualValues.includes(expected))) continue;
    }
    visible.push({ field, parentId });
  }
  return visible;
}

export function activeSubmissionData(schema, values = {}) {
  const result = {};
  for (const { field, parentId } of getVisibleFormFields(schema, values)) {
    if (parentId || ['section', 'template-section', 'divider', 'calculation', 'aggregate', 'derived-hidden'].includes(field.type)) continue;
    if (!Object.hasOwn(values, field.id)) continue;
    if (field.type !== 'list') {
      result[field.id] = values[field.id];
      continue;
    }
    const allowedIds = new Set((field.fields ?? []).map((child) => child.id));
    result[field.id] = (Array.isArray(values[field.id]) ? values[field.id] : []).map((row) => Object.fromEntries(Object.entries(row ?? {}).filter(([childId]) => allowedIds.has(childId))));
  }
  return result;
}

export { FIELD_TYPES, OPTION_TYPES, LIST_CHILD_TYPES };
