import { describe, expect, test } from 'bun:test';
import { createDocumentTemplateService } from '../services/document-template-service.js';
import { createDocumentService } from '../services/document-service.js';
import { normalizeDocumentContent, renderAuthoredDocumentHtml, renderDocumentHtml, extractFieldReferences, validateFieldReferences } from '../../model/content.js';
import { normalizePageConfig } from '../../model/page-config.js';
import { markdownToDocumentContent } from '../../model/document-markdown.js';

function createRepository() {
  const templates = [];
  const versions = [];
  const documents = [];
  const reviewComments = [];
  const deletedTemplates = [];
  let nextId = 1;
  return {
    templates,
    versions,
    documents,
    reviewComments,
    deletedTemplates,
    async listTemplates() { return templates; },
    async findTemplateById(id) { return templates.find((item) => item.id === id) ?? null; },
    async createTemplate(input) { const value = { id: `template-${nextId++}`, ...input }; templates.push(value); return value; },
    async updateTemplate(id, input) { const value = templates.find((item) => item.id === id); Object.assign(value, input); return value; },
    async listTemplateVersions(templateId) { return versions.filter((item) => item.templateId === templateId); },
    async findTemplateVersionById(id) { return versions.find((item) => item.id === id) ?? null; },
    async createTemplateVersion(input) { const value = { id: `version-${nextId++}`, ...input }; versions.push(value); return value; },
    async updateTemplateVersion(id, input) { const value = versions.find((item) => item.id === id); Object.assign(value, input); return value; },
    async createDocument(input) { const value = { id: `document-${nextId++}`, ...input }; documents.push(value); return value; },
    async listDocuments() { return documents; }
    ,async listReviewComments(versionId) { return reviewComments.filter((item) => item.versionId === versionId); }
    ,async deleteTemplate(id) { deletedTemplates.push(id); }
  };
}

const formVersion = {
  id: 'form-version-1',
  isPublished: true,
  schema: { fields: [{ id: 'name', fieldKey: 'customer_name', type: 'text', label: 'Customer name' }] }
};

const content = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Agreement' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Customer: ' }, { type: 'document_field', attrs: { fieldId: 'name', fieldKey: 'customer_name', label: 'Customer name' } }] }
  ]
};

