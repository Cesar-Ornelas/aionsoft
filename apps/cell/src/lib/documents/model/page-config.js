import { normalizeTableCellAttrs } from './table-cell.js';
import { normalizeTokenStyle, TOKEN_FONT_SIZES, normalizeLineHeight } from './token-style.js';

export const DEFAULT_PAGE_CONFIG = Object.freeze({
  margins: { top: 1, right: 1, bottom: 1, left: 1 },
  header: { type: 'doc', content: [{ type: 'paragraph' }] },
  footer: { type: 'doc', content: [{ type: 'paragraph' }] }
});

const clampMargin = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.min(4, Math.max(0, Math.round(number * 100) / 100));
};

const clone = (value) => structuredClone(value);
const ALLOWED_FONT_SIZES = new Set(TOKEN_FONT_SIZES);
const ALLOWED_DATE_FORMATS = new Set(['long', 'medium', 'short', 'numeric', 'iso']);

function normalizeRichTextNode(node) {
  if (!node || typeof node !== 'object') return { type: 'paragraph' };
  if (node.type === 'text') {
    return {
      type: 'text',
      text: String(node.text ?? ''),
      ...(Array.isArray(node.marks) ? { marks: node.marks.filter((mark) => ['bold', 'italic', 'fontSize'].includes(mark?.type) && (mark.type !== 'fontSize' || ALLOWED_FONT_SIZES.has(mark.attrs?.size))).map((mark) => mark.type === 'fontSize' ? { type: mark.type, attrs: { size: mark.attrs.size } } : ({ type: mark.type })) } : {})
    };
  }
  if (node.type === 'hardBreak') return { type: 'hardBreak' };
  if (node.type === 'document_field') {
    const fieldId = String(node.attrs?.fieldId ?? '').trim();
    const fieldKey = String(node.attrs?.fieldKey ?? '').trim();
    if (!fieldId && !fieldKey) return { type: 'paragraph' };
    const normalized = { type: 'document_field', attrs: { fieldId: fieldId || null, fieldKey: fieldKey || null, label: String(node.attrs?.label ?? (fieldKey || fieldId)).trim(), ...normalizeTokenStyle(node.attrs) } };
    if (ALLOWED_DATE_FORMATS.has(node.attrs?.format)) normalized.attrs.format = node.attrs.format;
    return normalized;
  }
  if (node.type === 'document_variable') {
    const variableKey = String(node.attrs?.variableKey ?? '').trim();
    if (!variableKey) return { type: 'paragraph' };
    return { type: 'document_variable', attrs: { variableKey, label: String(node.attrs?.label ?? variableKey).trim(), ...normalizeTokenStyle(node.attrs) } };
  }
  if (node.type === 'image') {
    const resourceKey = String(node.attrs?.resourceKey ?? '').trim();
    const width = node.attrs?.width == null ? null : Math.min(100, Math.max(1, Number(node.attrs.width)));
    const widthPx = node.attrs?.widthPx == null ? null : Math.min(4000, Math.max(1, Number(node.attrs.widthPx)));
    const heightPx = node.attrs?.heightPx == null ? null : Math.min(4000, Math.max(1, Number(node.attrs.heightPx)));
    if (!resourceKey || (width !== null && !Number.isFinite(width)) || (widthPx !== null && !Number.isFinite(widthPx)) || (heightPx !== null && !Number.isFinite(heightPx))) return { type: 'paragraph' };
    return { type: 'image', attrs: { resourceKey, alt: String(node.attrs?.alt ?? '').trim().slice(0, 240), width, widthPx, heightPx } };
  }
  if (['table', 'tableRow', 'tableCell', 'tableHeader'].includes(node.type)) {
    const normalized = { type: node.type };
    if (node.type === 'tableCell' || node.type === 'tableHeader') {
      normalized.attrs = normalizeTableCellAttrs(node.attrs);
    }
    normalized.content = (node.content ?? []).map(normalizeRichTextNode);
    return normalized;
  }
  const normalized = { type: 'paragraph' };
  const paragraphAttrs = {};
  if (['left', 'center', 'right', 'justify'].includes(node.attrs?.textAlign)) paragraphAttrs.textAlign = node.attrs.textAlign;
  const lineHeight = normalizeLineHeight(node.attrs?.lineHeight);
  if (lineHeight) paragraphAttrs.lineHeight = lineHeight;
  if (Object.keys(paragraphAttrs).length) normalized.attrs = paragraphAttrs;
  normalized.content = (node.content ?? []).filter((child) => ['text', 'hardBreak', 'document_field', 'document_variable', 'image'].includes(child?.type)).map(normalizeRichTextNode);
  return normalized;
}

function normalizeRichText(value) {
  if (!value || typeof value !== 'object' || value.type !== 'doc' || !Array.isArray(value.content)) {
    return clone(DEFAULT_PAGE_CONFIG.header);
  }
  return { type: 'doc', content: value.content.map(normalizeRichTextNode) };
}

export function normalizePageConfig(input) {
  const source = input && typeof input === 'object' ? input : {};
  const sourceMargins = source.margins && typeof source.margins === 'object' ? source.margins : {};
  return {
    margins: {
      top: clampMargin(sourceMargins.top) ?? DEFAULT_PAGE_CONFIG.margins.top,
      right: clampMargin(sourceMargins.right) ?? DEFAULT_PAGE_CONFIG.margins.right,
      bottom: clampMargin(sourceMargins.bottom) ?? DEFAULT_PAGE_CONFIG.margins.bottom,
      left: clampMargin(sourceMargins.left) ?? DEFAULT_PAGE_CONFIG.margins.left
    },
    header: normalizeRichText(source.header),
    footer: normalizeRichText(source.footer)
  };
}

export function pageConfigEquals(left, right) {
  return JSON.stringify(normalizePageConfig(left)) === JSON.stringify(normalizePageConfig(right));
}
