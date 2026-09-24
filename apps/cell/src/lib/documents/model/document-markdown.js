import { unified } from 'unified';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { normalizeTableColumnWidths } from './table-cell.js';
import { serializeListTableBlock, splitListTableBlocks } from './list-table-markdown.js';
import { serializeSectionsBlock, splitSectionsBlocks } from './sections-markdown.js';

const escapeMarkdownText = (value) => String(value ?? '')
  .replaceAll('\\', '\\\\')
  .replaceAll('*', '\\*')
  .replaceAll('_', '\\_')
  .replaceAll('`', '\\`')
  .replaceAll('[', '\\[')
  .replaceAll(']', '\\]');

const escapeDirectiveValue = (value) => String(value ?? '')
  .replaceAll('\\', '\\\\')
  .replaceAll('|', '\\|')
  .replaceAll('{', '\\{')
  .replaceAll('}', '\\}');

function tokenDirective(prefix, attrs) {
  const key = prefix === '@' && (attrs?.listFieldKey || attrs?.listFieldId) && (attrs?.childFieldKey || attrs?.childFieldId)
    ? `${attrs.listFieldKey || attrs.listFieldId}.${attrs.childFieldKey || attrs.childFieldId}`
    : attrs?.fieldKey || attrs?.fieldId || attrs?.variableKey || '';
  const label = attrs?.label || key;
  const styles = [attrs?.fontSize, attrs?.textColor, attrs?.backgroundColor, attrs?.bold ? 'bold' : '', attrs?.italic ? 'italic' : '']
    .filter(Boolean)
    .map(escapeDirectiveValue)
    .join(',');
  return `{{${prefix}${escapeDirectiveValue(key)}|${escapeDirectiveValue(label)}${styles ? `|${styles}` : ''}}}`;
}

function renderInline(nodes = []) {
  return nodes.map((node) => {
    if (node.type === 'text') {
      let value = escapeMarkdownText(node.text);
      for (const mark of node.marks ?? []) {
        if (mark.type === 'bold') value = `**${value}**`;
        if (mark.type === 'italic') value = `*${value}*`;
        if (mark.type === 'code') value = `\`${value}\``;
      }
      return value;
    }
    if (node.type === 'hardBreak') return '  \n';
    if (node.type === 'document_field') return tokenDirective('@', node.attrs);
    if (node.type === 'document_variable') return tokenDirective('#', node.attrs);
    if (node.type === 'image') {
      const dimensions = [node.attrs?.width && `width=${node.attrs.width}%`, node.attrs?.widthPx && `widthPx=${node.attrs.widthPx}`, node.attrs?.heightPx && `heightPx=${node.attrs.heightPx}`].filter(Boolean).join('&');
      const title = dimensions ? ` "${dimensions}"` : '';
      return `![${escapeMarkdownText(node.attrs?.alt)}](resource://${encodeURIComponent(node.attrs?.resourceKey || '')}${title})`;
    }
    return '';
  }).join('');
}

function renderNode(node, depth = 0) {
  if (node.type === 'paragraph') return `${renderInline(node.content)}\n\n`;
  if (node.type === 'heading') return `${'#'.repeat(node.attrs?.level || 2)} ${renderInline(node.content)}\n`;
  if (node.type === 'blockquote') return (node.content ?? []).map((child) => `> ${renderNode(child).trimEnd()}`).join('\n') + '\n';
  if (node.type === 'bulletList') return (node.content ?? []).map((child) => `- ${renderNode(child).trim()}`).join('\n') + '\n';
  if (node.type === 'orderedList') return (node.content ?? []).map((child, index) => `${index + 1}. ${renderNode(child).trim()}`).join('\n') + '\n';
  if (node.type === 'listItem') return (node.content ?? []).map((child) => child.type === 'paragraph' ? renderInline(child.content) : renderNode(child, depth + 1).trim()).join('\n');
  if (node.type === 'horizontalRule') return '---\n';
  if (node.type === 'page_break') return '<!-- aionsoft:page-break -->\n';
  if (node.type === 'table') return node.attrs?.sourceSyntax === 'list-table' ? `${serializeListTableBlock(node.attrs)}\n\n` : renderTable(node);
  if (node.type === 'section') return `${serializeSectionsBlock(node.content ?? [], (content) => content.map((child) => renderNode(child)).join('').trimEnd())}\n\n`;
  return '';
}

