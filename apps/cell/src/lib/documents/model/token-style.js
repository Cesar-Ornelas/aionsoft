import { TABLE_COLOR_PALETTE } from './table-cell.js';

export const TOKEN_FONT_SIZES = Object.freeze(['8pt', '10pt', '12pt', '14pt', '16pt', '18pt', '24pt', '32pt']);
export const PARAGRAPH_LINE_HEIGHTS = Object.freeze(['0.75', '0.85', '0.9', '0.95', '1', '1.15', '1.25', '1.5', '1.75', '2']);
export const TOKEN_COLORS = TABLE_COLOR_PALETTE;

const ALLOWED_FONT_SIZES = new Set(TOKEN_FONT_SIZES);
const ALLOWED_LINE_HEIGHTS = new Set(PARAGRAPH_LINE_HEIGHTS);

export function normalizeLineHeight(value) {
  return ALLOWED_LINE_HEIGHTS.has(String(value)) ? String(value) : null;
}

export function paragraphStyleAttribute(attrs = {}) {
  const declarations = [];
  if (['left', 'center', 'right', 'justify'].includes(attrs.textAlign)) declarations.push(`text-align:${attrs.textAlign}`);
  const lineHeight = normalizeLineHeight(attrs.lineHeight);
  if (lineHeight) declarations.push(`line-height:${lineHeight}`);
  return declarations.length ? ` style="${declarations.join(';')}"` : '';
}

export function paragraphStyleCss(attrs = {}) {
  return paragraphStyleAttribute(attrs).replace(/^ style="|"$/g, '');
}

export function normalizeTokenStyle(attrs = {}) {
  return {
    fontSize: ALLOWED_FONT_SIZES.has(attrs.fontSize) ? attrs.fontSize : null,
    textColor: Object.hasOwn(TOKEN_COLORS, attrs.textColor) ? attrs.textColor : null,
    backgroundColor: Object.hasOwn(TOKEN_COLORS, attrs.backgroundColor) ? attrs.backgroundColor : null,
    ...(attrs.bold === true ? { bold: true } : {}),
    ...(attrs.italic === true ? { italic: true } : {}),
    ...(attrs.underline === true ? { underline: true } : {}),
    ...(attrs.strike === true ? { strike: true } : {})
  };
}

export function tokenStyleAttribute(attrs) {
  const style = normalizeTokenStyle(attrs);
  const declarations = [];
  if (style.fontSize) declarations.push(`font-size:${style.fontSize}`);
  if (style.textColor) declarations.push(`color:${TOKEN_COLORS[style.textColor]}`);
  if (style.backgroundColor) declarations.push(`background-color:${TOKEN_COLORS[style.backgroundColor]}`);
  if (style.bold) declarations.push('font-weight:700');
  if (style.italic) declarations.push('font-style:italic');
  if (style.underline || style.strike) declarations.push(`text-decoration:${[style.underline && 'underline', style.strike && 'line-through'].filter(Boolean).join(' ')}`);
  return declarations.length ? ` style="${declarations.join(';')}"` : '';
}

export function tokenStyleCss(attrs) {
  return tokenStyleAttribute(attrs).replace(/^ style="|"$/g, '');
}