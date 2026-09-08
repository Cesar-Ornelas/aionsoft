import { DocumentDataAccessError } from './data-access-error.js';

const BLOCK_TYPES = new Set(['doc', 'paragraph', 'heading', 'bulletList', 'orderedList', 'listItem', 'blockquote', 'horizontalRule', 'page_break', 'table', 'tableRow', 'tableCell', 'tableHeader']);
const INLINE_TYPES = new Set(['text', 'document_field', 'hardBreak']);
const ALLOWED_HEADING_LEVELS = new Set([1, 2, 3]);
export const DATE_FORMATS = new Set(['long', 'medium', 'short', 'numeric', 'iso']);

const fail = (message, details = {}) => { throw new DocumentDataAccessError('INVALID_INPUT', message, { details }); };
const clone = (value) => structuredClone(value);

export function normalizeDocumentContent(input) {
  if (!input || typeof input !== 'object' || input.type !== 'doc' || !Array.isArray(input.content)) {
    fail('Document content must be a rich-text document.');
  }
  return { type: 'doc', content: input.content.map((node, index) => normalizeNode(node, index)) };
}

function normalizeNode(node, index) {
  if (!node || typeof node !== 'object' || !BLOCK_TYPES.has(node.type) && !INLINE_TYPES.has(node.type)) {
    fail(`Unsupported document content node at position ${index}.`, { index });
  }
  const normalized = { type: node.type };
  if (node.type === 'text') {
    if (typeof node.text !== 'string') fail('Text nodes must contain text.', { index });
    normalized.text = node.text;
    if (Array.isArray(node.marks)) normalized.marks = node.marks.filter((mark) => ['bold', 'italic', 'code'].includes(mark?.type)).map((mark) => ({ type: mark.type }));
    return normalized;
  }
  if (node.type === 'document_field') {
    const fieldId = String(node.attrs?.fieldId ?? '').trim();
    const fieldKey = String(node.attrs?.fieldKey ?? '').trim();
    if (!fieldId && !fieldKey) fail('Document field references need a field id or key.', { index });
    normalized.attrs = { fieldId: fieldId || null, fieldKey: fieldKey || null, label: String(node.attrs?.label ?? (fieldKey || fieldId)).trim() };
    const format = String(node.attrs?.format ?? '').trim();
    if (DATE_FORMATS.has(format)) normalized.attrs.format = format;
    return normalized;
  }
  if (node.type === 'heading') {
    const level = Number(node.attrs?.level ?? 2);
    if (!ALLOWED_HEADING_LEVELS.has(level)) fail('Document headings must use levels 1, 2, or 3.', { index });
    normalized.attrs = { level };
  }
  if (node.type === 'tableCell' || node.type === 'tableHeader') {
    const colspan = Math.max(1, Number(node.attrs?.colspan ?? 1));
    const rowspan = Math.max(1, Number(node.attrs?.rowspan ?? 1));
    normalized.attrs = { colspan, rowspan };
  }
  if (node.type === 'hardBreak') return normalized;
  if (node.type === 'horizontalRule') return normalized;
  if (node.type === 'page_break') return normalized;
  if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'listItem' || node.type === 'blockquote' || node.type === 'table' || node.type === 'tableRow' || node.type === 'tableCell' || node.type === 'tableHeader') {
    normalized.content = (node.content ?? []).map((child, childIndex) => normalizeNode(child, childIndex));
  } else if (node.type === 'bulletList' || node.type === 'orderedList') {
    normalized.content = (node.content ?? []).map((child, childIndex) => normalizeNode(child, childIndex));
  } else if (node.type === 'doc') {
    normalized.content = (node.content ?? []).map((child, childIndex) => normalizeNode(child, childIndex));
  }
  return normalized;
}

function walk(nodes, visitor) {
  for (const node of nodes ?? []) {
    visitor(node);
    walk(node.content, visitor);
  }
}

export function extractFieldReferences(content) {
  const normalized = normalizeDocumentContent(content);
  const references = [];
  walk(normalized.content, (node) => {
    if (node.type === 'document_field') references.push(clone(node.attrs));
  });
  return references;
}