function renderTable(node) {
  const rows = (node.content ?? []).map((row) => (row.content ?? []).map((cell) => {
    const inline = (cell.content ?? []).flatMap((child) => child.type === 'paragraph' ? child.content ?? [] : [child]);
    return renderInline(inline).replaceAll('|', '\\|');
  }));
  if (!rows.length) return '';
  const width = Math.max(...rows.map((row) => row.length));
  const pad = (row) => `| ${Array.from({ length: width }, (_, index) => row[index] || '').join(' | ')} |`;
  const widths = normalizeTableColumnWidths(node.attrs?.columnWidths);
  const attrs = { ...(widths && { widths }), ...(node.attrs?.repeatListFieldId && { repeatListFieldId: node.attrs.repeatListFieldId }), ...(node.attrs?.repeatListFieldKey && { repeatListFieldKey: node.attrs.repeatListFieldKey }), ...(node.attrs?.repeatListFieldId || node.attrs?.repeatListFieldKey ? { repeatRowIndex: node.attrs?.repeatRowIndex ?? 1 } : {}) };
  const hasDirective = Object.keys(attrs).length > 0;
  const directive = hasDirective ? `<!-- aionsoft:table ${JSON.stringify(attrs)} -->\n` : '';
  return `${directive}${pad(rows[0])}\n${pad(Array.from({ length: width }, () => '---'))}\n${rows.slice(1).map(pad).join('\n')}\n${hasDirective ? '<!-- aionsoft:table-end -->\n' : ''}`;
}

/**
 * Serialize the normalized document model into Carta's Markdown source value.
 * Non-native document features use namespaced directives so the source remains inspectable.
 */
export function documentContentToMarkdown(content) {
  if (!content || content.type !== 'doc') return '';
  return content.content.map((node) => renderNode(node)).join('').replace(/\n{3,}/g, '\n\n').trimEnd();
}

const markdownParser = unified().use(remarkParse).use(remarkGfm);

function unescapeDirectiveValue(value) {
  return String(value ?? '').replace(/\\([\\|{}])/g, '$1');
}

function splitDirective(value) {
  const parts = [];
  let current = '';
  let escaped = false;
  for (const character of value) {
    if (escaped) {
      current += `\\${character}`;
      escaped = false;
    } else if (character === '\\') {
      escaped = true;
    } else if (character === '|') {
      parts.push(current);
      current = '';
    } else {
      current += character;
    }
  }
  if (escaped) current += '\\';
  parts.push(current);
  return parts;
}

function parseTokenDirective(value) {
  const parts = splitDirective(value);
  const prefix = parts[0]?.[0];
  if (!['@', '#'].includes(prefix)) return null;
  const key = unescapeDirectiveValue(parts[0].slice(1));
  if (!key) return null;
  const label = unescapeDirectiveValue(parts[1] || key);
  const styleParts = (parts[2] || '').split(',').map(unescapeDirectiveValue);
  const attrs = {
    label,
    ...(prefix === '@' ? { fieldKey: key } : { variableKey: key }),
    fontSize: styleParts[0] || null,
    textColor: styleParts[1] || null,
    backgroundColor: styleParts[2] || null
  };
  if (styleParts.includes('bold')) attrs.bold = true;
  if (styleParts.includes('italic')) attrs.italic = true;
  if (prefix === '@' && key.includes('.')) {
    const [listFieldKey, ...childParts] = key.split('.');
    const childFieldKey = childParts.join('.');
    if (!listFieldKey || !childFieldKey) return null;
    return { type: 'document_field', attrs: { ...attrs, listFieldKey, childFieldKey } };
  }
  return { type: prefix === '@' ? 'document_field' : 'document_variable', attrs };
}

function parseText(value) {
  const nodes = [];
  const source = String(value ?? '');
  const tokenPattern = /\{\{((?:\\.|[^{}])*)\}\}/g;
  let lastIndex = 0;
  const appendText = (text) => {
    text.split('\n').forEach((line, index) => {
      if (index > 0) nodes.push({ type: 'hardBreak' });
      if (line) nodes.push({ type: 'text', text: line });
    });
  };
  for (const match of source.matchAll(tokenPattern)) {
    if (match.index > lastIndex) appendText(source.slice(lastIndex, match.index));
    const token = parseTokenDirective(match[1]);
    if (token) nodes.push(token);
    else appendText(match[0]);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < source.length) appendText(source.slice(lastIndex));
  return nodes;
}

function parseInline(node, marks = []) {
  if (node.type === 'text') return parseText(node.value).map((child) => marks.length && child.type === 'text' ? { ...child, marks: marks.map((type) => ({ type })) } : child);
  if (node.type === 'inlineCode') return [{ type: 'text', text: node.value, marks: [{ type: 'code' }] }];
  if (node.type === 'strong') return node.children.flatMap((child) => parseInline(child, [...marks, 'bold']));
  if (node.type === 'emphasis') return node.children.flatMap((child) => parseInline(child, [...marks, 'italic']));
  if (node.type === 'break') return [{ type: 'hardBreak' }];
  if (node.type === 'image' && String(node.url || '').startsWith('resource://')) {
    let resourceKey;
    try {
      resourceKey = decodeURIComponent(node.url.slice('resource://'.length));
    } catch {
      return [{ type: 'text', text: node.url }];
    }
    const dimensions = new URLSearchParams(node.title || '');
    return [{ type: 'image', attrs: { resourceKey, alt: node.alt || '', width: dimensions.get('width') ? Number(dimensions.get('width')) : null, widthPx: dimensions.get('widthPx') ? Number(dimensions.get('widthPx')) : null, heightPx: dimensions.get('heightPx') ? Number(dimensions.get('heightPx')) : null } }];
  }
  return node.children?.flatMap((child) => parseInline(child, marks)) ?? [];
}

