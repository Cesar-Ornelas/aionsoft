import { describe, expect, test } from 'bun:test';
import { createFormService } from '$lib/management/server/services/form-service.js';

function createRepository() {
  const forms = [];
  const versions = [];
  let nextId = 1;
  const find = (items, id) => items.find((item) => item.id === id) ?? null;
  return {
    forms,
    versions,
    listForms: async () => forms,
    findFormById: async (id) => find(forms, id),
    createForm: async (input) => { const value = { id: `form-${nextId++}`, ...input }; forms.push(value); return value; },
    updateForm: async (id, input) => { const value = find(forms, id); Object.assign(value, input); return value; },
    listVersions: async (formId) => versions.filter((version) => version.formId === formId),
    findVersionById: async (id) => find(versions, id),
    createVersion: async (input) => { const value = { id: `version-${nextId++}`, ...input }; versions.push(value); return value; },
    updateVersion: async (id, input) => { const value = find(versions, id); Object.assign(value, input); return value; }
  };
}

const schema = { fields: [{ id: 'name', fieldKey: 'name', type: 'text', label: 'Name' }] };

describe('form service', () => {
  test('creates drafts, submits them, and publishes an immutable version', async () => {
    const repository = createRepository();
    const service = createFormService(repository);
    const form = await service.createForm({ name: 'Intake' });
    const draft = await service.saveDraft(form.id, schema);
    expect(draft).toMatchObject({ versionNumber: 1, isPublished: false });
    await service.submitForReview(form.id);
    const published = await service.publish(form.id, draft.id);
    expect(published).toMatchObject({ isPublished: true, status: 'published' });
    expect((await service.getPublishedVersion(form.id)).id).toBe(draft.id);
    await expect(service.saveDraft(form.id, schema)).rejects.toThrow('Published forms require a new revision.');
  });

  test('clones a published version into a new draft revision', async () => {
    const repository = createRepository();
    const service = createFormService(repository);
    const form = await service.createForm({ name: 'Intake' });
    const first = await service.saveDraft(form.id, schema);
    await service.publish(form.id, first.id);
    const revision = await service.cloneRevision(form.id, first.id);
    expect(revision).toMatchObject({ versionNumber: 2, isPublished: false, schema });
  });
});
