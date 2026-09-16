import { DocumentDataAccessError } from './data-access-error.js';
import { normalizePageConfig } from './page-config.js';
import { normalizeTableCellAttrs, TABLE_COLOR_PALETTE } from './table-cell.js';
import { tokenStyleAttribute, normalizeTokenStyle, normalizeLineHeight, paragraphStyleAttribute } from './token-style.js';

const BLOCK_TYPES = new Set(['doc', 'paragraph', 'heading', 'bulletList', 'orderedList', 'listItem', 'blockquote', 'horizontalRule', 'page_break', 'table', 'tableRow', 'tableCell', 'tableHeader']);
const INLINE_TYPES = new Set(['text', 'document_field', 'document_variable', 'hardBreak', 'image']);
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
    normalized.attrs = { fieldId: fieldId || null, fieldKey: fieldKey || null, label: String(node.attrs?.label ?? (fieldKey || fieldId)).trim(), ...normalizeTokenStyle(node.attrs) };
    const format = String(node.attrs?.format ?? '').trim();
    if (DATE_FORMATS.has(format)) normalized.attrs.format = format;
    return normalized;
  }
  if (node.type === 'document_variable') {
    const variableKey = String(node.attrs?.variableKey ?? '').trim();
    if (!variableKey) fail('Document variables need a variable key.', { index });
    normalized.attrs = { variableKey, label: String(node.attrs?.label ?? variableKey).trim(), ...normalizeTokenStyle(node.attrs) };
    return normalized;
  }
  if (node.type === 'image') {
    const resourceKey = String(node.attrs?.resourceKey ?? '').trim();
    const width = node.attrs?.width == null ? null : Math.min(100, Math.max(1, Number(node.attrs.width)));
    const widthPx = node.attrs?.widthPx == null ? null : Math.min(4000, Math.max(1, Number(node.attrs.widthPx)));
    const heightPx = node.attrs?.heightPx == null ? null : Math.min(4000, Math.max(1, Number(node.attrs.heightPx)));
    if (!resourceKey || (width !== null && !Number.isFinite(width)) || (widthPx !== null && !Number.isFinite(widthPx)) || (heightPx !== null && !Number.isFinite(heightPx))) fail('Document images need a resource key and valid dimensions.', { index });
    normalized.attrs = { resourceKey, alt: String(node.attrs?.alt ?? '').trim().slice(0, 240), width, widthPx, heightPx };
    return normalized;
  }
  if (node.type === 'heading') {
    const level = Number(node.attrs?.level ?? 2);
    if (!ALLOWED_HEADING_LEVELS.has(level)) fail('Document headings must use levels 1, 2, or 3.', { index });
    normalized.attrs = { level };
  }
  if (node.type === 'paragraph') {
    const paragraphAttrs = {};
    if (['left', 'center', 'right', 'justify'].includes(node.attrs?.textAlign)) paragraphAttrs.textAlign = node.attrs.textAlign;
    const lineHeight = normalizeLineHeight(node.attrs?.lineHeight);
    if (lineHeight) paragraphAttrs.lineHeight = lineHeight;
    if (Object.keys(paragraphAttrs).length) normalized.attrs = paragraphAttrs;
  }
  if (node.type === 'tableCell' || node.type === 'tableHeader') {
    normalized.attrs = normalizeTableCellAttrs(node.attrs);
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

export function extractDocumentVariableReferences(content) {
  const normalized = normalizeDocumentContent(content);
  const references = [];
  walk(normalized.content, (node) => { if (node.type === 'document_variable') references.push(clone(node.attrs)); });
  return references;
}

export function validateDocumentVariableReferences(content, variables = []) {
  const available = new Set(variables.filter((variable) => variable.status !== 'archived').map((variable) => variable.key));
  const references = extractDocumentVariableReferences(content);
  for (const reference of references) {
    if (!available.has(reference.variableKey)) fail(`Document variable reference does not resolve: ${reference.label || reference.variableKey}.`, { reference });
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

function renderInline(nodes, values, fields, resourceMap = new Map(), variableMap = new Map()) {
  return (nodes ?? []).map((node) => {
    if (node.type === 'text') {
      let html = escapeHtml(node.text);
      for (const mark of node.marks ?? []) if (mark.type === 'bold') html = `<strong>${html}</strong>`; else if (mark.type === 'italic') html = `<em>${html}</em>`; else if (mark.type === 'fontSize') html = `<span style="font-size:${mark.attrs.size}">${html}</span>`; else if (mark.type === 'code') html = `<code>${html}</code>`;
      return html;
    }
    if (node.type === 'hardBreak') return '<br />';
    if (node.type === 'document_field') {
      const field = fields.find((candidate) => candidate.id === node.attrs.fieldId || candidate.fieldKey === node.attrs.fieldKey);
      const value = field ? values[field.id] ?? values[field.fieldKey] : '';
      const formattedValue = formatFieldValue(value, node.attrs.format || 'long', field);
      return `<span data-document-field="${escapeHtml(node.attrs.fieldKey || node.attrs.fieldId)}"${tokenStyleAttribute(node.attrs)}>${escapeHtml(formattedValue)}</span>`;
    }
    if (node.type === 'document_variable') return `<span data-document-variable="${escapeHtml(node.attrs.variableKey)}"${tokenStyleAttribute(node.attrs)}>${escapeHtml(variableMap.get(node.attrs.variableKey) ?? '')}</span>`;
    if (node.type === 'image') {
      const resource = resourceMap.get(node.attrs.resourceKey);
      if (!resource?.url) return '';
      const width = node.attrs.widthPx ? `width:${node.attrs.widthPx}px;` : node.attrs.width ? `width:${node.attrs.width}%;` : 'max-width:100%;';
      const height = node.attrs.heightPx ? `height:${node.attrs.heightPx}px;` : 'height:auto;';
      return `<img src="${escapeHtml(resource.url)}" alt="${escapeHtml(node.attrs.alt)}" style="${width}${height}display:block" />`;
    }
    return '';
  }).join('');
}

function renderNode(node, values, fields, resourceMap = new Map(), variableMap = new Map()) {
  if (node.type === 'paragraph') return `<p${paragraphStyleAttribute(node.attrs)}>${renderInline(node.content, values, fields, resourceMap, variableMap)}</p>`;
  if (node.type === 'heading') return `<h${node.attrs.level}>${renderInline(node.content, values, fields, resourceMap, variableMap)}</h${node.attrs.level}>`;
  if (node.type === 'blockquote') return `<blockquote>${(node.content ?? []).map((child) => renderNode(child, values, fields, resourceMap, variableMap)).join('')}</blockquote>`;
  if (node.type === 'bulletList') return `<ul>${(node.content ?? []).map((child) => renderNode(child, values, fields, resourceMap, variableMap)).join('')}</ul>`;
  if (node.type === 'orderedList') return `<ol>${(node.content ?? []).map((child) => renderNode(child, values, fields, resourceMap, variableMap)).join('')}</ol>`;
  if (node.type === 'listItem') return `<li>${(node.content ?? []).map((child) => child.type === 'paragraph' ? renderInline(child.content, values, fields, resourceMap, variableMap) : renderNode(child, values, fields, resourceMap, variableMap)).join('')}</li>`;
  if (node.type === 'horizontalRule') return '<hr />';
  if (node.type === 'page_break') return '<div class="document-page-break" data-page-break="true" style="break-before:page;page-break-before:always" aria-hidden="true"></div>';
  if (node.type === 'table') return `<table class="document-table" style="width:100%;border-collapse:collapse"><tbody>${(node.content ?? []).map((child) => renderNode(child, values, fields, resourceMap, variableMap)).join('')}</tbody></table>`;
  if (node.type === 'tableRow') return `<tr>${(node.content ?? []).map((child) => renderNode(child, values, fields, resourceMap, variableMap)).join('')}</tr>`;
  if (node.type === 'tableHeader') return `<th${cellAttributes(node)}>${(node.content ?? []).map((child) => renderNode(child, values, fields, resourceMap, variableMap)).join('')}</th>`;
  if (node.type === 'tableCell') return `<td${cellAttributes(node)}>${(node.content ?? []).map((child) => renderNode(child, values, fields, resourceMap, variableMap)).join('')}</td>`;
  return '';
}

function renderAuthoredInline(nodes) {
  return (nodes ?? []).map((node) => {
    if (node.type === 'text') {
      let html = escapeHtml(node.text);
      for (const mark of node.marks ?? []) if (mark.type === 'bold') html = `<strong>${html}</strong>`; else if (mark.type === 'italic') html = `<em>${html}</em>`; else if (mark.type === 'fontSize') html = `<span style="font-size:${mark.attrs.size}">${html}</span>`; else if (mark.type === 'code') html = `<code>${html}</code>`;
      return html;
    }
    if (node.type === 'hardBreak') return '<br />';
    if (node.type === 'document_field') return `<span class="document-authored-field" data-document-field="${escapeHtml(node.attrs.fieldKey || node.attrs.fieldId)}"${tokenStyleAttribute(node.attrs)}>@${escapeHtml(node.attrs.label || node.attrs.fieldKey || node.attrs.fieldId)}</span>`;
    if (node.type === 'document_variable') return `<span class="document-authored-variable" data-document-variable="${escapeHtml(node.attrs.variableKey)}"${tokenStyleAttribute(node.attrs)}>#${escapeHtml(node.attrs.label || node.attrs.variableKey)}</span>`;
    if (node.type === 'image') return `<span class="document-authored-image" data-resource-key="${escapeHtml(node.attrs.resourceKey)}">[Image: ${escapeHtml(node.attrs.alt || node.attrs.resourceKey)}]</span>`;
    return '';
  }).join('');
}

function renderAuthoredNode(node) {
  if (node.type === 'paragraph') return `<p${paragraphStyleAttribute(node.attrs)}>${renderAuthoredInline(node.content)}</p>`;
  if (node.type === 'heading') return `<h${node.attrs.level}>${renderAuthoredInline(node.content)}</h${node.attrs.level}>`;
  if (node.type === 'blockquote') return `<blockquote>${(node.content ?? []).map(renderAuthoredNode).join('')}</blockquote>`;
  if (node.type === 'bulletList') return `<ul>${(node.content ?? []).map(renderAuthoredNode).join('')}</ul>`;
  if (node.type === 'orderedList') return `<ol>${(node.content ?? []).map(renderAuthoredNode).join('')}</ol>`;
  if (node.type === 'listItem') return `<li>${(node.content ?? []).map((child) => child.type === 'paragraph' ? renderAuthoredInline(child.content) : renderAuthoredNode(child)).join('')}</li>`;
  if (node.type === 'horizontalRule') return '<hr />';
  if (node.type === 'page_break') return '<div class="document-page-break" data-page-break="true" aria-label="Page break"></div>';
  if (node.type === 'table') return `<table class="document-table"><tbody>${(node.content ?? []).map(renderAuthoredNode).join('')}</tbody></table>`;
  if (node.type === 'tableRow') return `<tr>${(node.content ?? []).map(renderAuthoredNode).join('')}</tr>`;
  if (node.type === 'tableHeader') return `<th${cellAttributes(node)}>${(node.content ?? []).map(renderAuthoredNode).join('')}</th>`;
  if (node.type === 'tableCell') return `<td${cellAttributes(node)}>${(node.content ?? []).map(renderAuthoredNode).join('')}</td>`;
  return '';
}

function cellAttributes(node) {
  const attrs = normalizeTableCellAttrs(node.attrs);
  const styles = ['border:0', 'padding:0.35rem 0.5rem', `vertical-align:${attrs.verticalAlign === 'middle' ? 'middle' : attrs.verticalAlign}`];
  if (attrs.widthMode === 'fill') styles.push('width:100%');
  if (attrs.widthMode === 'custom') styles.push(`width:${attrs.widthPercent}%`);
  if (attrs.backgroundColor) styles.push(`background-color:${TABLE_COLOR_PALETTE[attrs.backgroundColor]}`);
  if (attrs.textColor) styles.push(`color:${TABLE_COLOR_PALETTE[attrs.textColor]}`);
  if (attrs.textAlign !== 'left') styles.push(`text-align:${attrs.textAlign}`);
  return ` style="${styles.join(';')}"${attrs.colspan > 1 ? ` colspan="${attrs.colspan}"` : ''}${attrs.rowspan > 1 ? ` rowspan="${attrs.rowspan}"` : ''}`;
}

function renderLayoutNode(node, values, fields, authored = false, resourceMap = new Map(), variableMap = new Map()) {
  const inline = authored ? renderAuthoredInline(node.content) : renderInline(node.content, values, fields, resourceMap, variableMap);
  if (node.type === 'paragraph') return `<p${paragraphStyleAttribute(node.attrs)}>${inline}</p>`;
  if (node.type === 'table') return `<table class="document-layout-table" style="width:100%;border:0;border-collapse:collapse;border-spacing:0;margin:0;padding:0"><tbody>${(node.content ?? []).map((child) => renderLayoutNode(child, values, fields, authored, resourceMap, variableMap)).join('')}</tbody></table>`;
  if (node.type === 'tableRow') return `<tr>${(node.content ?? []).map((child) => renderLayoutNode(child, values, fields, authored, resourceMap, variableMap)).join('')}</tr>`;
  if (node.type === 'tableHeader' || node.type === 'tableCell') {
    const tag = node.type === 'tableHeader' ? 'th' : 'td';
    const attrs = normalizeTableCellAttrs(node.attrs);
    const styles = ['border:0', 'margin:0', 'padding:0', `vertical-align:${attrs.verticalAlign === 'middle' ? 'middle' : attrs.verticalAlign}`];
    if (attrs.widthMode === 'fill') styles.push('width:100%');
    if (attrs.widthMode === 'custom') styles.push(`width:${attrs.widthPercent}%`);
    if (attrs.backgroundColor) styles.push(`background-color:${TABLE_COLOR_PALETTE[attrs.backgroundColor]}`);
    if (attrs.textColor) styles.push(`color:${TABLE_COLOR_PALETTE[attrs.textColor]}`);
    if (attrs.textAlign !== 'left') styles.push(`text-align:${attrs.textAlign}`);
    return `<${tag} style="${styles.join(';')}"${attrs.colspan > 1 ? ` colspan="${attrs.colspan}"` : ''}${attrs.rowspan > 1 ? ` rowspan="${attrs.rowspan}"` : ''}>${(node.content ?? []).map((child) => renderLayoutNode(child, values, fields, authored, resourceMap, variableMap)).join('')}</${tag}>`;
  }
  return '';
}

function renderPageLayout(bodyHtml, pageConfig, renderRichText) {
  const config = normalizePageConfig(pageConfig);
  const margins = config.margins;
  const headerHtml = renderRichText(config.header);
  const footerHtml = renderRichText(config.footer);
  const header = headerHtml.replace(/<p><\/p>/g, '') ? `<header class="document-header">${headerHtml}</header>` : '';
  const footer = footerHtml.replace(/<p><\/p>/g, '') ? `<footer class="document-footer">${footerHtml}</footer>` : '';
  return `<div class="document-page" style="--document-margin-top:${margins.top}in;--document-margin-right:${margins.right}in;--document-margin-bottom:${margins.bottom}in;--document-margin-left:${margins.left}in"><style>@page{margin:${margins.top}in ${margins.right}in ${margins.bottom}in ${margins.left}in}.document-page{padding:var(--document-margin-top) var(--document-margin-right) var(--document-margin-bottom) var(--document-margin-left)}.document-header{margin-bottom:1rem}.document-footer{margin-top:1rem}</style>${header}${bodyHtml}${footer}</div>`;
}

export function renderDocumentHtml(content, values = {}, formSchema = { fields: [] }, pageConfig = null, resources = [], variables = []) {
  const normalized = normalizeDocumentContent(content);
  validateFieldReferences(normalized, formSchema);
  validateDocumentVariableReferences(normalized, variables);
  const normalizedPageConfig = normalizePageConfig(pageConfig);
  validateDocumentVariableReferences(normalizedPageConfig.header, variables);
  validateDocumentVariableReferences(normalizedPageConfig.footer, variables);
  const fields = [];
  const collect = (items) => (items ?? []).forEach((field) => { fields.push(field); collect(field.fields); });
  collect(formSchema.fields);
  const resourceMap = new Map(resources.map((resource) => [resource.resourceKey, resource]));
  const variableMap = new Map(variables.filter((variable) => variable.status !== 'archived').map((variable) => [variable.key, variable.value]));
  const bodyHtml = normalized.content.map((node) => renderNode(node, values, fields, resourceMap, variableMap)).join('');
  return renderPageLayout(bodyHtml, normalizedPageConfig, (richText) => richText.content.map((node) => renderLayoutNode(node, values, fields, false, resourceMap, variableMap)).join(''));
}

export function renderAuthoredDocumentHtml(content, pageConfig = null) {
  const normalized = normalizeDocumentContent(content);
  return renderPageLayout(normalized.content.map(renderAuthoredNode).join(''), pageConfig, (richText) => richText.content.map((node) => renderLayoutNode(node, {}, [], true)).join(''));
}
