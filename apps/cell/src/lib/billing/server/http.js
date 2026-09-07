import { json } from '@sveltejs/kit';

export function billingErrorResponse(error) {
  const status = {
    invalid_input: 400,
    not_found: 404,
    conflict: 409,
    unavailable: 503,
    unknown: 500
  }[error?.code] ?? 500;
  return json({ error: error?.message || 'Unable to process billing agreement.' }, { status });
}
