import { parseListTableBlock } from './list-table-markdown.js';

const text = (value) => ({ type: 'text', value: String(value ?? '') });
const cell = (children, className = '') => ({
  type: 'tableCell',
  ...(className ? { data: { hProperties: { className } } } : {}),
  children: Array.isArray(children) ? children : [text(children)]
});

function styledValue(column) {
  let node = text(`@${column.childFieldKey}`);
  if (column.bold) node = { type: 'strong', children: [node] };
  if (column.italic) node = { type: 'emphasis', children: [node] };
  return node;
}

function previewTable(table, availableFields) {
  const list = availableFields.find((field) => field.type === 'list' && (field.id === table.listFieldKey || field.fieldKey === table.listFieldKey));
  const columns = table.columns.map((column) => ({ ...column, field: list?.fields?.find((field) => field.id === column.childFieldKey || field.fieldKey === column.childFieldKey) }));
  const rows = [
    { type: 'tableRow', children: columns.map((column) => cell(column.field?.label || column.childFieldKey, column.className)) },
    { type: 'tableRow', ...(table.rowClassName ? { data: { hProperties: { className: table.rowClassName } } } : {}), children: columns.map((column) => cell([styledValue(column)], column.className)) }
  ];
  for (const summary of table.summaries) {
    const field = availableFields.find((candidate) => candidate.id === summary.fieldKey || candidate.fieldKey === summary.fieldKey);
    rows.push({ type: 'tableRow', children: columns.map((column, index) => cell(index === columns.length - 1 ? `@${summary.label || field?.label || summary.fieldKey}` : '', index === columns.length - 1 ? summary.className : column.className)) });
  }
  return {
    type: 'table',
    align: columns.map((column) => column.textAlign || null),
    ...(table.className ? { data: { hProperties: { className: table.className } } } : {}),
    children: rows
  };
}

function transformChildren(children, availableFields) {
  for (let index = 0; index < (children?.length ?? 0); index += 1) {
    const node = children[index];
    const source = node.type === 'paragraph' && node.children?.length === 1 && node.children[0].type === 'text' ? node.children[0].value : '';
    if (String(source).trimStart().startsWith('|>Table')) {
      try {
        children[index] = previewTable(parseListTableBlock(source), availableFields);
      } catch (error) {
        children[index] = { type: 'paragraph', children: [text(`List table error: ${error.message}`)] };
      }
      continue;
    }
    transformChildren(node.children, availableFields);
  }
}

export function listTableCarta(availableFields = []) {
  return {
    transformers: [{
      execution: 'sync',
      type: 'remark',
      transform: ({ processor }) => processor.use(() => (tree) => transformChildren(tree.children, availableFields))
    }]
  };
}
