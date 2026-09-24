import { materializeAggregateValues } from '$lib/management/model/form-calculations.js';
import { DocumentDataAccessError } from './data-access-error.js';
import { normalizePageConfig } from './page-config.js';
import { normalizeTableCellAttrs, normalizeTableColumnWidths, TABLE_COLOR_PALETTE } from './table-cell.js';
import { tokenStyleAttribute, normalizeTokenStyle, normalizeLineHeight, paragraphStyleAttribute } from './token-style.js';
import { documentClassAttribute, normalizeDocumentClasses } from './document-class.js';

const BLOCK_TYPES = new Set(['doc', 'paragraph', 'heading', 'bulletList', 'orderedList', 'listItem', 'blockquote', 'horizontalRule', 'page_break', 'table', 'tableRow', 'tableCell', 'tableHeader', 'section', 'sectionItem']);
const INLINE_TYPES = new Set(['text', 'document_field', 'document_variable', 'hardBreak', 'image']);
const ALLOWED_HEADING_LEVELS = new Set([1, 2, 3]);
export const DATE_FORMATS = new Set(['long', 'medium', 'short', 'numeric', 'iso']);

const fail = (message, details = {}) => { throw new DocumentDataAccessError('INVALID_INPUT', message, { details }); };
const clone = (value) => structuredClone(value);

