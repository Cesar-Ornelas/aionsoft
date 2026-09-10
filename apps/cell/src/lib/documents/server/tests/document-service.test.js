import { describe, expect, test } from 'bun:test';
import { createDocumentTemplateService } from '../services/document-template-service.js';
import { createDocumentService } from '../services/document-service.js';
import { renderAuthoredDocumentHtml, renderDocumentHtml, extractFieldReferences } from '../../model/content.js';

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
  test('extracts references and escapes generated values', () => {
    expect(extractFieldReferences(content)).toEqual([{ fieldId: 'name', fieldKey: 'customer_name', label: 'Customer name' }]);
    expect(renderDocumentHtml(content, { name: '<Acme>' }, formVersion.schema)).toContain('&lt;Acme&gt;');
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
    const draft = await templates.saveDraft(template.id, { content, formVersionId: formVersion.id });
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
