import { describe, expect, test } from 'bun:test';
import { documentContentToMarkdown, markdownToDocumentContent } from '../../model/document-markdown.js';
import { normalizeDocumentContent, renderDocumentHtml } from '../../model/content.js';
import { parseListTableBlock, serializeListTableBlock, splitListTableBlocks } from '../../model/list-table-markdown.js';
import { documentSlashSnippets } from '../../model/document-slash-snippets.js';
import { previewHtml as previewSectionsHtml } from '../../model/sections-carta.js';

describe('document Markdown authoring format', () => {
  test('offers Sections, Lists, List items, and calculated List values through slash commands', () => {
    const fields = [
      { id: 'services', fieldKey: 'services', type: 'list', label: 'Services', fields: [
        { id: 'service_name', fieldKey: 'service_name', type: 'text', label: 'Name' },
        { id: 'service_amount', fieldKey: 'service_amount', type: 'money', label: 'Amount' }
      ] },
      { id: 'services_total', fieldKey: 'services_total', type: 'aggregate', label: 'Services total' }
    ];
    const snippets = documentSlashSnippets([...fields, ...fields[0].fields]);
    const inserted = [];
    const input = { textarea: { selectionStart: 0, setSelectionRange() {} }, getLine: () => ({ value: '' }), insertAt: (_, value) => inserted.push(value) };

    expect(snippets.slice(0, 5).map(({ group, title }) => [group, title])).toEqual([
      ['Layout', 'Sections'],
      ['Lists', '@Services (List table)'],
      ['List items', '@Services · Name'],
      ['List items', '@Services · Amount'],
      ['Calculated list values', '@Services total']
    ]);
    snippets[0].action(input);
    snippets[1].action(input);
    snippets[2].action(input);
    expect(inserted[0]).toContain('|>Sections');
    expect(inserted[0]).toContain('Section class="w-1/2"');
    expect(inserted[1]).toContain('src={{@services|Services}}');
    expect(inserted[1]).toContain('col={{@service_amount}} class="w-[50%]"');
    expect(inserted[2]).toBe('{{@service_name}}');
  });

  test('offers fixed document background and text color shortcuts', () => {
    const snippets = documentSlashSnippets();
    const background = snippets.find((snippet) => snippet.title === 'tw-bg-primary');
    const text = snippets.find((snippet) => snippet.title === 'tw-text-primary');
    const oddBackground = snippets.find((snippet) => snippet.title === 'tw-odd-bg-gray100');
    const evenText = snippets.find((snippet) => snippet.title === 'tw-even-text-gray200');
    const inserted = [];
    const input = { textarea: { selectionStart: 0, setSelectionRange() {} }, insertAt: (_, value) => inserted.push(value) };

    background.action(input);
    text.action(input);
    oddBackground.action(input);
    evenText.action(input);

    expect(background.group).toBe('Document colors');
    expect(text.group).toBe('Document colors');
    expect(inserted).toEqual(['bg-primary', 'text-primary', 'odd:bg-gray-100', 'even:text-gray-200']);
  });

  test('parses and serializes declarative List table blocks', () => {
    const markdown = `|>Table
class="border-collapse border border-gray-400"
row-class="even:bg-gray-50 odd:bg-white"
src={{@services|Services}}
col={{@service_name}} class="w-[30%]"
col={{@service_description}} class="w-[30%] text-xs"
col={{@service_amount}} class="w-[50%] italic font-bold text-right"
summary={{@services_total|Total}} class="italic font-bold text-xs"
<|`;

    const table = parseListTableBlock(markdown);

    expect(table).toEqual({
      listFieldKey: 'services',
      listLabel: 'Services',
      className: 'border-collapse border border-gray-400',
      rowClassName: 'even:bg-gray-50 odd:bg-white',
      columns: [
        { childFieldKey: 'service_name', className: 'w-[30%]' },
        { childFieldKey: 'service_description', className: 'w-[30%] text-xs' },
        { childFieldKey: 'service_amount', className: 'w-[50%] italic font-bold text-right' }
      ],
      summaries: [{ fieldKey: 'services_total', label: 'Total', className: 'italic font-bold text-xs' }]
    });
    expect(serializeListTableBlock({ repeatListFieldKey: table.listFieldKey, listTableLabel: 'Services', className: table.className, rowClassName: table.rowClassName, listTableColumns: table.columns, listTableSummaries: table.summaries })).toBe(markdown);
  });

  test('parses inline List table classes for Carta preview syntax', () => {
    const markdown = `|>Table class="border-collapse border border-gray-400" row-class="even:bg-gray-50 odd:bg-white"
src={{@services|Services}}
col={{@service_name}}
col={{@service_description}}
col={{@service_amount}}
summary={{@services_total|Total}} class="font-bold font-lg"
<|`;

    expect(parseListTableBlock(markdown)).toMatchObject({
      className: 'border-collapse border border-gray-400',
      rowClassName: 'even:bg-gray-50 odd:bg-white',
      summaries: [{ className: 'font-bold font-lg' }]
    });
    expect(splitListTableBlocks(markdown)[0].type).toBe('list-table');
  });

  test('splits List table blocks from surrounding Markdown and preserves authored width totals', () => {
    const segments = splitListTableBlocks(`Before\n\n|>Table\nsrc={{@services|Services}}\ncol={{@name}} class="w-[60%]"\ncol={{@amount}} class="w-[60%]"\n<|\n\nAfter`);

    expect(segments.map((segment) => segment.type)).toEqual(['markdown', 'list-table', 'markdown']);
    expect(segments[1].table.columns.map((column) => column.className)).toEqual(['w-[60%]', 'w-[60%]']);
  });

  test('rejects invalid List table options', () => {
    expect(() => parseListTableBlock('|>Table\nsrc={{@services|Services}}\ncol={{@name}} class="before:content-[x]"\n<|')).toThrow('Invalid list table classes');
    expect(() => parseListTableBlock('|>Table\nsrc={{@services|Services}}\ncol={{@name}}\nsummary={{@total|Total}} class="w-[50%] text-xs" extra\n<|')).toThrow('Invalid List table summary');
    expect(() => splitListTableBlocks('|>Table\nsrc={{@services|Services}}')).toThrow('missing <|');
  });

  test('round-trips declarative List tables through document content', () => {
    const markdown = `Before

|>Table
src={{@services|Services}}
col={{@service_name}} class="w-[30%]"
col={{@service_amount}} class="w-[50%] font-bold text-right"
summary={{@services_total|Total}}
<|

After`;
    const content = markdownToDocumentContent(markdown);

    expect(content.content.map((node) => node.type)).toEqual(['paragraph', 'table', 'paragraph']);
    expect(content.content[1].attrs).toMatchObject({ sourceSyntax: 'list-table', repeatListFieldKey: 'services', repeatRowIndex: 1 });
    expect(content.content[1].content[1].content[1].content[0].content[0].attrs).toMatchObject({ listFieldKey: 'services', childFieldKey: 'service_amount' });
    expect(documentContentToMarkdown(content)).toBe(markdown);
    expect(documentContentToMarkdown(normalizeDocumentContent(content))).toBe(markdown);
  });

  test('renders single Markdown line breaks on separate preview lines', () => {
    const markdown = '**Bill to:**\n{{@client_name|Client Name}}\n{{@client_street|Client Street}}\n{{@client_city|Client City}}, {{@client_state|Client State}}, {{@client_zip|Client ZIP}}';
    const html = renderDocumentHtml(markdownToDocumentContent(markdown), {}, { fields: [] });

    expect(html.match(/<br \/>/g)).toHaveLength(3);
  });

  test('preserves blank lines between paragraphs when round-tripping Markdown', () => {
    const markdown = '**INVOICE** {{@invoice_number|Invoice Number}}  \n**Date:** {{@invoice_date|Invoice Date}}  \n**Terms:** NET-10\n\n**Bill to:**';

    expect(documentContentToMarkdown(markdownToDocumentContent(markdown))).toBe(markdown);
  });

  test('serializes document tokens and page breaks into readable directives', () => {
    const markdown = documentContentToMarkdown({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Customer: ' },
            { type: 'document_field', attrs: { fieldKey: 'customer_name', label: 'Customer name' } },
            { type: 'text', text: ' at ' },
            { type: 'document_variable', attrs: { variableKey: 'company_name', label: 'Company name' } }
          ]
        },
        { type: 'page_break' }
      ]
    });

    expect(markdown).toContain('{{@customer_name|Customer name}}');
    expect(markdown).toContain('{{#company_name|Company name}}');
    expect(markdown).toContain('<!-- aionsoft:page-break -->');
  });

  test('preserves Markdown escaping and table cell boundaries', () => {
    const markdown = documentContentToMarkdown({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: '*literal* [text]' }] },
        {
          type: 'table',
          content: [
            { type: 'tableRow', content: [{ type: 'tableHeader', content: [{ type: 'text', text: 'Name' }] }, { type: 'tableHeader', content: [{ type: 'text', text: 'Value' }] }] },
            { type: 'tableRow', content: [{ type: 'tableCell', content: [{ type: 'text', text: 'A|B' }] }, { type: 'tableCell', content: [{ type: 'text', text: 'ok' }] }] }
          ]
        }
      ]
    });

    expect(markdown).toContain('\\*literal\\* \\[text\\]');
    expect(markdown).toContain('| A\\|B | ok |');
  });

  test('serializes resource images with stable resource keys', () => {
    const markdown = documentContentToMarkdown({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'image', attrs: { resourceKey: 'resource-1', alt: 'Logo', widthPx: 320, heightPx: 180 } }] }]
    });

    expect(markdown).toContain('![Logo](resource://resource-1 "widthPx=320&heightPx=180")');
  });

  test('parses Carta directives and standard Markdown into normalized nodes', () => {
    const content = markdownToDocumentContent('# Agreement\n\nCustomer: {{@customer_name|Customer name}}\n\n<!-- aionsoft:page-break -->');

    expect(content.content).toEqual([
      { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Agreement' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Customer: ' }, { type: 'document_field', attrs: { fieldKey: 'customer_name', label: 'Customer name', fontSize: null, textColor: null, backgroundColor: null } }] },
      { type: 'page_break' }
    ]);
  });

  test('accepts key-only field and variable tokens', () => {
    const content = markdownToDocumentContent('Customer: {{@client_name}} / {{#company_name}}');

    expect(content.content[0].content).toEqual([
      { type: 'text', text: 'Customer: ' },
      { type: 'document_field', attrs: { fieldKey: 'client_name', label: 'client_name', fontSize: null, textColor: null, backgroundColor: null } },
      { type: 'text', text: ' / ' },
      { type: 'document_variable', attrs: { variableKey: 'company_name', label: 'company_name', fontSize: null, textColor: null, backgroundColor: null } }
    ]);
  });

  test('parses GFM tables into document table nodes', () => {
    const content = markdownToDocumentContent('| Name | Value |\n| --- | --- |\n| A | B |');

    expect(content.content[0]).toEqual({
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: [
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Name' }] }] },
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Value' }] }] }
          ]
        },
        {
          type: 'tableRow',
          content: [
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }] },
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B' }] }] }
          ]
        }
      ]
    });
  });

  test('serializes normalized table paragraphs', () => {
    const markdown = documentContentToMarkdown({
      type: 'doc',
      content: [{
        type: 'table',
        content: [
          { type: 'tableRow', content: [{ type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Name' }] }] }, { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Value' }] }] }] },
          { type: 'tableRow', content: [{ type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }] }, { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B' }] }] }] }
        ]
      }]
    });

    expect(markdown).toContain('| Name | Value |');
    expect(markdown).toContain('| A | B |');
  });

  test('round-trips table column width directives', () => {
    const markdown = documentContentToMarkdown({
      type: 'doc',
      content: [{
        type: 'table',
        attrs: { columnWidths: [25, 75] },
        content: [
          { type: 'tableRow', content: [{ type: 'tableHeader', content: [{ type: 'text', text: 'Name' }] }, { type: 'tableHeader', content: [{ type: 'text', text: 'Value' }] }] },
          { type: 'tableRow', content: [{ type: 'tableCell', content: [{ type: 'text', text: 'Customer' }] }, { type: 'tableCell', content: [{ type: 'text', text: 'Acme' }] }] }
        ]
      }]
    });

    expect(markdown).toContain('<!-- aionsoft:table {"widths":[25,75]} -->');
    expect(markdown).toContain('<!-- aionsoft:table-end -->');
    expect(markdownToDocumentContent(markdown).content[0].attrs).toEqual({ columnWidths: [25, 75] });
  });

  test('round-trips declarative flex Sections', () => {
    const markdown = `|>Sections
Section class="w-1/2"
**Bill to:**  
{{@client_name|Client Name}}  
{{@client_street|Client Street}}
Section class="w-1/2 text-right italic text-xs"
**Issued by:** {{#company_name|Company Name}}
<|`;
    const content = markdownToDocumentContent(markdown);

    expect(content.content[0].type).toBe('section');
    expect(content.content[0].content.map((item) => item.attrs)).toEqual([
      { className: 'w-1/2' },
      { className: 'w-1/2 text-right italic text-xs' }
    ]);
    expect(documentContentToMarkdown(content)).toBe(markdown);
    expect(documentContentToMarkdown(normalizeDocumentContent(content))).toBe(markdown);
  });

  test('allows Sections without classes', () => {
    const content = markdownToDocumentContent(`|>Sections
Section
Plain content
<|`);

    expect(content.content[0].content[0].attrs).toEqual({ className: '' });
    expect(documentContentToMarkdown(content)).toBe(`|>Sections
Section
Plain content
<|`);
  });

  test('renders formatted Section Markdown in Carta preview', () => {
    const html = previewSectionsHtml(`|>Sections
Section class="w-1/2 text-right"
**Formatted** content
<|`);

    expect(html).toContain('class="w-1/2 text-right"');
    expect(html).toContain('<strong>Formatted</strong> content');
    expect(html).not.toContain('**Formatted**');
  });

  test('renders Sections as a flex row with item styles', () => {
    const content = markdownToDocumentContent(`|>Sections
Section class="w-1/2"
**Bill to:**
Section class="w-1/2 text-right font-bold text-xs"
**Issued by:**
<|`);
    const html = renderDocumentHtml(content, {}, { fields: [] });

    expect(html).toContain('display:flex;flex-direction:row');
    expect(html).toContain('w-1/2');
    expect(html).toContain('text-right font-bold text-xs');
  });

  test('renders declarative table classes and rejects unsafe class tokens', () => {
    const content = markdownToDocumentContent(`|>Table
class="border border-gray-400"
src={{@services|Services}}
col={{@service_name}} class="w-[20%] text-xs"
<|`);
    const html = renderDocumentHtml(content, { services: [{ service_name: 'Design' }] }, { fields: [{ id: 'services', fieldKey: 'services', type: 'list', fields: [{ id: 'service_name', fieldKey: 'service_name', type: 'text', label: 'Service' }] }] });

    expect(html).toContain('class="document-table document-list-table border border-gray-400"');
    expect(html).toContain('class="w-[20%] text-xs"');
    expect(() => markdownToDocumentContent(`|>Sections
Section class="before:content-[x]"
Unsafe
<|`)).toThrow('Invalid section classes');
  });

  test('round-trips repeating List table bindings and child tokens', () => {
    const content = { type: 'doc', content: [{
      type: 'table', attrs: { repeatListFieldId: 'services', repeatRowIndex: 1 }, content: [
        { type: 'tableRow', content: [{ type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Service' }] }] }] },
        { type: 'tableRow', content: [{ type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'document_field', attrs: { listFieldId: 'services', childFieldId: 'service_name', listFieldKey: 'services', childFieldKey: 'name', label: 'Name' } }] }] }] }
      ]
    }] };

    const markdown = documentContentToMarkdown(content);
    const parsed = markdownToDocumentContent(markdown);

    expect(markdown).toContain('"repeatListFieldId":"services"');
    expect(markdown).toContain('{{@services.name\\|Name}}');
    expect(parsed.content[0].attrs).toMatchObject({ repeatListFieldId: 'services', repeatRowIndex: 1 });
    expect(parsed.content[0].content[1].content[0].content[0].content[0].attrs).toMatchObject({ listFieldKey: 'services', childFieldKey: 'name' });
  });

  test('does not treat similar HTML comments as page breaks', () => {
    expect(markdownToDocumentContent('<!-- aionsoft:page-break-note -->').content).toEqual([]);
  });
});