export function normalizeDocumentContent(input) {
  if (!input || typeof input !== 'object' || input.type !== 'doc' || !Array.isArray(input.content)) {
    fail('Document content must be a rich-text document.');
  }
  const content = [];
  for (const [index, node] of input.content.entries()) {
    const normalized = normalizeNode(node, index);
    content.push(INLINE_TYPES.has(normalized.type) ? { type: 'paragraph', content: [normalized] } : normalized);
  }
  return { type: 'doc', content };
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
    const listFieldId = String(node.attrs?.listFieldId ?? '').trim();
    const listFieldKey = String(node.attrs?.listFieldKey ?? '').trim();
    const childFieldId = String(node.attrs?.childFieldId ?? '').trim();
    const childFieldKey = String(node.attrs?.childFieldKey ?? '').trim();
    const isListChild = (listFieldId || listFieldKey) && (childFieldId || childFieldKey);
    if (!fieldId && !fieldKey && !isListChild) fail('Document field references need a field id or key.', { index });
    normalized.attrs = { fieldId: fieldId || null, fieldKey: fieldKey || null, ...(isListChild && { listFieldId: listFieldId || null, listFieldKey: listFieldKey || null, childFieldId: childFieldId || null, childFieldKey: childFieldKey || null }), label: String(node.attrs?.label ?? (childFieldKey || childFieldId || fieldKey || fieldId)).trim(), ...normalizeTokenStyle(node.attrs) };
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
  if (node.type === 'table') {
    const columnWidths = normalizeTableColumnWidths(node.attrs?.columnWidths);
    const repeatListFieldId = String(node.attrs?.repeatListFieldId ?? '').trim();
    const repeatListFieldKey = String(node.attrs?.repeatListFieldKey ?? '').trim();
    const repeatRowIndex = Number(node.attrs?.repeatRowIndex ?? 1);
    const tableAttrs = { ...(columnWidths && { columnWidths }) };
    if (node.attrs?.className) tableAttrs.className = normalizeDocumentClasses(node.attrs.className);
    if (node.attrs?.rowClassName) tableAttrs.rowClassName = normalizeDocumentClasses(node.attrs.rowClassName);
    if (node.attrs?.sourceSyntax === 'list-table') {
      tableAttrs.sourceSyntax = 'list-table';
      tableAttrs.listTableLabel = String(node.attrs.listTableLabel ?? '').trim();
      tableAttrs.listTableColumns = (Array.isArray(node.attrs.listTableColumns) ? node.attrs.listTableColumns : []).map((column) => {
        const width = Number(column.width);
        const style = normalizeTokenStyle(column);
        return {
          childFieldId: String(column.childFieldId ?? '').trim() || null,
          childFieldKey: String(column.childFieldKey ?? '').trim() || null,
          className: column.className ? normalizeDocumentClasses(column.className) : '',
          width: Number.isFinite(width) && width >= 1 && width <= 100 ? width : null,
          fontSize: style.fontSize,
          ...(style.bold && { bold: true }),
          ...(style.italic && { italic: true }),
          textAlign: ['left', 'center', 'right'].includes(column.textAlign) ? column.textAlign : null
        };
      });
      tableAttrs.listTableSummaries = (Array.isArray(node.attrs.listTableSummaries) ? node.attrs.listTableSummaries : []).map((summary) => {
        const style = normalizeTokenStyle(summary);
        return {
          fieldId: String(summary.fieldId ?? '').trim() || null,
          fieldKey: String(summary.fieldKey ?? '').trim() || null,
          label: String(summary.label ?? summary.fieldKey ?? summary.fieldId ?? '').trim(),
          className: summary.className ? normalizeDocumentClasses(summary.className) : '',
          fontSize: style.fontSize,
          ...(style.bold && { bold: true }),
          ...(style.italic && { italic: true })
        };
      });
    }
    if (repeatListFieldId || repeatListFieldKey) {
      tableAttrs.repeatListFieldId = repeatListFieldId || null;
      tableAttrs.repeatListFieldKey = repeatListFieldKey || null;
      tableAttrs.repeatRowIndex = Number.isInteger(repeatRowIndex) && repeatRowIndex >= 0 ? repeatRowIndex : 1;
    }
    if (Object.keys(tableAttrs).length) normalized.attrs = tableAttrs;
  }
  if (node.type === 'sectionItem') {
    const width = node.attrs?.width == null ? null : Number(node.attrs.width);
    if (width !== null && (!Number.isFinite(width) || width < 1 || width > 100)) fail('Section item widths must be between 1 and 100 percent.', { index });
    const style = normalizeTokenStyle(node.attrs);
    normalized.attrs = {
      ...(node.attrs?.className ? { className: normalizeDocumentClasses(node.attrs.className) } : {}),
      ...(width !== null && { width }),
      fontSize: style.fontSize,
      ...(style.bold && { bold: true }),
      ...(style.italic && { italic: true }),
      ...(style.textColor && { textColor: style.textColor }),
      ...(style.backgroundColor && { backgroundColor: style.backgroundColor }),
      ...(['left', 'center', 'right'].includes(node.attrs?.textAlign) && { textAlign: node.attrs.textAlign })
    };
  }
  if (node.type === 'hardBreak') return normalized;
  if (node.type === 'horizontalRule') return normalized;
  if (node.type === 'page_break') return normalized;
  if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'listItem' || node.type === 'blockquote' || node.type === 'table' || node.type === 'tableRow' || node.type === 'tableCell' || node.type === 'tableHeader' || node.type === 'section' || node.type === 'sectionItem') {
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
    if (reference.listFieldId || reference.listFieldKey) {
      const listField = fields.find((candidate) => candidate.type === 'list' && (candidate.id === reference.listFieldId || candidate.fieldKey === reference.listFieldKey));
      const childField = listField?.fields?.find((candidate) => candidate.id === reference.childFieldId || candidate.fieldKey === reference.childFieldKey);
      if (!listField || !childField) fail(`Document List column reference does not resolve: ${reference.label || reference.childFieldKey || reference.childFieldId}.`, { reference });
      continue;
    }
    const field = fields.find((candidate) => candidate.id === reference.fieldId || candidate.fieldKey === reference.fieldKey);
    if (!field) fail(`Document field reference does not resolve: ${reference.label || reference.fieldKey || reference.fieldId}.`, { reference });
  }
  walk(normalizeDocumentContent(content).content, (node) => {
    if (node.type !== 'table' || !node.attrs?.repeatListFieldId && !node.attrs?.repeatListFieldKey) return;
    const listField = fields.find((candidate) => candidate.type === 'list' && (candidate.id === node.attrs.repeatListFieldId || candidate.fieldKey === node.attrs.repeatListFieldKey));
    if (!listField) fail('Repeating table row references an unknown List field.', { attrs: node.attrs });
    if (node.attrs.repeatRowIndex >= (node.content?.length ?? 0)) fail('Repeating table row index is outside the table.', { attrs: node.attrs });
    if (node.attrs.sourceSyntax !== 'list-table') return;
    if (!node.attrs.listTableColumns?.length) fail('List tables need at least one column.', { attrs: node.attrs });
    for (const column of node.attrs.listTableColumns) {
      if (!listField.fields?.some((child) => child.id === column.childFieldId || child.fieldKey === column.childFieldKey)) fail(`List table column does not resolve: ${column.childFieldKey || column.childFieldId}.`, { column });
    }
    for (const summary of node.attrs.listTableSummaries ?? []) {
      const summaryField = formSchema?.fields?.find((field) => field.id === summary.fieldId || field.fieldKey === summary.fieldKey);
      if (!summaryField || ['list', 'section', 'template-section', 'divider'].includes(summaryField.type)) fail(`List table summary does not resolve: ${summary.label || summary.fieldKey || summary.fieldId}.`, { summary });
    }
  });
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
  if (['calculation', 'aggregate'].includes(field?.type)) {
    if (field.calculationFormat === 'currency') return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0);
    if (field.calculationFormat === 'percent') return `${Number(value || 0).toLocaleString('en-US')}%`;
    return Number(value || 0).toLocaleString('en-US');
  }
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

