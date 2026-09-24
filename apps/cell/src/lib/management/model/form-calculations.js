import { FormSchemaError } from './form-errors.js';

const TOKEN = /\[([a-z][a-z0-9_]*)\]/g;
const OPERATORS = new Set(['+', '-', '*', '/', '(', ')']);

function tokenize(formula) {
  const tokens = [];
  let index = 0;
  while (index < formula.length) {
    if (/\s/.test(formula[index])) { index += 1; continue; }
    const token = formula.slice(index).match(/^\[([a-z][a-z0-9_]*)\]|^(\d+(?:\.\d+)?)|^([+\-*/()])/);
    if (!token) throw new FormSchemaError('INVALID_FORMULA', 'Formula contains an unsupported token.');
    tokens.push(token[1] ? { type: 'field', value: token[1] } : token[2] ? { type: 'number', value: Number(token[2]) } : { type: token[3], value: token[3] });
    index += token[0].length;
  }
  return tokens;
}

function parse(formula) {
  const tokens = tokenize(formula);
  let cursor = 0;
  const peek = () => tokens[cursor];
  const consume = () => tokens[cursor++];
  function primary() {
    const token = consume();
    if (!token) throw new FormSchemaError('INVALID_FORMULA', 'Formula ended unexpectedly.');
    if (token.type === 'number' || token.type === 'field') return token;
    if (token.type === '(') {
      const expression = addSub();
      if (consume()?.type !== ')') throw new FormSchemaError('INVALID_FORMULA', 'Formula has an unmatched parenthesis.');
      return { type: 'group', expression };
    }
    if (token.type === '-') return { type: 'negate', expression: primary() };
    throw new FormSchemaError('INVALID_FORMULA', 'Formula expected a value.');
  }
  function mulDiv() {
    let left = primary();
    while (peek() && ['*', '/'].includes(peek().type)) { const operator = consume().type; left = { type: operator, left, right: primary() }; }
    return left;
  }
  function addSub() {
    let left = mulDiv();
    while (peek() && ['+', '-'].includes(peek().type)) { const operator = consume().type; left = { type: operator, left, right: mulDiv() }; }
    return left;
  }
  const tree = addSub();
  if (cursor !== tokens.length) throw new FormSchemaError('INVALID_FORMULA', 'Formula contains trailing tokens.');
  return tree;
}

function evaluate(tree, values) {
  if (tree.type === 'number') return tree.value;
  if (tree.type === 'field') return Number(values[tree.value] ?? 0) || 0;
  if (tree.type === 'negate') return -evaluate(tree.expression, values);
  if (tree.type === 'group') return evaluate(tree.expression, values);
  const left = evaluate(tree.left, values);
  const right = evaluate(tree.right, values);
  if (tree.type === '/' && right === 0) throw new FormSchemaError('INVALID_FORMULA', 'Formula cannot divide by zero.');
  return tree.type === '+' ? left + right : tree.type === '-' ? left - right : tree.type === '*' ? left * right : left / right;
}

export function formulaFieldKeys(formula) {
  return [...formula.matchAll(TOKEN)].map((match) => match[1]);
}

export function parseFormula(formula) {
  return parse(String(formula ?? ''));
}

export function evaluateFormula(formula, values = {}) {
  return evaluate(parseFormula(formula), values);
}

export function evaluateAggregate(field, values = {}, listField = null) {
  if (!field || !listField || field.sourceListFieldId !== listField.id) return 0;
  const child = (listField.fields ?? []).find((candidate) => candidate.id === field.sourceChildFieldId);
  if (!child || !['number', 'money', 'percent'].includes(child.type)) return 0;
  const listValue = values[listField.id] ?? values[listField.fieldKey];
  const rows = Array.isArray(listValue) ? listValue : [];
  const numbers = rows
    .map((row) => row?.[child.id] ?? row?.[child.fieldKey])
    .filter((value) => value !== undefined && value !== null && value !== '')
    .map(Number)
    .filter(Number.isFinite);
  if (!numbers.length) return 0;
  const total = numbers.reduce((sum, value) => sum + value, 0);
  return field.operation === 'avg' ? total / numbers.length : total;
}

export function materializeAggregateValues(schema, values = {}) {
  const result = { ...values };
  for (const field of schema?.fields ?? []) {
    if (field.type !== 'aggregate') continue;
    const listField = schema.fields.find((candidate) => candidate.id === field.sourceListFieldId && candidate.type === 'list');
    const value = evaluateAggregate(field, result, listField);
    result[field.id] = value;
    if (field.fieldKey) result[field.fieldKey] = value;
  }
  return result;
}

export function detectFormulaCycles(fields) {
  const formulas = new Map(fields.filter((field) => field.formula && field.fieldKey).map((field) => [field.fieldKey, formulaFieldKeys(field.formula)]));
  const visiting = new Set();
  const visited = new Set();
  function visit(key) {
    if (visiting.has(key)) throw new FormSchemaError('CIRCULAR_FORMULA', `Formula dependency cycle includes ${key}.`, { fieldKey: key });
    if (visited.has(key)) return;
    visiting.add(key);
    for (const dependency of formulas.get(key) ?? []) if (formulas.has(dependency)) visit(dependency);
    visiting.delete(key);
    visited.add(key);
  }
  for (const key of formulas.keys()) visit(key);
  return false;
}

export { OPERATORS };
