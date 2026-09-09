import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';
import { issuesErrorResponse } from '$lib/issues/server/http.js';

export async function PATCH({ params, request, locals }) {
  try {
    const services = await createCrmServices();
    const existing = await services.issues.getComment(params.commentId);
    if (existing.issueId !== params.issueId) return json({ error: 'Comment does not belong to this issue.' }, { status: 400 });
    const comment = await services.issues.updateComment(params.commentId, await request.json(), locals.user);
    return json(comment);
  } catch (error) {
    return issuesErrorResponse(error);
  }
}

export async function DELETE({ params, locals }) {
  try {
    const services = await createCrmServices();
    const comment = await services.issues.getComment(params.commentId);
    if (comment.issueId !== params.issueId) return json({ error: 'Comment does not belong to this issue.' }, { status: 400 });
    await services.issues.deleteComment(params.commentId, locals.user);
    return json({ deleted: true, commentId: params.commentId });
  } catch (error) {
    return issuesErrorResponse(error);
  }
}
