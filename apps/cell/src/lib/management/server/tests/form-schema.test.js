import { describe, expect, test } from 'bun:test';
import { evaluateFormula, evaluateAggregate, materializeAggregateValues, detectFormulaCycles } from '$lib/management/model/form-calculations.js';
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

  test('normalizes legacy repeatable groups to supported sections', () => {
    const schema = normalizeFormSchema({
      fields: [{
        id: 'group',
        type: 'repeatable-group',
        label: 'Legacy group',
        fields: [{ id: 'name', type: 'text', label: 'Name' }]
      }]
    });

    expect(schema.fields[0].type).toBe('section');
    expect(schema.fields[0].fields[0].type).toBe('text');
  });

  test('normalizes Lists with scalar child fields and structured aggregates', () => {
    const schema = normalizeFormSchema({
      fields: [
        {
          id: 'services',
          fieldKey: 'services',
          type: 'list',
          label: 'Services',
          validation: { required: true, minRows: 1, maxRows: 20 },
          fields: [
            { id: 'service_name', fieldKey: 'name', type: 'text', label: 'Name', validation: { required: true } },
            { id: 'service_amount', fieldKey: 'amount', type: 'money', label: 'Amount', validation: { min: 0 } }
          ]
        },
        {
          id: 'services_total',
          fieldKey: 'services_total',
          type: 'aggregate',
          label: 'Services total',
          sourceListFieldId: 'services',
          sourceChildFieldId: 'service_amount',
          operation: 'sum',
          calculationFormat: 'currency'
        }
      ]
    });

    expect(schema.fields[0].validation).toEqual({ required: true, minRows: 1, maxRows: 20 });
    expect(schema.fields[1]).toMatchObject({ sourceListFieldId: 'services', sourceChildFieldId: 'service_amount', operation: 'sum' });
  });

  test('rejects unsupported List children and non-numeric aggregate sources', () => {
    expect(() => normalizeFormSchema({ fields: [{ id: 'items', type: 'list', label: 'Items', fields: [{ id: 'nested', type: 'list', label: 'Nested', fields: [] }] }] })).toThrow();
    expect(() => normalizeFormSchema({ fields: [
      { id: 'items', type: 'list', label: 'Items', fields: [{ id: 'name', type: 'text', label: 'Name' }] },
      { id: 'total', type: 'aggregate', label: 'Total', sourceListFieldId: 'items', sourceChildFieldId: 'name', operation: 'sum' }
    ] })).toThrow();
  });

  test('validates List rows by stable child field ids', () => {
    const schema = normalizeFormSchema({ fields: [{
      id: 'services', type: 'list', label: 'Services', validation: { minRows: 1 }, fields: [
        { id: 'service_name', type: 'text', label: 'Name', validation: { required: true } },
        { id: 'service_amount', type: 'money', label: 'Amount', validation: { min: 0 } }
      ]
    }] });

    expect(validateFormValues(schema, { services: [] })).toEqual({ services: 'Add at least 1 row.' });
    expect(validateFormValues(schema, { services: [{ service_name: '', service_amount: -1 }] })).toEqual({
      'services.0.service_name': 'This field is required.',
      'services.0.service_amount': 'Value must be at least 0.'
    });
    expect(activeSubmissionData(schema, { services: [{ service_name: 'Setup', service_amount: 10, rogue: 'discard' }], supplied_total: 999 })).toEqual({ services: [{ service_name: 'Setup', service_amount: 10 }] });
  });

  test('evaluates List sums and averages with empty values resolving to zero', () => {
    const listField = { id: 'services', fields: [{ id: 'service_amount', type: 'money' }] };
    const rows = { services: [{ service_amount: 10 }, { service_amount: '' }, { service_amount: 20 }] };

    expect(evaluateAggregate({ sourceListFieldId: 'services', sourceChildFieldId: 'service_amount', operation: 'sum' }, rows, listField)).toBe(30);
    expect(evaluateAggregate({ sourceListFieldId: 'services', sourceChildFieldId: 'service_amount', operation: 'avg' }, rows, listField)).toBe(15);
    expect(evaluateAggregate({ sourceListFieldId: 'services', sourceChildFieldId: 'service_amount', operation: 'avg' }, { services: [] }, listField)).toBe(0);
  });

  test('evaluates List aggregates from readable field-key aliases', () => {
    const list = { id: 'field-list', fieldKey: 'services', type: 'list', fields: [{ id: 'field-amount', fieldKey: 'service_amount', type: 'money' }] };
    const aggregate = { id: 'field-total', fieldKey: 'services_total', type: 'aggregate', sourceListFieldId: 'field-list', sourceChildFieldId: 'field-amount', operation: 'sum' };

    expect(evaluateAggregate(aggregate, { services: [{ service_amount: 10 }, { service_amount: 15 }] }, list)).toBe(25);
    expect(materializeAggregateValues({ fields: [list, aggregate] }, { services: [{ service_amount: 10 }, { service_amount: 15 }] })).toMatchObject({ 'field-total': 25, services_total: 25 });
  });
});
