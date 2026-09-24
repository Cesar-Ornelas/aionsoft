import { TOKEN_FONT_SIZES } from './token-style.js';
import { normalizeDocumentClasses } from './document-class.js';

const FONT_SIZES = new Set(TOKEN_FONT_SIZES);
const TOKEN_PATTERN = /^\{\{@([^|}]+)(?:\|([^}]+))?\}\}$/;
const TABLE_OPENING_PATTERN = /^\|>Table(?:\s+(.+))?$/;
const COLUMN_PATTERN = /^col=(\{\{@[^}]+\}\})(?:\s+class="([^"]*)")?$/;
const SUMMARY_PATTERN = /^summary=(\{\{@[^}]+\}\})(?:\s+class="([^"]*)")?$/;

function parseToken(value, lineNumber) {
  const match = String(value).trim().match(TOKEN_PATTERN);
  if (!match) throw new Error(`Invalid List table field token on line ${lineNumber}.`);
  return { fieldKey: match[1].trim(), label: match[2]?.trim() || null };
}

function parseColumn(value, lineNumber) {
  const match = value.match(COLUMN_PATTERN);
  if (!match) throw new Error(`Invalid List table column on line ${lineNumber}.`);
  const token = parseToken(match[1], lineNumber);
  const column = { childFieldKey: token.fieldKey };
  if (match[2]) column.className = normalizeDocumentClasses(match[2], `List table classes on line ${lineNumber}`);
  return column;
}

function parseSummary(value, lineNumber) {
  const match = value.match(SUMMARY_PATTERN);
  if (!match) throw new Error(`Invalid List table summary on line ${lineNumber}.`);
  const summary = parseToken(match[1], lineNumber);
  if (match[2]) summary.className = normalizeDocumentClasses(match[2], `List table summary classes on line ${lineNumber}`);
  return summary;
}

function parseTableOpening(line) {
  const match = line.match(TABLE_OPENING_PATTERN);
  if (!match) return null;
  const attributes = { className: '', rowClassName: '' };
  const source = match[1] || '';
  const pattern = /([a-z-]+)="([^"]*)"/g;
  let cursor = 0;
  let attributeMatch;
  while ((attributeMatch = pattern.exec(source))) {
    if (source.slice(cursor, attributeMatch.index).trim()) return null;
    if (attributeMatch[1] === 'class') attributes.className = normalizeDocumentClasses(attributeMatch[2], 'List table classes on line 1');
    else if (attributeMatch[1] === 'row-class') attributes.rowClassName = normalizeDocumentClasses(attributeMatch[2], 'List table row classes on line 1');
    else return null;
    cursor = pattern.lastIndex;
  }
  if (source.slice(cursor).trim()) return null;
  return attributes;
}

export function parseListTableBlock(source) {
  const lines = String(source).split(/\r?\n/);
  const opening = parseTableOpening(lines[0]?.trim() || '');
  if (!opening || lines.at(-1)?.trim() !== '<|') throw new Error('List table blocks must start with |>Table and end with <|.');
  let listFieldKey = '';
  let listLabel = '';
  let className = opening.className;
  let rowClassName = opening.rowClassName;
  const columns = [];
  const summaries = [];
  for (let index = 1; index < lines.length - 1; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;
    if (line.startsWith('class=')) {
      const match = line.match(/^class="([^"]*)"$/);
      if (!match) throw new Error(`Invalid List table class directive on line ${index + 1}.`);
      className = normalizeDocumentClasses(match[1], `List table classes on line ${index + 1}`);
    } else if (line.startsWith('row-class=')) {
      const match = line.match(/^row-class="([^"]*)"$/);
      if (!match) throw new Error(`Invalid List table row class directive on line ${index + 1}.`);
      rowClassName = normalizeDocumentClasses(match[1], `List table row classes on line ${index + 1}`);
    } else if (line.startsWith('src=')) {
      if (listFieldKey) throw new Error(`List table source is duplicated on line ${index + 1}.`);
      const source = parseToken(line.slice(4), index + 1);
      listFieldKey = source.fieldKey;
      listLabel = source.label || source.fieldKey;
    } else if (line.startsWith('col=')) {
      columns.push(parseColumn(line, index + 1));
    } else if (line.startsWith('summary=')) {
      summaries.push(parseSummary(line, index + 1));
    } else {
      throw new Error(`Unknown List table directive on line ${index + 1}.`);
    }
  }
  if (!listFieldKey) throw new Error('List table blocks need one src field.');
  if (!columns.length) throw new Error('List table blocks need at least one column.');
  return { listFieldKey, listLabel, className, rowClassName, columns, summaries };
}

export function splitListTableBlocks(markdown) {
  const lines = String(markdown ?? '').split(/\r?\n/);
  const segments = [];
  let markdownLines = [];
  const flushMarkdown = () => {
    if (markdownLines.length) segments.push({ type: 'markdown', value: markdownLines.join('\n') });
    markdownLines = [];
  };
  for (let index = 0; index < lines.length; index += 1) {
    if (!TABLE_OPENING_PATTERN.test(lines[index].trim())) {
      markdownLines.push(lines[index]);
      continue;
    }
    flushMarkdown();
    const start = index;
    while (index < lines.length && lines[index].trim() !== '<|') index += 1;
    if (index >= lines.length) throw new Error(`List table block starting on line ${start + 1} is missing <|.`);
    const value = lines.slice(start, index + 1).join('\n');
    segments.push({ type: 'list-table', value, table: parseListTableBlock(value) });
  }
  flushMarkdown();
  return segments;
}

export function serializeListTableBlock(attrs) {
  const lines = ['|>Table'];
  if (attrs.className) lines.push(`class="${normalizeDocumentClasses(attrs.className)}"`);
  if (attrs.rowClassName) lines.push(`row-class="${normalizeDocumentClasses(attrs.rowClassName)}"`);
  lines.push(`src={{@${attrs.repeatListFieldKey || attrs.repeatListFieldId}|${attrs.listTableLabel || attrs.repeatListFieldKey || attrs.repeatListFieldId}}}`);
  for (const column of attrs.listTableColumns ?? []) {
    const className = column.className || '';
    lines.push(`col={{@${column.childFieldKey || column.childFieldId}}}${className ? ` class="${normalizeDocumentClasses(className)}"` : ''}`);
  }
  for (const summary of attrs.listTableSummaries ?? []) {
    const className = summary.className || '';
    lines.push(`summary={{@${summary.fieldKey || summary.fieldId}|${summary.label || summary.fieldKey || summary.fieldId}}}${className ? ` class="${normalizeDocumentClasses(className)}"` : ''}`);
  }
  lines.push('<|');
  return lines.join('\n');
}
