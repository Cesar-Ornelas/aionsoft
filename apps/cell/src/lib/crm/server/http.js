import { json } from '@sveltejs/kit';
import { CrmDataAccessError } from '../model/data-access-error.js';

/** @param {unknown} error */
export function crmErrorResponse(error) {
  if (!(error instanceof CrmDataAccessError)) {
    console.error(error);
    return json({ error: 'The CRM request could not be completed.' }, { status: 500 });
  }

  const status = {
    invalid_input: 400,
    not_found: 404,
    conflict: 409,
    unavailable: 503,
    unsupported_capability: 501,
    unknown: 500
  }[error.code] ?? 500;

  return json({ error: error.message, code: error.code, details: error.details }, { status });
}
