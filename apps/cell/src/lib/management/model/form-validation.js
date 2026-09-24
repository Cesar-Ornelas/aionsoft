import { getVisibleFormFields } from './form-schema.js';

const empty = (value) => value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);

function validateFieldValue(field, value, errorKey, errors) {
  const rules = field.validation ?? {};
  if (rules.required && empty(value)) errors[errorKey] = 'This field is required.';
  if (empty(value)) return;
  if (typeof value === 'string') {
    if (rules.minLength !== undefined && value.length < rules.minLength) errors[errorKey] = `Use at least ${rules.minLength} characters.`;
    if (rules.maxLength !== undefined && value.length > rules.maxLength) errors[errorKey] = `Use no more than ${rules.maxLength} characters.`;
    if (rules.pattern && !new RegExp(rules.pattern).test(value)) errors[errorKey] = rules.patternMessage || 'Value has an invalid format.';
  }
  if (['number', 'money', 'percent'].includes(field.type)) {
    const number = Number(value);
    if (!Number.isFinite(number)) errors[errorKey] = 'Enter a valid number.';
    else if (rules.min !== undefined && number < rules.min) errors[errorKey] = `Value must be at least ${rules.min}.`;
    else if (rules.max !== undefined && number > rules.max) errors[errorKey] = `Value must be no more than ${rules.max}.`;
  }
  if (['select', 'radio', 'button-select'].includes(field.type) && !field.options.some((option) => option.value === value)) errors[errorKey] = 'Select a valid option.';
  if (['checkbox', 'button-multi-select'].includes(field.type) && (!Array.isArray(value) || value.some((entry) => !field.options.some((option) => option.value === entry)))) errors[errorKey] = 'Select only valid options.';
}

export function validateFormValues(schema, values = {}) {
  const errors = {};
  for (const { field, parentId } of getVisibleFormFields(schema, values)) {
    if (parentId && schema.fields.some((candidate) => candidate.id === parentId && candidate.type === 'list')) continue;
    if (['section', 'template-section', 'divider', 'calculation', 'aggregate', 'derived-hidden'].includes(field.type)) continue;
    const value = values[field.id];
    if (field.type !== 'list') {
      validateFieldValue(field, value, field.id, errors);
      continue;
    }
    const rows = Array.isArray(value) ? value : [];
    const minimumRows = Math.max(field.validation?.required ? 1 : 0, field.validation?.minRows ?? 0);
    if (!Array.isArray(value) && !empty(value)) errors[field.id] = 'List values must be rows.';
    else if (rows.length < minimumRows) errors[field.id] = `Add at least ${minimumRows} row${minimumRows === 1 ? '' : 's'}.`;
    else if (field.validation?.maxRows !== undefined && rows.length > field.validation.maxRows) errors[field.id] = `Use no more than ${field.validation.maxRows} rows.`;
    rows.forEach((row, rowIndex) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        errors[`${field.id}.${rowIndex}`] = 'Enter a valid row.';
        return;
      }
      for (const child of field.fields ?? []) validateFieldValue(child, row[child.id], `${field.id}.${rowIndex}.${child.id}`, errors);
    });
  }
  return errors;
}
