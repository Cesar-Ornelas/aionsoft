import { json } from '@sveltejs/kit';
import { createCrmServices } from '$lib/crm/server/composition.js';
import { issuesErrorResponse } from '$lib/issues/server/http.js';

export async function POST({ params, locals }) {
  try {
    const services = await createCrmServices();
    const comment = await services.issues.getComment(params.commentId);
    if (comment.issueId !== params.issueId) return json({ error: 'Comment does not belong to this issue.' }, { status: 400 });
    return json(await services.issues.toggleCommentVote(comment.id, locals.user));
  } catch (error) {
    return issuesErrorResponse(error);
  }
}