import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';

export async function DELETE({ params }) {
  try {
    const services = await createCrmServices({ ensureManagement: true });
    const comment = await services.documents.review.get(params.commentId);
    if (comment.issueId) await services.issues.delete(comment.issueId);
    await services.documents.review.delete(comment.id);
    return json({ deleted: true, commentId: comment.id });
  } catch (error) {
    const status = error?.code === 'NOT_FOUND' ? 404 : error?.code === 'INVALID_INPUT' ? 400 : 500;
    return json({ error: error?.message || 'Unable to delete the review comment.' }, { status });
  }
}