describe('document content', () => {
  test('preserves global variable tags in page configuration paragraphs', () => {
    const pageConfig = normalizePageConfig({
      header: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'document_variable', attrs: { variableKey: 'company_name', label: 'Company Name' } }] }]
      }
    });

    expect(pageConfig.header.content[0].content).toEqual([
      { type: 'document_variable', attrs: { variableKey: 'company_name', label: 'Company Name', fontSize: null, textColor: null, backgroundColor: null } }
    ]);
  });

  test('preserves pixel dimensions for page configuration images', () => {
    const pageConfig = normalizePageConfig({
      footer: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'image', attrs: { resourceKey: 'img-1', widthPx: 320, heightPx: 180 } }] }]
      }
    });

    expect(pageConfig.footer.content[0].content[0].attrs).toEqual({ resourceKey: 'img-1', alt: '', width: null, widthPx: 320, heightPx: 180 });
  });

  test('extracts references and escapes generated values', () => {
    expect(extractFieldReferences(content)).toEqual([{ fieldId: 'name', fieldKey: 'customer_name', label: 'Customer name', fontSize: null, textColor: null, backgroundColor: null }]);
    expect(renderDocumentHtml(content, { name: '<Acme>' }, formVersion.schema)).toContain('&lt;Acme&gt;');
  });

  test('renders aggregate fields from List rows instead of supplied totals', () => {
    const listSchema = { fields: [
      { id: 'services', fieldKey: 'services', type: 'list', label: 'Services', fields: [{ id: 'service_amount', fieldKey: 'amount', type: 'money', label: 'Amount' }] },
      { id: 'services_total', fieldKey: 'services_total', type: 'aggregate', label: 'Total', sourceListFieldId: 'services', sourceChildFieldId: 'service_amount', operation: 'sum', calculationFormat: 'currency' }
    ] };
    const aggregateContent = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'document_field', attrs: { fieldId: 'services_total', fieldKey: 'services_total', label: 'Total' } }] }] };

    const rendered = renderDocumentHtml(aggregateContent, { services: [{ service_amount: 10 }, { service_amount: 15 }], services_total: 999 }, listSchema);

    expect(rendered).toContain('>$25.00</span>');
    expect(rendered).not.toContain('999');
  });

  test('repeats a bound table row for every List item', () => {
    const listSchema = { fields: [{ id: 'services', fieldKey: 'services', type: 'list', label: 'Services', fields: [
      { id: 'service_name', fieldKey: 'name', type: 'text', label: 'Name' },
      { id: 'service_amount', fieldKey: 'amount', type: 'money', label: 'Amount' }
    ] }] };
    const table = { type: 'doc', content: [{
      type: 'table', attrs: { repeatListFieldId: 'services', repeatRowIndex: 1 }, content: [
        { type: 'tableRow', content: [
          { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Service' }] }] },
          { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Amount' }] }] }
        ] },
        { type: 'tableRow', content: [
          { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'document_field', attrs: { listFieldId: 'services', childFieldId: 'service_name', label: 'Name' } }] }] },
          { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'document_field', attrs: { listFieldId: 'services', childFieldId: 'service_amount', label: 'Amount' } }] }] }
        ] }
      ]
    }] };

    const rendered = renderDocumentHtml(table, { services: [{ service_name: '<Setup>', service_amount: 100 }, { service_name: 'Support', service_amount: 50 }] }, listSchema);

    expect(rendered.match(/<tr>/g)).toHaveLength(3);
    expect(rendered).toContain('&lt;Setup&gt;');
    expect(rendered).toContain('Support');
    expect(rendered).toContain('$100.00');
  });

  test('renders declarative List tables with body formatting and summary footers', () => {
    const schema = { fields: [
      { id: 'field-services', fieldKey: 'services', type: 'list', label: 'Services', fields: [
        { id: 'field-service-name', fieldKey: 'service_name', type: 'text', label: 'Service' },
        { id: 'field-service-description', fieldKey: 'service_description', type: 'text', label: 'Description' },
        { id: 'field-service-amount', fieldKey: 'service_amount', type: 'money', label: 'Amount' }
      ] },
      { id: 'field-services-total', fieldKey: 'services_total', type: 'aggregate', label: 'Total', sourceListFieldId: 'field-services', sourceChildFieldId: 'field-service-amount', operation: 'sum', calculationFormat: 'currency' }
    ] };
    const table = markdownToDocumentContent(`|>Table
src={{@services|Services}}
  row-class="even:bg-gray-50 odd:bg-white"
col={{@service_name}} class="w-[30%]"
col={{@service_description}} class="w-[30%] text-xs"
col={{@service_amount}} class="w-[50%] font-bold text-right"
summary={{@services_total|Amount}} class="italic font-bold text-xs"
<|`);

    const rendered = renderDocumentHtml(table, { services: [{ service_name: '<Setup>', service_description: 'Initial', service_amount: 10 }, { service_name: 'Support', service_description: 'Monthly', service_amount: 15 }], services_total: 999 }, schema);

    expect(rendered).toContain('<thead>');
    expect(rendered).toContain('>Service</th>');
    expect(rendered).toContain('w-[30%] text-xs');
    expect(rendered).toContain('w-[50%] font-bold text-right');
    expect(rendered).toContain('&lt;Setup&gt;');
    expect(rendered).toContain('text-xs');
    expect(rendered).toContain('font-bold text-right');
    expect(rendered.match(/even:bg-gray-50 odd:bg-white/g)).toHaveLength(2);
    expect(rendered).toContain('<tfoot>');
    expect(rendered).toContain('Amount');
    expect(rendered).toContain('$25.00');
    expect(rendered.match(/italic font-bold text-xs/g)).toHaveLength(2);
    expect(rendered).not.toContain('999');
  });

  test('rejects unresolved declarative List table columns and summaries', () => {
    const schema = { fields: [{ id: 'services', fieldKey: 'services', type: 'list', label: 'Services', fields: [{ id: 'service_name', fieldKey: 'service_name', type: 'text', label: 'Service' }] }] };
    const missingColumn = markdownToDocumentContent('|>Table\nsrc={{@services|Services}}\ncol={{@missing}}\n<|');
    const missingSummary = markdownToDocumentContent('|>Table\nsrc={{@services|Services}}\ncol={{@service_name}}\nsummary={{@missing_total|Total}}\n<|');

    expect(() => validateFieldReferences(missingColumn, schema)).toThrow('Document List column reference does not resolve');
    expect(() => validateFieldReferences(missingSummary, schema)).toThrow('List table summary does not resolve');
  });

  test('repairs root-level inline tokens and previews unresolved references', () => {
    const invalidShape = {
      type: 'doc',
      content: [{ type: 'document_field', attrs: { fieldKey: 'missing_field', label: 'Missing field' } }, { type: 'document_variable', attrs: { variableKey: 'missing_variable', label: 'Missing variable' } }]
    };
    const normalized = normalizeDocumentContent(invalidShape);
    expect(normalized.content.map((node) => node.type)).toEqual(['paragraph', 'paragraph']);
    const rendered = renderDocumentHtml(invalidShape, {}, { fields: [] }, undefined, [], []);
    expect(rendered).toContain('@Missing field');
    expect(rendered).toContain('#Missing variable');
  });

  test('persists and renders styled field and variable tokens', () => {
    const styled = {
      type: 'doc',
      content: [{ type: 'paragraph', attrs: { textAlign: 'center' }, content: [
        { type: 'document_field', attrs: { fieldId: 'name', fieldKey: 'customer_name', label: 'Customer name', fontSize: '18pt', textColor: 'ink', backgroundColor: 'amber' } },
        { type: 'document_variable', attrs: { variableKey: 'company_name', label: 'Company', fontSize: '10pt', textColor: 'blue', backgroundColor: 'white' } }
      ] }]
    };
    const normalized = normalizeDocumentContent(styled);
    expect(normalized.content[0].content[0].attrs).toMatchObject({ fontSize: '18pt', textColor: 'ink', backgroundColor: 'amber' });
    const generated = renderDocumentHtml(styled, { name: 'Acme' }, formVersion.schema, undefined, [], [{ key: 'company_name', value: 'Aionsoft' }]);
    expect(generated).toContain('font-size:18pt;color:#1e293b;background-color:#fef3c7');
    expect(generated).toContain('font-size:10pt;color:#dbeafe;background-color:#ffffff');
    expect(renderAuthoredDocumentHtml(styled)).toContain('data-document-field="customer_name" style="font-size:18pt;color:#1e293b;background-color:#fef3c7"');
  });

  test('normalizes and renders paragraph line height with the 8pt font preset', () => {
    const styled = { type: 'doc', content: [{ type: 'paragraph', attrs: { textAlign: 'center', lineHeight: '0.85' }, content: [{ type: 'document_field', attrs: { fieldId: 'name', fieldKey: 'customer_name', fontSize: '8pt' } }] }] };
    const normalized = normalizeDocumentContent(styled);
    expect(normalized.content[0].attrs).toEqual({ textAlign: 'center', lineHeight: '0.85' });
    expect(normalized.content[0].content[0].attrs.fontSize).toBe('8pt');
    expect(renderDocumentHtml(styled, { name: 'Acme' }, formVersion.schema)).toContain('<p style="text-align:center;line-height:0.85">');
    expect(renderDocumentHtml(styled, { name: 'Acme' }, formVersion.schema)).toContain('font-size:8pt');
  });

  test('formats date fields without shifting date-only values', () => {
    const dateContent = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'document_field', attrs: { fieldId: 'start-date', fieldKey: 'start_date', label: 'Start date', format: 'long' } }] }] };
    const dateSchema = { fields: [{ id: 'start-date', fieldKey: 'start_date', type: 'date', label: 'Start date' }] };
    expect(renderDocumentHtml(dateContent, { 'start-date': '2026-09-07' }, dateSchema)).toContain('September 7, 2026');
  });

  test('renders borderless tables with field values', () => {
    const tableContent = { type: 'doc', content: [{ type: 'table', content: [{ type: 'tableRow', content: [{ type: 'tableCell', attrs: { colspan: 1, rowspan: 1 }, content: [{ type: 'paragraph', content: [{ type: 'document_field', attrs: { fieldId: 'name', fieldKey: 'customer_name', label: 'Customer name' } }] }] }, { type: 'tableCell', attrs: { colspan: 1, rowspan: 1 }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Signature' }] }] }] }] }] };
    const rendered = renderDocumentHtml(tableContent, { name: 'Acme' }, formVersion.schema);
    expect(rendered).toContain('<table class="document-table"');
    expect(rendered).toContain('border:0');
    expect(rendered).toContain('Acme');
  });

  test('renders Markdown table column widths with a colgroup', () => {
    const html = renderDocumentHtml({
      type: 'doc',
      content: [{
        type: 'table',
        attrs: { columnWidths: [25, 75] },
        content: [{
          type: 'tableRow',
          content: [
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Name' }] }] },
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Value' }] }] }
          ]
        }]
      }]
    });

    expect(html).toContain('<colgroup><col style="width:25%" /><col style="width:75%" /></colgroup>');
  });

  test('normalizes table formatting with safe defaults and bounded custom widths', () => {
    const normalized = normalizeDocumentContent({
      type: 'doc',
      content: [{
        type: 'table',
        content: [{
          type: 'tableRow',
          content: [{
            type: 'tableCell',
            attrs: { widthMode: 'custom', widthPercent: 140, backgroundColor: 'blue', textColor: 'not-css', textAlign: 'center', verticalAlign: 'middle' },
            content: [{ type: 'paragraph' }]
          }]
        }]
      }]
    });
    expect(normalized.content[0].content[0].content[0].attrs).toEqual({
      colspan: 1,
      rowspan: 1,
      widthMode: 'custom',
      widthPercent: 100,
      backgroundColor: 'blue',
      textColor: null,
      textAlign: 'center',
      verticalAlign: 'middle'
    });
  });

  test('renders persisted table formatting in generated and layout HTML', () => {
    const table = { type: 'table', content: [{ type: 'tableRow', content: [{ type: 'tableCell', attrs: { widthMode: 'custom', widthPercent: 35, backgroundColor: 'amber', textColor: 'ink', textAlign: 'right', verticalAlign: 'bottom' }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Styled' }] }] }] }] };
    const rendered = renderDocumentHtml({ type: 'doc', content: [table] });
    const layout = renderDocumentHtml({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Body' }] }] }, {}, { fields: [] }, { header: { type: 'doc', content: [table] } });
    expect(rendered).toContain('vertical-align:bottom;width:35%;background-color:#fef3c7;color:#1e293b;text-align:right');
    expect(layout).toContain('vertical-align:bottom;width:35%;background-color:#fef3c7;color:#1e293b');
  });

  test('supports horizontal rules from contract content', () => {
    const contractContent = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Section one' }] }, { type: 'horizontalRule' }, { type: 'paragraph', content: [{ type: 'text', text: 'Section two' }] }] };
    expect(renderDocumentHtml(contractContent)).toContain('<hr />');
  });

  test('preserves explicit page breaks for print renderers', () => {
    const pageBreakContent = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Page one' }] }, { type: 'page_break' }, { type: 'paragraph', content: [{ type: 'text', text: 'Page two' }] }] };
    const rendered = renderDocumentHtml(pageBreakContent);
    expect(rendered).toContain('data-page-break="true"');
    expect(rendered).toContain('break-before:page');
    expect(rendered).toContain('Page two');
  });

  test('renders version page configuration around document content', () => {
    const rendered = renderDocumentHtml(
      { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Body' }] }] },
      {},
      { fields: [] },
      {
        margins: { top: 0.5, right: 0.75, bottom: 1.25, left: 1.5 },
        header: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Header' }] }] },
        footer: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Footer' }] }] }
      }
    );
    expect(rendered).toContain('--document-margin-top:0.5in');
    expect(rendered).toContain('Header');
    expect(rendered).toContain('Footer');
    expect(rendered).toContain('Body');
  });

  test('renders header layout tables without borders or spacing and preserves alignment', () => {
    const rendered = renderDocumentHtml(
      { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Body' }] }] },
      {},
      { fields: [] },
      {
        header: {
          type: 'doc',
          content: [{ type: 'table', content: [{ type: 'tableRow', content: [{ type: 'tableCell', attrs: { colspan: 1, rowspan: 1 }, content: [{ type: 'paragraph', attrs: { textAlign: 'right' }, content: [{ type: 'text', text: 'Right header' }] }] }] }] }]
        }
      }
    );
    expect(rendered).toContain('class="document-layout-table"');
    expect(rendered).toContain('border:0;border-collapse:collapse;border-spacing:0;margin:0;padding:0');
    expect(rendered).toContain('border:0;margin:0;padding:0;vertical-align:top');
    expect(rendered).toContain('text-align:right');
    expect(rendered).toContain('Right header');
  });

  test('renders header font-size marks', () => {
    const rendered = renderDocumentHtml(
      { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Body' }] }] },
      {},
      { fields: [] },
      {
        header: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Company name', marks: [{ type: 'fontSize', attrs: { size: '24pt' } }] }, { type: 'text', text: ' Address', marks: [{ type: 'fontSize', attrs: { size: '10pt' } }] }] }]
        }
      }
    );
    expect(rendered).toContain('<span style="font-size:24pt">Company name</span>');
    expect(rendered).toContain('<span style="font-size:10pt"> Address</span>');
  });

  test('renders scoped document images with escaped metadata and dimensions', () => {
    const html = renderDocumentHtml({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'image', attrs: { resourceKey: 'img-1', alt: 'A "sample"', width: 60, widthPx: 320, heightPx: 180 } }] }] }, {}, { fields: [] }, null, [{ resourceKey: 'img-1', url: 'https://files.example/image.png' }]);
    expect(html).toContain('src="https://files.example/image.png"');
    expect(html).toContain('alt="A &quot;sample&quot;"');
    expect(html).toContain('width:320px;');
    expect(html).toContain('height:180px;');
  });

  test('keeps global variables separate from fields and resolves escaped body and header values', () => {
    const variableContent = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'document_field', attrs: { fieldId: 'name', fieldKey: 'customer_name', label: 'Customer name' } }, { type: 'text', text: ' / ' }, { type: 'document_variable', attrs: { variableKey: 'company_name', label: 'Company Name' } }] }] };
    const rendered = renderDocumentHtml(variableContent, { name: 'Customer' }, formVersion.schema, { header: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'document_variable', attrs: { variableKey: 'company_name', label: 'Company Name' } }] }] } }, [], [{ key: 'company_name', label: 'Company Name', value: '<Aionsoft>' }]);
    expect(rendered).toContain('Customer');
    expect(rendered).toContain('&lt;Aionsoft&gt;');
    expect(rendered).toContain('data-document-variable="company_name"');
    expect(renderAuthoredDocumentHtml(variableContent)).toContain('#Company Name');
    expect(renderDocumentHtml(variableContent, { name: 'Customer' }, formVersion.schema)).toContain('#Company Name');
  });

  test('renders authored review content without replacing field tokens', () => {
    const authored = renderAuthoredDocumentHtml({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Customer: ' }, { type: 'document_field', attrs: { fieldId: 'name', fieldKey: 'customer_name', label: 'Customer name' } }] }] });
    expect(authored).toContain('Customer: ');
    expect(authored).toContain('@Customer name');
    expect(authored).not.toContain('Acme');
  });
});

describe('document services', () => {
  test('publishes a form-backed template and generates an immutable HTML snapshot', async () => {
    const repository = createRepository();
    const templates = createDocumentTemplateService(repository, { getFormVersion: async (id) => id === formVersion.id ? formVersion : null });
    const template = await templates.create({ name: 'Service agreement' });
    const draft = await templates.saveDraft(template.id, { content, formVersionId: formVersion.id, pageConfig: { margins: { top: 0.5, right: 1, bottom: 1, left: 1 } } });
    await templates.publish(template.id);
    const documentService = createDocumentService(repository, {
      getTemplateVersion: async (id) => repository.findTemplateVersionById(id),
      getFormVersion: async (id) => id === formVersion.id ? formVersion : null,
      findAccount: async () => null
    });

    const document = await documentService.generate({ templateVersionId: draft.id, values: { name: 'Acme' } });

    expect(document.status).toBe('generated');
    expect(document.formVersionId).toBe(formVersion.id);
    expect(document.renderedHtml).toContain('Acme');
    expect(document.dataSnapshot).toEqual({ name: 'Acme' });
    expect(repository.versions.find((item) => item.id === draft.id).isPublished).toBe(true);
    expect(repository.versions.find((item) => item.id === draft.id).pageConfig.margins.top).toBe(0.5);
  });

  test('allows internal documents without an account or form', async () => {
    const repository = createRepository();
    const templates = createDocumentTemplateService(repository);
    const template = await templates.create({ name: 'Internal memo' });
    const draft = await templates.saveDraft(template.id, { content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Internal' }] }] } });
    await templates.publish(template.id);
    const documentService = createDocumentService(repository, { getTemplateVersion: async () => repository.findTemplateVersionById(draft.id) });
    const document = await documentService.generate({ templateVersionId: draft.id });
    expect(document.operationsAccountId).toBeNull();
    expect(document.formVersionId).toBeNull();
  });

  test('saves body content that references a configured global variable', async () => {
    const repository = createRepository();
    const templates = createDocumentTemplateService(repository, {
      listVariables: async () => [{ key: 'company_name', label: 'Company Name', value: 'Aionsoft LLC', status: 'active' }]
    });
    const template = await templates.create({ name: 'Variable agreement' });
    const draft = await templates.saveDraft(template.id, {
      content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'document_variable', attrs: { variableKey: 'company_name', label: 'Company Name' } }] }] }
    });

    expect(draft.content.content[0].content[0].type).toBe('document_variable');
  });

  test('allows drafts to save unresolved field references', async () => {
    const repository = createRepository();
    const templates = createDocumentTemplateService(repository, { getFormVersion: async () => formVersion });
    const template = await templates.create({ name: 'Pending fields' });
    const draft = await templates.saveDraft(template.id, {
      formVersionId: formVersion.id,
      content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'document_field', attrs: { fieldKey: 'client_name', label: 'Client Name' } }] }] }
    });

    expect(draft.content.content[0].content[0].attrs.fieldKey).toBe('client_name');
  });

  test('deletes the template and only its linked review issues', async () => {
    const repository = createRepository();
    const deletedIssues = [];
    const templates = createDocumentTemplateService(repository, {
      deleteIssue: async (id) => deletedIssues.push(id)
    });
    const template = await templates.create({ name: 'Retiring agreement' });
    const version = await templates.saveDraft(template.id, { content });
    repository.reviewComments.push(
      { id: 'review-1', versionId: version.id, issueId: 'issue-linked' },
      { id: 'review-2', versionId: version.id, issueId: 'issue-linked' }
    );

    await templates.delete(template.id);

    expect(deletedIssues).toEqual(['issue-linked']);
    expect(repository.deletedTemplates).toEqual([template.id]);
  });

  test('rolls back to a published revision by creating a new published version', async () => {
    const repository = createRepository();
    const templates = createDocumentTemplateService(repository);
    const template = await templates.create({ name: 'Versioned agreement' });
    const first = await repository.createTemplateVersion({ templateId: template.id, versionNumber: 1, content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Original' }] }] }, sampleData: {}, formVersionId: null, isPublished: true, status: 'published', createdAt: '2026-01-01' });
    const second = await repository.createTemplateVersion({ templateId: template.id, versionNumber: 2, content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Mistake' }] }] }, sampleData: {}, formVersionId: null, isPublished: true, status: 'published', createdAt: '2026-01-02' });

    const restored = await templates.rollback(template.id, first.id);

    expect(restored.versionNumber).toBe(3);
    expect(restored.isPublished).toBe(true);
    expect(restored.content).toEqual(first.content);
    expect(repository.versions.find((item) => item.id === first.id).isPublished).toBe(true);
    expect(repository.versions.find((item) => item.id === second.id).isPublished).toBe(true);
  });

  test('saves and publishes an owned form and document as a package', async () => {
    const repository = createRepository();
    const ownedForm = { id: 'owned-form-1', name: 'Service agreement fields' };
    const ownedVersion = { id: 'owned-version-1', formId: ownedForm.id, versionNumber: 1, isPublished: false, schema: formVersion.schema };
    const templates = createDocumentTemplateService(repository, {
      createOwnedForm: async () => ownedForm,
      saveOwnedFormDraft: async () => ownedVersion,
      getOwnedFormVersions: async () => [ownedVersion],
      getFormVersion: async (id) => id === ownedVersion.id ? ownedVersion : null,
      publishOwnedForm: async () => { ownedVersion.isPublished = true; return ownedVersion; }
    });

    const template = await templates.create({ name: 'Owned agreement' });
    const fixture = { customer_name: 'Fixture customer' };
    const draft = await templates.saveDraft(template.id, { content, formSchema: { fields: formVersion.schema.fields }, sampleData: fixture });
    const published = await templates.publish(template.id);

    expect(template.formId).toBe(ownedForm.id);
    expect(draft.formVersionId).toBe(ownedVersion.id);
    expect(draft.sampleData).toEqual({ customer_name: 'Fixture customer' });
    expect(draft.sampleData).not.toBe(fixture);
    expect(ownedVersion.isPublished).toBe(true);
    expect(published.isPublished).toBe(true);
  });
});