export function validateFieldReferences(content, formSchema) {
  const references = extractFieldReferences(content);
  const fields = [];
  const collect = (items) => (items ?? []).forEach((field) => { fields.push(field); collect(field.fields); });
  collect(formSchema?.fields);
  for (const reference of references) {
    const field = fields.find((candidate) => candidate.id === reference.fieldId || candidate.fieldKey === reference.fieldKey);
    if (!field) fail(`Document field reference does not resolve: ${reference.label || reference.fieldKey || reference.fieldId}.`, { reference });
  }
  return references;
}

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function formatFieldValue(value, format, field) {
  if (field?.type !== 'date' || !format || format === 'iso') return value;
  const input = String(value ?? '').trim();
  if (!input) return '';
  const dateOnly = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dateOnly ? new Date(Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))) : new Date(input);
  if (Number.isNaN(date.getTime())) return value;
  const options = {
    long: { year: 'numeric', month: 'long', day: 'numeric' },
    medium: { year: 'numeric', month: 'short', day: 'numeric' },
    short: { year: 'numeric', month: '2-digit', day: '2-digit' },
    numeric: { year: 'numeric', month: 'numeric', day: 'numeric' }
  }[format];
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(date);
}

function renderInline(nodes, values, fields) {
  return (nodes ?? []).map((node) => {
    if (node.type === 'text') {
      let html = escapeHtml(node.text);
      for (const mark of node.marks ?? []) if (mark.type === 'bold') html = `<strong>${html}</strong>`; else if (mark.type === 'italic') html = `<em>${html}</em>`; else if (mark.type === 'code') html = `<code>${html}</code>`;
      return html;
    }
    if (node.type === 'hardBreak') return '<br />';
    if (node.type === 'document_field') {
      const field = fields.find((candidate) => candidate.id === node.attrs.fieldId || candidate.fieldKey === node.attrs.fieldKey);
      const value = field ? values[field.id] ?? values[field.fieldKey] : '';
      const formattedValue = formatFieldValue(value, node.attrs.format || 'long', field);
      return `<span data-document-field="${escapeHtml(node.attrs.fieldKey || node.attrs.fieldId)}">${escapeHtml(formattedValue)}</span>`;
    }
    return '';
  }).join('');
}

function renderNode(node, values, fields) {
  if (node.type === 'paragraph') return `<p>${renderInline(node.content, values, fields)}</p>`;
  if (node.type === 'heading') return `<h${node.attrs.level}>${renderInline(node.content, values, fields)}</h${node.attrs.level}>`;
  if (node.type === 'blockquote') return `<blockquote>${(node.content ?? []).map((child) => renderNode(child, values, fields)).join('')}</blockquote>`;
  if (node.type === 'bulletList') return `<ul>${(node.content ?? []).map((child) => renderNode(child, values, fields)).join('')}</ul>`;
  if (node.type === 'orderedList') return `<ol>${(node.content ?? []).map((child) => renderNode(child, values, fields)).join('')}</ol>`;
  if (node.type === 'listItem') return `<li>${(node.content ?? []).map((child) => child.type === 'paragraph' ? renderInline(child.content, values, fields) : renderNode(child, values, fields)).join('')}</li>`;
  if (node.type === 'horizontalRule') return '<hr />';
  if (node.type === 'page_break') return '<div class="document-page-break" data-page-break="true" style="break-before:page;page-break-before:always" aria-hidden="true"></div>';
  if (node.type === 'table') return `<table class="document-table" style="width:100%;border-collapse:collapse"><tbody>${(node.content ?? []).map((child) => renderNode(child, values, fields)).join('')}</tbody></table>`;
  if (node.type === 'tableRow') return `<tr>${(node.content ?? []).map((child) => renderNode(child, values, fields)).join('')}</tr>`;
  if (node.type === 'tableHeader') return `<th${cellAttributes(node)}>${(node.content ?? []).map((child) => renderNode(child, values, fields)).join('')}</th>`;
  if (node.type === 'tableCell') return `<td${cellAttributes(node)}>${(node.content ?? []).map((child) => renderNode(child, values, fields)).join('')}</td>`;
  return '';
}

function cellAttributes(node) {
  const colspan = Number(node.attrs?.colspan ?? 1);
  const rowspan = Number(node.attrs?.rowspan ?? 1);
  return ` style="border:0;padding:0.35rem 0.5rem;vertical-align:top"${colspan > 1 ? ` colspan="${colspan}"` : ''}${rowspan > 1 ? ` rowspan="${rowspan}"` : ''}`;
}

export function renderDocumentHtml(content, values = {}, formSchema = { fields: [] }) {
  const normalized = normalizeDocumentContent(content);
  validateFieldReferences(normalized, formSchema);
  const fields = [];
  const collect = (items) => (items ?? []).forEach((field) => { fields.push(field); collect(field.fields); });
  collect(formSchema.fields);
  return normalized.content.map((node) => renderNode(node, values, fields)).join('');
}
