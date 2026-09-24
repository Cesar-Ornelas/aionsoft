import { normalizeDocumentClasses } from './document-class.js';

function parseOptions(value, lineNumber) {
  return { className: value ? normalizeDocumentClasses(value, `Section classes on line ${lineNumber}`) : '' };
}

export function parseSectionsBlock(source) {
  const lines = String(source ?? '').split(/\r?\n/);
  if (lines[0]?.trim() !== '|>Sections' || lines.at(-1)?.trim() !== '<|') throw new Error('Section blocks must start with |>Sections and end with <|.');
  const items = [];
  let current = null;
  for (let index = 1; index < lines.length - 1; index += 1) {
    const line = lines[index];
    const match = line.trim().match(/^Section(?:\s+class="([^"]*)")?$/i);
    if (match) {
      if (current) items.push(current);
      current = { ...parseOptions(match[1], index + 1), lines: [] };
      continue;
    }
    if (!current) {
      if (line.trim()) throw new Error(`Section content must follow a Section definition on line ${index + 1}.`);
      continue;
    }
    current.lines.push(line);
  }
  if (current) items.push(current);
  if (!items.length) throw new Error('Section blocks need at least one Section definition.');
  return { items };
}

export function splitSectionsBlocks(markdown) {
  const lines = String(markdown ?? '').split(/\r?\n/);
  const segments = [];
  let markdownLines = [];
  const flushMarkdown = () => {
    if (markdownLines.length) segments.push({ type: 'markdown', value: markdownLines.join('\n') });
    markdownLines = [];
  };
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].trim() !== '|>Sections') {
      markdownLines.push(lines[index]);
      continue;
    }
    flushMarkdown();
    const start = index;
    while (index < lines.length && lines[index].trim() !== '<|') index += 1;
    if (index >= lines.length) throw new Error(`Section block starting on line ${start + 1} is missing <|.`);
    const value = lines.slice(start, index + 1).join('\n');
    segments.push({ type: 'sections', value, sections: parseSectionsBlock(value) });
  }
  flushMarkdown();
  return segments;
}

export function serializeSectionsBlock(items = [], renderContent) {
  const lines = ['|>Sections'];
  for (const item of items) {
    const attrs = item.attrs ?? item;
    const options = [];
    lines.push(`Section${attrs.className ? ` class="${normalizeDocumentClasses(attrs.className)}"` : ''}`);
    const content = renderContent?.(item.content ?? []) || '';
    if (content) lines.push(content);
  }
  lines.push('<|');
  return lines.join('\n');
}