function renderInline(nodes, values, fields, resourceMap = new Map(), variableMap = new Map(), rowContext = null) {
  return (nodes ?? []).map((node) => {
    if (node.type === 'text') {
      let html = escapeHtml(node.text);
      for (const mark of node.marks ?? []) if (mark.type === 'bold') html = `<strong>${html}</strong>`; else if (mark.type === 'italic') html = `<em>${html}</em>`; else if (mark.type === 'fontSize') html = `<span style="font-size:${mark.attrs.size}">${html}</span>`; else if (mark.type === 'code') html = `<code>${html}</code>`;
      return html;
    }
    if (node.type === 'hardBreak') return '<br />';
    if (node.type === 'document_field') {
      if (rowContext && (node.attrs.listFieldId === rowContext.listField.id || node.attrs.listFieldKey === rowContext.listField.fieldKey)) {
        const child = rowContext.listField.fields?.find((candidate) => candidate.id === node.attrs.childFieldId || candidate.fieldKey === node.attrs.childFieldKey);
        if (!child) return '';
        return `<span data-document-field="${escapeHtml(`${rowContext.listField.fieldKey || rowContext.listField.id}.${child.fieldKey || child.id}`)}"${tokenStyleAttribute(node.attrs)}>${escapeHtml(formatFormValueForDocument(child, rowContext.row[child.id] ?? rowContext.row[child.fieldKey]))}</span>`;
      }
      const field = fields.find((candidate) => candidate.id === node.attrs.fieldId || candidate.fieldKey === node.attrs.fieldKey);
      if (!field) return `<span data-document-field="${escapeHtml(node.attrs.fieldKey || node.attrs.fieldId)}"${tokenStyleAttribute(node.attrs)}>@${escapeHtml(node.attrs.label || node.attrs.fieldKey || node.attrs.fieldId)}</span>`;
      const value = values[field.id] ?? values[field.fieldKey];
      const formattedValue = formatFieldValue(value, node.attrs.format || 'long', field);
      return `<span data-document-field="${escapeHtml(node.attrs.fieldKey || node.attrs.fieldId)}"${tokenStyleAttribute(node.attrs)}>${escapeHtml(formattedValue)}</span>`;
    }
    if (node.type === 'document_variable') {
      const value = variableMap.get(node.attrs.variableKey);
      return `<span data-document-variable="${escapeHtml(node.attrs.variableKey)}"${tokenStyleAttribute(node.attrs)}>${escapeHtml(value ?? `#${node.attrs.label || node.attrs.variableKey}`)}</span>`;
    }
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

function formatFormValueForDocument(field, value) {
  if (value === undefined || value === null || value === '') return '';
  if (field.type === 'money') return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));
  if (field.type === 'percent') return `${Number(value).toLocaleString('en-US')}%`;
  if (['select', 'radio', 'button-select'].includes(field.type)) return field.options?.find((option) => option.value === value)?.label ?? value;
  if (['checkbox', 'button-multi-select'].includes(field.type)) return (Array.isArray(value) ? value : []).map((entry) => field.options?.find((option) => option.value === entry)?.label ?? entry).join(', ');
  return value;
}

function renderNode(node, values, fields, resourceMap = new Map(), variableMap = new Map(), rowContext = null) {
  if (node.type === 'paragraph') return `<p${paragraphStyleAttribute(node.attrs)}>${renderInline(node.content, values, fields, resourceMap, variableMap, rowContext)}</p>`;
  if (node.type === 'heading') return `<h${node.attrs.level}>${renderInline(node.content, values, fields, resourceMap, variableMap, rowContext)}</h${node.attrs.level}>`;
  if (node.type === 'blockquote') return `<blockquote>${(node.content ?? []).map((child) => renderNode(child, values, fields, resourceMap, variableMap, rowContext)).join('')}</blockquote>`;
  if (node.type === 'bulletList') return `<ul>${(node.content ?? []).map((child) => renderNode(child, values, fields, resourceMap, variableMap, rowContext)).join('')}</ul>`;
  if (node.type === 'orderedList') return `<ol>${(node.content ?? []).map((child) => renderNode(child, values, fields, resourceMap, variableMap, rowContext)).join('')}</ol>`;
  if (node.type === 'listItem') return `<li>${(node.content ?? []).map((child) => child.type === 'paragraph' ? renderInline(child.content, values, fields, resourceMap, variableMap, rowContext) : renderNode(child, values, fields, resourceMap, variableMap, rowContext)).join('')}</li>`;
  if (node.type === 'horizontalRule') return '<hr />';
  if (node.type === 'page_break') return '<div class="document-page-break" data-page-break="true" style="break-before:page;page-break-before:always" aria-hidden="true"></div>';
  if (node.type === 'section') return `<div class="document-sections" style="display:flex;flex-direction:row;align-items:flex-start;width:100%">${(node.content ?? []).map((child) => renderNode(child, values, fields, resourceMap, variableMap, rowContext)).join('')}</div>`;
  if (node.type === 'sectionItem') return `<div${documentClassAttribute(node.attrs?.className, 'document-section-item')} style="${sectionItemStyle(node.attrs)}">${(node.content ?? []).map((child) => renderNode(child, values, fields, resourceMap, variableMap, rowContext)).join('')}</div>`;
  if (node.type === 'table') {
    if (node.attrs?.sourceSyntax === 'list-table') return renderListTable(node, values, fields);
    const listField = fields.find((candidate) => candidate.type === 'list' && (candidate.id === node.attrs?.repeatListFieldId || candidate.fieldKey === node.attrs?.repeatListFieldKey));
    const repeatIndex = node.attrs?.repeatRowIndex ?? -1;
    const rows = (node.content ?? []).flatMap((child, index) => {
      if (!listField || index !== repeatIndex) return [renderNode(child, values, fields, resourceMap, variableMap, rowContext)];
      const listRows = values[listField.id] ?? values[listField.fieldKey];
      return (Array.isArray(listRows) ? listRows : []).map((row) => renderNode(child, values, fields, resourceMap, variableMap, { listField, row }));
    });
    return `<table class="document-table" style="width:100%;border-collapse:collapse">${renderTableColumnGroup(node)}<tbody>${rows.join('')}</tbody></table>`;
  }
  if (node.type === 'tableRow') return `<tr>${(node.content ?? []).map((child) => renderNode(child, values, fields, resourceMap, variableMap, rowContext)).join('')}</tr>`;
  if (node.type === 'tableHeader') return `<th${cellAttributes(node)}>${(node.content ?? []).map((child) => renderNode(child, values, fields, resourceMap, variableMap, rowContext)).join('')}</th>`;
  if (node.type === 'tableCell') return `<td${cellAttributes(node)}>${(node.content ?? []).map((child) => renderNode(child, values, fields, resourceMap, variableMap, rowContext)).join('')}</td>`;
  return '';
}

function renderListTable(node, values, fields) {
  const listField = fields.find((field) => field.type === 'list' && (field.id === node.attrs.repeatListFieldId || field.fieldKey === node.attrs.repeatListFieldKey));
  if (!listField) return '';
  const columns = (node.attrs.listTableColumns ?? []).map((column) => ({ ...column, field: listField.fields?.find((child) => child.id === column.childFieldId || child.fieldKey === column.childFieldKey) })).filter((column) => column.field);
  const colgroup = columns.some((column) => column.width != null) ? `<colgroup>${columns.map((column) => `<col${column.width == null ? '' : ` style="width:${column.width}%"`} />`).join('')}</colgroup>` : '';
  const head = `<thead><tr>${columns.map((column) => `<th${cellAttributes({ attrs: {} })}>${escapeHtml(column.field.label)}</th>`).join('')}</tr></thead>`;
  const rows = values[listField.id] ?? values[listField.fieldKey];
  const body = `<tbody>${(Array.isArray(rows) ? rows : []).map((row) => `<tr${documentClassAttribute(node.attrs?.rowClassName)}>${columns.map((column) => {
    const value = row[column.field.id] ?? row[column.field.fieldKey];
    return `<td${documentClassAttribute(column.className)}${cellAttributes({ attrs: { textAlign: column.textAlign } })}><span${tokenStyleAttribute(column)}>${escapeHtml(formatFormValueForDocument(column.field, value))}</span></td>`;
  }).join('')}</tr>`).join('')}</tbody>`;
  const summaries = node.attrs.listTableSummaries ?? [];
  const foot = summaries.length ? `<tfoot>${summaries.map((summary) => {
    const field = fields.find((candidate) => candidate.id === summary.fieldId || candidate.fieldKey === summary.fieldKey);
    const value = field ? values[field.id] ?? values[field.fieldKey] : '';
    const labelCell = columns.length > 1 ? `<td${documentClassAttribute(summary.className)}${cellAttributes({ attrs: { colspan: columns.length - 1, textAlign: 'right' } })}><span${tokenStyleAttribute(summary)}>${escapeHtml(summary.label || field?.label || '')}</span></td>` : '';
    return `<tr>${labelCell}<td${documentClassAttribute(summary.className)}${cellAttributes({ attrs: { textAlign: 'right' } })}><span${tokenStyleAttribute(summary)}>${escapeHtml(field ? formatFieldValue(value, 'long', field) : '')}</span></td></tr>`;
  }).join('')}</tfoot>` : '';
  return `<table${documentClassAttribute(node.attrs?.className, 'document-table document-list-table')} style="width:100%;border-collapse:collapse">${colgroup}${head}${body}${foot}</table>`;
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
  if (node.type === 'section') return `<div class="document-sections" style="display:flex;flex-direction:row;align-items:flex-start;width:100%">${(node.content ?? []).map(renderAuthoredNode).join('')}</div>`;
  if (node.type === 'sectionItem') return `<div${documentClassAttribute(node.attrs?.className, 'document-section-item')} style="${sectionItemStyle(node.attrs)}">${(node.content ?? []).map(renderAuthoredNode).join('')}</div>`;
  if (node.type === 'table' && node.attrs?.sourceSyntax === 'list-table') {
    const columns = node.attrs.listTableColumns ?? [];
    const head = `<thead><tr>${columns.map((column) => `<th>${escapeHtml(column.childFieldKey || column.childFieldId)}</th>`).join('')}</tr></thead>`;
    const body = `<tbody><tr${documentClassAttribute(node.attrs?.rowClassName)}>${columns.map((column) => `<td style="text-align:${column.textAlign || 'left'}"><span${tokenStyleAttribute(column)}>@${escapeHtml(column.childFieldKey || column.childFieldId)}</span></td>`).join('')}</tr></tbody>`;
    const foot = (node.attrs.listTableSummaries ?? []).length ? `<tfoot>${node.attrs.listTableSummaries.map((summary) => `<tr><td colspan="${Math.max(1, columns.length)}"><span${tokenStyleAttribute(summary)}>@${escapeHtml(summary.label || summary.fieldKey || summary.fieldId)}</span></td></tr>`).join('')}</tfoot>` : '';
    return `<table${documentClassAttribute(node.attrs?.className, 'document-table document-list-table')}>${head}${body}${foot}</table>`;
  }
  if (node.type === 'table') return `<table class="document-table">${renderTableColumnGroup(node)}<tbody>${(node.content ?? []).map(renderAuthoredNode).join('')}</tbody></table>`;
  if (node.type === 'tableRow') return `<tr>${(node.content ?? []).map(renderAuthoredNode).join('')}</tr>`;
  if (node.type === 'tableHeader') return `<th${cellAttributes(node)}>${(node.content ?? []).map(renderAuthoredNode).join('')}</th>`;
  if (node.type === 'tableCell') return `<td${cellAttributes(node)}>${(node.content ?? []).map(renderAuthoredNode).join('')}</td>`;
  return '';
}

function sectionItemStyle(attrs = {}) {
  const style = [];
  if (attrs.width != null) style.push(`flex:0 0 ${Number(attrs.width)}%`, `max-width:${Number(attrs.width)}%`);
  if (attrs.textAlign) style.push(`text-align:${attrs.textAlign}`);
  if (attrs.fontSize) style.push(`font-size:${attrs.fontSize}`);
  if (attrs.bold) style.push('font-weight:700');
  if (attrs.italic) style.push('font-style:italic');
  return style.join(';');
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

function renderTableColumnGroup(node) {
  const widths = normalizeTableColumnWidths(node.attrs?.columnWidths);
  return widths ? `<colgroup>${widths.map((width) => `<col style="width:${width}%" />`).join('')}</colgroup>` : '';
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
  const normalizedPageConfig = normalizePageConfig(pageConfig);
  const fields = [];
  const collect = (items) => (items ?? []).forEach((field) => { fields.push(field); collect(field.fields); });
  collect(formSchema.fields);
  const resourceMap = new Map(resources.map((resource) => [resource.resourceKey, resource]));
  const variableMap = new Map(variables.filter((variable) => variable.status !== 'archived').map((variable) => [variable.key, variable.value]));
  const resolvedValues = materializeAggregateValues(formSchema, values);
  const bodyHtml = normalized.content.map((node) => renderNode(node, resolvedValues, fields, resourceMap, variableMap)).join('');
  return renderPageLayout(bodyHtml, normalizedPageConfig, (richText) => richText.content.map((node) => renderLayoutNode(node, values, fields, false, resourceMap, variableMap)).join(''));
}

export function renderAuthoredDocumentHtml(content, pageConfig = null) {
  const normalized = normalizeDocumentContent(content);
  return renderPageLayout(normalized.content.map(renderAuthoredNode).join(''), pageConfig, (richText) => richText.content.map((node) => renderLayoutNode(node, {}, [], true)).join(''));
}
