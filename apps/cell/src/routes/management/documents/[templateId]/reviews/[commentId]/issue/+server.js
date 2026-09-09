import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';

export async function POST({ params, url }) {
  try {
    const services = await createCrmServices({ ensureManagement: true });
    const template = await services.documents.templates.get(params.templateId);
    const comment = await services.documents.review.get(params.commentId);
    if (comment.issueId) return json({ issueId: comment.issueId, url: `/operations/issues/${comment.issueId}` });
    const reviewUrl = `${url.origin}/management/documents/${template.id}?tab=review&comment=${encodeURIComponent(comment.id)}`;
    const issue = await services.issues.create({
      title: `Review: ${template.name} - ${comment.excerpt.slice(0, 120)}`,
      descriptionMarkdown: `Document review comment\n\nSelected text:\n> ${comment.excerpt.replaceAll('\n', '\n> ')}\n\nComment:\n${comment.body}\n\n[Open document review](${reviewUrl})`,
      type: 'internal',
      priority: 'medium'
    });
    await services.documents.review.linkIssue(comment.id, issue.id);
    return json({ issueId: issue.id, url: `/operations/issues/${issue.id}` });
  } catch (error) {
    const status = error?.code === 'NOT_FOUND' ? 404 : error?.code === 'INVALID_INPUT' ? 400 : 500;
    return json({ error: error?.message || 'Unable to create the linked issue.' }, { status });
  }
}