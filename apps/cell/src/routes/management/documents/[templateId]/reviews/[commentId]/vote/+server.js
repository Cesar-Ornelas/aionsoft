import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';

function response(error) {
  const code = String(error?.code || '').toUpperCase();
  const status = code === 'INVALID_INPUT' ? 400 : code === 'UNAUTHORIZED' ? 401 : code === 'FORBIDDEN' ? 403 : code === 'NOT_FOUND' ? 404 : 500;
  return json({ error: error?.message || 'Unable to vote on the document review comment.' }, { status });
}

export async function POST({ params, locals }) {
  try {
    const services = await createCrmServices({ ensureManagement: true });
    const comment = await services.documents.review.get(params.commentId);
    const versions = await services.documents.templates.versions(params.templateId);
    if (!versions.some((version) => version.id === comment.templateVersionId)) return json({ error: 'Review comment does not belong to this document.' }, { status: 400 });
    return json(await services.documents.review.toggleCommentVote(comment.id, locals.user));
  } catch (error) {
    return response(error);
  }
}