function parseTable(node, attrs = null) {
  return {
    type: 'table',
    ...(attrs ? { attrs } : {}),
    content: node.children.map((row, rowIndex) => ({
      type: 'tableRow',
      content: row.children.map((cell) => ({
        type: rowIndex === 0 ? 'tableHeader' : 'tableCell',
        content: [{ type: 'paragraph', content: cell.children.flatMap((child) => parseInline(child)) }]
      }))
    }))
  };
}

function listTableNode(table) {
  return {
    type: 'table',
    attrs: {
      sourceSyntax: 'list-table',
      repeatListFieldKey: table.listFieldKey,
      listTableLabel: table.listLabel,
      className: table.className || '',
      rowClassName: table.rowClassName || '',
      repeatRowIndex: 1,
      listTableColumns: table.columns,
      listTableSummaries: table.summaries
    },
    content: [
      {
        type: 'tableRow',
        content: table.columns.map((column) => ({ type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: column.childFieldKey }] }] }))
      },
      {
        type: 'tableRow',
        content: table.columns.map((column) => ({
          type: 'tableCell',
          attrs: { textAlign: column.textAlign || 'left', className: column.className || '' },
          content: [{ type: 'paragraph', content: [{ type: 'document_field', attrs: { listFieldKey: table.listFieldKey, childFieldKey: column.childFieldKey, label: column.childFieldKey, fontSize: column.fontSize || null, ...(column.bold && { bold: true }), ...(column.italic && { italic: true }) } }] }]
        }))
      }
    ]
  };
}

function parseTableDirective(node) {
  const match = String(node.value ?? '').trim().match(/^<!--\s*aionsoft:table\s+({.*})\s*-->$/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    const columnWidths = normalizeTableColumnWidths(parsed.widths);
    const repeatListFieldId = String(parsed.repeatListFieldId ?? '').trim();
    const repeatListFieldKey = String(parsed.repeatListFieldKey ?? '').trim();
    const repeatRowIndex = Number(parsed.repeatRowIndex ?? 1);
    const attrs = { ...(columnWidths && { columnWidths }) };
    if (repeatListFieldId || repeatListFieldKey) {
      attrs.repeatListFieldId = repeatListFieldId || null;
      attrs.repeatListFieldKey = repeatListFieldKey || null;
      attrs.repeatRowIndex = Number.isInteger(repeatRowIndex) && repeatRowIndex >= 0 ? repeatRowIndex : 1;
    }
    return Object.keys(attrs).length ? attrs : null;
  } catch {
    return null;
  }
}

function isTableEndDirective(node) {
  return node.type === 'html' && String(node.value ?? '').trim() === '<!-- aionsoft:table-end -->';
}

function parseBlocks(nodes) {
  const blocks = [];
  let pendingTableAttrs = null;
  for (const node of nodes) {
    const tableAttrs = node.type === 'html' ? parseTableDirective(node) : null;
    if (tableAttrs) {
      pendingTableAttrs = tableAttrs;
      continue;
    }
    if (isTableEndDirective(node)) continue;
    if (node.type === 'table') {
      blocks.push(parseTable(node, pendingTableAttrs));
      pendingTableAttrs = null;
      continue;
    }
    pendingTableAttrs = null;
    const parsed = parseBlock(node);
    if (parsed) blocks.push(parsed);
  }
  return blocks;
}

function parseBlock(node) {
  if (node.type === 'paragraph') return { type: 'paragraph', content: node.children.flatMap((child) => parseInline(child)) };
  if (node.type === 'heading') return { type: 'heading', attrs: { level: node.depth }, content: node.children.flatMap((child) => parseInline(child)) };
  if (node.type === 'thematicBreak') return { type: 'horizontalRule' };
  if (node.type === 'html' && node.value.trim() === '<!-- aionsoft:page-break -->') return { type: 'page_break' };
  if (node.type === 'table') return parseTable(node);
  if (node.type === 'blockquote') return { type: 'blockquote', content: node.children.map(parseBlock) };
  if (node.type === 'list') return { type: node.ordered ? 'orderedList' : 'bulletList', content: node.children.map(parseBlock) };
  if (node.type === 'listItem') return { type: 'listItem', content: node.children.map(parseBlock) };
  return null;
}

function parseSectionsSegment(segment) {
  const parsed = segment.sections.items.map((item) => ({
    type: 'sectionItem',
    attrs: Object.fromEntries(Object.entries(item).filter(([key]) => key !== 'lines')),
    content: parseBlocks(markdownParser.parse(item.lines.join('\n')).children)
  }));
  return { type: 'section', content: parsed };
}

/** Parse Carta Markdown into the normalized document model used by document services. */
export function markdownToDocumentContent(markdown) {
  return {
    type: 'doc',
    content: splitSectionsBlocks(markdown).flatMap((sectionSegment) => sectionSegment.type === 'sections'
      ? [parseSectionsSegment(sectionSegment)]
      : splitListTableBlocks(sectionSegment.value).flatMap((segment) => segment.type === 'list-table'
        ? [listTableNode(segment.table)]
        : parseBlocks(markdownParser.parse(segment.value).children)))
  };
}