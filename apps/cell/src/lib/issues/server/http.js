import { json } from '@sveltejs/kit';

export function issuesErrorResponse(error) {
  const status = error?.code === 'NOT_FOUND' ? 404 : error?.code === 'CONFLICT' ? 409 : error?.code === 'INVALID_INPUT' ? 400 : 500;
  return json({ error: error?.message || 'Unable to process issue.' }, { status });
}