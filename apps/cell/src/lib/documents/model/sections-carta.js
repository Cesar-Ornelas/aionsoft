import { parseSectionsBlock } from './sections-markdown.js';
import { documentClassAttribute } from './document-class.js';
import { unified } from 'unified';
import remarkParse from 'remark-parse';

const escapeHtml = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const markdownParser = unified().use(remarkParse);

function renderMarkdownNode(node) {
  if (node.type === 'text') return escapeHtml(node.value);
  if (node.type === 'strong') return `<strong>${renderMarkdownNodes(node.children)}</strong>`;
  if (node.type === 'emphasis') return `<em>${renderMarkdownNodes(node.children)}</em>`;
  if (node.type === 'inlineCode') return `<code>${escapeHtml(node.value)}</code>`;
  if (node.type === 'break') return '<br />';
  if (node.type === 'paragraph') return `<p>${renderMarkdownNodes(node.children)}</p>`;
  if (node.type === 'heading') return `<h${node.depth}>${renderMarkdownNodes(node.children)}</h${node.depth}>`;
  if (node.type === 'blockquote') return `<blockquote>${renderMarkdownNodes(node.children)}</blockquote>`;
  if (node.type === 'list') return `<${node.ordered ? 'ol' : 'ul'}>${renderMarkdownNodes(node.children)}</${node.ordered ? 'ol' : 'ul'}>`;
  if (node.type === 'listItem') return `<li>${renderMarkdownNodes(node.children)}</li>`;
  if (node.type === 'thematicBreak') return '<hr />';
  return renderMarkdownNodes(node.children);
}

function renderMarkdownNodes(nodes = []) {
  return nodes.map(renderMarkdownNode).join('');
}

export function previewHtml(source) {
  const sections = parseSectionsBlock(source);
  const items = sections.items.map((item) => {
    const content = renderMarkdownNodes(markdownParser.parse(item.lines.join('\n')).children);
    return `<div${documentClassAttribute(item.className)}>${content || '&nbsp;'}</div>`;
  }).join('');
  return `<div style="display:flex;flex-direction:row;align-items:flex-start;width:100%;gap:1rem">${items}</div>`;
}

function textValue(node) {
  if (node.type === 'text') return node.value || '';
  return (node.children ?? []).map(textValue).join('');
}

export function sectionsCarta() {
  return {
    transformers: [{
      execution: 'sync',
      type: 'remark',
      transform: ({ processor }) => processor.use(() => (tree) => {
        for (const node of tree.children ?? []) {
          if (node.type !== 'paragraph') continue;
          const source = (node.children ?? []).map(textValue).join('');
          if (!source.trimStart().startsWith('|>Sections') || !source.trimEnd().endsWith('<|')) continue;
          try {
            node.type = 'html';
            node.value = previewHtml(source);
            delete node.children;
          } catch {}
        }
      })
    }]
  };
}
