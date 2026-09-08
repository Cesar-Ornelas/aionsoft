import { getVisibleFormFields } from './form-schema.js';

const empty = (value) => value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);

export function validateFormValues(schema, values = {}) {
  const errors = {};
  for (const { field } of getVisibleFormFields(schema, values)) {
    if (['section', 'template-section', 'divider', 'calculation', 'derived-hidden'].includes(field.type)) continue;
    const value = values[field.id];
    const rules = field.validation ?? {};
    if (rules.required && empty(value)) errors[field.id] = 'This field is required.';
    if (empty(value)) continue;
    if (typeof value === 'string') {
      if (rules.minLength !== undefined && value.length < rules.minLength) errors[field.id] = `Use at least ${rules.minLength} characters.`;
      if (rules.maxLength !== undefined && value.length > rules.maxLength) errors[field.id] = `Use no more than ${rules.maxLength} characters.`;
      if (rules.pattern && !new RegExp(rules.pattern).test(value)) errors[field.id] = rules.patternMessage || 'Value has an invalid format.';
    }
    if (['number', 'money', 'percent'].includes(field.type)) {
      const number = Number(value);
      if (!Number.isFinite(number)) errors[field.id] = 'Enter a valid number.';
      else if (rules.min !== undefined && number < rules.min) errors[field.id] = `Value must be at least ${rules.min}.`;
      else if (rules.max !== undefined && number > rules.max) errors[field.id] = `Value must be no more than ${rules.max}.`;
    }
    if (['select', 'radio', 'button-select'].includes(field.type) && !field.options.some((option) => option.value === value)) errors[field.id] = 'Select a valid option.';
    if (['checkbox', 'button-multi-select'].includes(field.type) && (!Array.isArray(value) || value.some((entry) => !field.options.some((option) => option.value === entry)))) errors[field.id] = 'Select only valid options.';
  }
  return errors;
}
