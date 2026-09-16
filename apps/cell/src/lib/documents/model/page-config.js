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
const ALLOWED_FONT_SIZES = new Set(['10pt', '12pt', '14pt', '16pt', '18pt', '24pt', '32pt']);

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
  if (node.type === 'image') {
    const resourceKey = String(node.attrs?.resourceKey ?? '').trim();
    const width = node.attrs?.width == null ? null : Math.min(100, Math.max(1, Number(node.attrs.width)));
    if (!resourceKey || (width !== null && !Number.isFinite(width))) return { type: 'paragraph' };
    return { type: 'image', attrs: { resourceKey, alt: String(node.attrs?.alt ?? '').trim().slice(0, 240), width } };
  }
  if (['table', 'tableRow', 'tableCell', 'tableHeader'].includes(node.type)) {
    const normalized = { type: node.type };
    if (node.type === 'tableCell' || node.type === 'tableHeader') {
      normalized.attrs = {
        colspan: Math.max(1, Number(node.attrs?.colspan ?? 1)),
        rowspan: Math.max(1, Number(node.attrs?.rowspan ?? 1))
      };
    }
    normalized.content = (node.content ?? []).map(normalizeRichTextNode);
    return normalized;
  }
  const normalized = { type: 'paragraph' };
  if (['left', 'center', 'right', 'justify'].includes(node.attrs?.textAlign)) normalized.attrs = { textAlign: node.attrs.textAlign };
  normalized.content = (node.content ?? []).filter((child) => child?.type === 'text' || child?.type === 'hardBreak').map(normalizeRichTextNode);
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
