import { describe, expect, test } from 'bun:test';
import { evaluateFormula, detectFormulaCycles } from '$lib/management/model/form-calculations.js';
import { normalizeFormSchema, activeSubmissionData, getVisibleFormFields } from '$lib/management/model/form-schema.js';
import { validateFormValues } from '$lib/management/model/form-validation.js';

const schemaInput = {
  fields: [
    { id: 'kind', fieldKey: 'kind', type: 'select', label: 'Kind', options: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }], validation: { required: true } },
    { id: 'amount', fieldKey: 'amount', type: 'number', label: 'Amount', validation: { min: 1 } },
    { id: 'details', fieldKey: 'details', type: 'text', label: 'Details', condition: { fieldId: 'kind', values: ['a'] } },
    { id: 'total', fieldKey: 'total', type: 'calculation', label: 'Total', formula: '[amount] * 1.2' }
  ]
};

describe('form schema foundation', () => {
  test('normalizes fields and excludes hidden conditional values', () => {
    const schema = normalizeFormSchema(schemaInput);
    expect(schema.fields[0].fieldKey).toBe('kind');
    expect(getVisibleFormFields(schema, { kind: 'b' }).map(({ field }) => field.id)).not.toContain('details');
    expect(activeSubmissionData(schema, { kind: 'b', details: 'private' })).toEqual({ kind: 'b' });
  });

  test('validates required, numeric, and choice values', () => {
    const schema = normalizeFormSchema(schemaInput);
    expect(validateFormValues(schema, { kind: '', amount: 0 })).toEqual({ kind: 'This field is required.', amount: 'Value must be at least 1.' });
    expect(validateFormValues(schema, { kind: 'invalid', amount: 10 }).kind).toBe('Select a valid option.');
  });

  test('evaluates only the restricted arithmetic grammar', () => {
    expect(evaluateFormula('([amount] + 5) * -2', { amount: 10 })).toBe(-30);
    expect(() => evaluateFormula('Function("return 1")()', {})).toThrow();
    expect(() => evaluateFormula('[amount] / 0', { amount: 1 })).toThrow();
  });

  test('detects circular formula dependencies', () => {
    expect(() => detectFormulaCycles([
      { fieldKey: 'first', formula: '[second] + 1' },
      { fieldKey: 'second', formula: '[first] + 1' }
    ])).toThrow();
  });
});
