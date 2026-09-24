import { TABLE_COLOR_PALETTE } from './table-cell.js';

const tokenKey = (item) => item.fieldKey || item.key || item.id;
const tokenLabel = (item) => item.label || tokenKey(item);

function insert(input, text) {
  const position = input.textarea.selectionStart;
  input.insertAt(position, text);
  input.textarea.setSelectionRange(position + text.length, position + text.length);
}

function tokenSnippet(prefix, item, group, kind, key = tokenKey(item), label = tokenLabel(item), idKey = key) {
  return {
    id: `${kind}:${idKey}`,
    group,
    title: `${prefix}${label}`,
    description: `${kind} ${key}`,
    action: (input) => insert(input, `{{${prefix}${key}}}`)
  };
}

function listTableSnippet(list) {
  const columns = list.fields ?? [];
  return {
    id: `list-table:${list.id}`,
    group: 'Lists',
    title: `@${tokenLabel(list)} (List table)`,
    description: `List ${tokenKey(list)} · insert a table with all child fields`,
    action: (input) => {
      const width = Math.max(1, Math.floor(100 / Math.max(1, columns.length)));
      const block = ['|>Table', `src={{@${tokenKey(list)}|${tokenLabel(list)}}}`, ...columns.map((field) => `col={{@${tokenKey(field)}}} class="w-[${width}%]"`), '<|'].join('\n');
      const text = `${input.getLine().value ? '\n\n' : ''}${block}\n\n`;
      insert(input, text);
    }
  };
}

function sectionsSnippet() {
  return {
    id: 'sections',
    group: 'Layout',
    title: 'Sections',
    description: 'Insert a two-column flex sections block',
    action: (input) => {
      const block = ['|>Sections', 'Section class="w-1/2"', '**Left section**', 'Section class="w-1/2"', '**Right section**', '<|'].join('\n');
      const text = `${input.getLine().value ? '\n\n' : ''}${block}\n\n`;
      insert(input, text);
    }
  };
}

function documentColorSnippets() {
  return Object.keys(TABLE_COLOR_PALETTE).flatMap((color) => {
    const snippets = [
      ['bg', 'Background'],
      ['text', 'Text']
    ].map(([type, label]) => documentColorSnippet(color, type, label));

    for (const variant of ['odd', 'even']) {
      snippets.push(
        documentColorSnippet(color, `bg`, 'Background', variant),
        documentColorSnippet(color, `text`, 'Text', variant)
      );
    }

    return snippets;
  });
}

function documentColorSnippet(color, type, label, variant = '') {
  const alias = `${variant ? `${variant}-` : ''}${type}`;
  const className = `${variant ? `${variant}:` : ''}${documentColorClass(type, color)}`;
  return {
    id: `document-color:${alias}:${color}`,
    group: 'Document colors',
    title: `tw-${alias}-${color}`,
    description: `${variant ? `${variant} ` : ''}${label.toLowerCase()} color ${color}`,
    action: (input) => insert(input, className)
  };
}

function documentColorClass(type, color) {
  const grayMatch = color.match(/^gray(\d+)$/);
  return `${type}-${grayMatch ? `gray-${grayMatch[1]}` : color}`;
}

export function documentSlashSnippets(availableFields = [], availableVariables = []) {
  const lists = availableFields.filter((field) => field.type === 'list');
  const listChildIds = new Set(lists.flatMap((list) => (list.fields ?? []).map((child) => child.id)));
  const aggregates = availableFields.filter((field) => field.type === 'aggregate');
  const regularFields = availableFields.filter((field) => field.type !== 'list' && field.type !== 'aggregate' && !listChildIds.has(field.id));
  const listItems = lists.flatMap((list) => (list.fields ?? []).map((child) => tokenSnippet('@', child, 'List items', 'List item', tokenKey(child), `${tokenLabel(list)} · ${tokenLabel(child)}`, `${tokenKey(list)}.${tokenKey(child)}`)));
  return [
    sectionsSnippet(),
    ...lists.map(listTableSnippet),
    ...listItems,
    ...aggregates.map((field) => tokenSnippet('@', field, 'Calculated list values', 'Calculated list value')),
    ...regularFields.map((field) => tokenSnippet('@', field, 'Fields', 'Field')),
    ...availableVariables.map((variable) => tokenSnippet('#', variable, 'Global variables', 'Global')),
    ...documentColorSnippets()
  ];
}
