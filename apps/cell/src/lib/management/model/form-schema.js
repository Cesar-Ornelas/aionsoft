import { FormSchemaError } from './form-errors.js';
import { detectFormulaCycles, formulaFieldKeys } from './form-calculations.js';

const FIELD_TYPES = new Set(['text', 'textarea', 'number', 'money', 'percent', 'date', 'datetime', 'radio', 'select', 'button-select', 'checkbox', 'button-multi-select', 'calculation', 'derived-hidden', 'section', 'template-section', 'divider', 'hidden', 'file', 'signature', 'user-select']);
const OPTION_TYPES = new Set(['radio', 'select', 'button-select', 'checkbox', 'button-multi-select']);
const CALCULATION_TYPES = new Set(['calculation', 'derived-hidden']);
const MAX_REGEX_LENGTH = 256;

const clean = (value) => String(value ?? '').trim();
const clone = (value) => structuredClone(value);

function schemaError(code, message, details = {}) {
  return new FormSchemaError(code, message, { details });
}

function normalizeValidation(validation = {}) {
  const result = {};
  for (const key of ['required', 'minLength', 'maxLength', 'min', 'max', 'pattern', 'patternMessage']) {
    if (validation[key] !== undefined) result[key] = validation[key];
  }
  if (result.minLength !== undefined && (!Number.isInteger(result.minLength) || result.minLength < 0)) throw schemaError('INVALID_INPUT', 'Minimum length must be a non-negative integer.');
  if (result.maxLength !== undefined && (!Number.isInteger(result.maxLength) || result.maxLength < 0)) throw schemaError('INVALID_INPUT', 'Maximum length must be a non-negative integer.');
  if (result.minLength !== undefined && result.maxLength !== undefined && result.maxLength < result.minLength) throw schemaError('INVALID_INPUT', 'Maximum length must be at least minimum length.');
  if (result.pattern !== undefined) {
    if (typeof result.pattern !== 'string' || result.pattern.length > MAX_REGEX_LENGTH) throw schemaError('INVALID_INPUT', 'Validation patterns must be short strings.');
    try { new RegExp(result.pattern); } catch { throw schemaError('INVALID_INPUT', 'Validation pattern is invalid.'); }
  }
  return result;
}

function normalizeField(field, index, parentId = null) {
  const type = clean(field.type);
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
  if (type === 'section' || type === 'template-section') {
    normalized.fields = (field.fields ?? []).map((child, childIndex) => normalizeField(child, childIndex, id));
    if (normalized.fields.some((child) => child.type === 'section' || child.type === 'template-section')) throw schemaError('INVALID_INPUT', 'Sections may only contain one level of fields.', { fieldId: id });
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
  const visibleIds = new Set(getVisibleFormFields(schema, values).map(({ field }) => field.id));
  return Object.fromEntries(Object.entries(values).filter(([fieldId]) => visibleIds.has(fieldId)));
}

export { FIELD_TYPES, OPTION_TYPES };
