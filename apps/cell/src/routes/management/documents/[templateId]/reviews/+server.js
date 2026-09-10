import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';

function response(error) {
  const status = error?.code === 'INVALID_INPUT' ? 400 : error?.code === 'NOT_FOUND' ? 404 : 500;
  return json({ error: error?.message || 'Unable to manage document review comments.' }, { status });
}

export async function GET({ params, url, locals }) {
  try {
    const services = await createCrmServices({ ensureManagement: true });
    const versions = await services.documents.templates.versions(params.templateId);
    const versionId = url.searchParams.get('versionId') || versions[0]?.id;
    if (!versionId || !versions.some((version) => version.id === versionId)) return json([]);
    return json(await services.documents.review.list(versionId, locals.user));
  } catch (error) { return response(error); }
}

export async function POST({ params, request, locals }) {
  try {
    const input = await request.json();
    const services = await createCrmServices({ ensureManagement: true });
    const versions = await services.documents.templates.versions(params.templateId);
    if (!versions.some((version) => version.id === input.versionId)) return json({ error: 'Template version was not found.' }, { status: 404 });
    const template = await services.documents.templates.get(params.templateId);
    const body = String(input.body ?? '').trim();
    const excerpt = String(input.anchor?.text ?? '').trim();
    const reviewUrl = `${new URL(request.url).origin}/management/documents/${template.id}?tab=review`;
    const issue = await services.issues.create({
      title: `Review: ${template.name} - ${excerpt.slice(0, 120)}`,
      descriptionMarkdown: `Document review comment\n\nSelected text:\n> ${excerpt.replaceAll('\n', '\n> ')}\n\nComment:\n${body}\n\n[Open document review](${reviewUrl})`,
      type: 'internal',
      priority: 'medium',
      status: 'open',
      tags: ['document-review']
    });
    try {
      const authorName = String(locals.user?.name || locals.user?.email || '').trim() || null;
      return json(await services.documents.review.create(input.versionId, { ...input, issueId: issue.id, authorId: locals.user?.id || null, authorName }), { status: 201 });
    } catch (error) {
      await services.issues.delete(issue.id).catch(() => {});
      throw error;
    }
  } catch (error) { return response(error); }
}