export const TABLE_COLOR_PALETTE = Object.freeze({
  gray50: '#f8fafc',
  gray100: '#f1f5f9',
  gray200: '#e2e8f0',
  primary: '#2563eb',
  secondary: '#475569',
  accent: '#0f766e',
  neutral: '#64748b',
  slate: '#e2e8f0',
  blue: '#dbeafe',
  amber: '#fef3c7',
  green: '#dcfce7',
  rose: '#ffe4e6',
  ink: '#1e293b',
  white: '#ffffff'
});

const TABLE_WIDTH_MODES = new Set(['default', 'fill', 'custom']);
const TABLE_ALIGNMENTS = new Set(['left', 'center', 'right', 'justify']);
const TABLE_VERTICAL_ALIGNMENTS = new Set(['top', 'middle', 'bottom']);
export function normalizeTableColumnWidths(widths) {
  if (!Array.isArray(widths) || !widths.length) return null;
  const values = widths.map(Number);
  if (values.some((width) => !Number.isFinite(width))) return null;
  const normalized = values.map((width) => Math.min(100, Math.max(5, Math.round(width))));
  if (normalized.reduce((sum, width) => sum + width, 0) !== 100) return null;
  return normalized;
}

export function normalizeTableCellAttrs(attrs = {}) {
  const widthMode = TABLE_WIDTH_MODES.has(attrs.widthMode) ? attrs.widthMode : 'default';
  const widthPercentValue = Number(attrs.widthPercent);
  const widthPercent = Number.isFinite(widthPercentValue) ? Math.min(100, Math.max(5, Math.round(widthPercentValue))) : 50;
  return {
    colspan: Math.max(1, Number(attrs.colspan ?? 1)),
    rowspan: Math.max(1, Number(attrs.rowspan ?? 1)),
    widthMode,
    widthPercent: widthMode === 'custom' ? widthPercent : null,
    backgroundColor: Object.hasOwn(TABLE_COLOR_PALETTE, attrs.backgroundColor) ? attrs.backgroundColor : null,
    textColor: Object.hasOwn(TABLE_COLOR_PALETTE, attrs.textColor) ? attrs.textColor : null,
    textAlign: TABLE_ALIGNMENTS.has(attrs.textAlign) ? attrs.textAlign : 'left',
    verticalAlign: TABLE_VERTICAL_ALIGNMENTS.has(attrs.verticalAlign) ? attrs.verticalAlign : 'top'
  };
}
