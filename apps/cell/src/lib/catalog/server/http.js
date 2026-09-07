import { json } from '@sveltejs/kit';
import { CatalogDataAccessError } from '../model/data-access-error.js';

export function catalogErrorResponse(error) {
  if (!(error instanceof CatalogDataAccessError)) {
    console.error(error);
    return json({ error: 'The catalog request could not be completed.' }, { status: 500 });
  }

  const status = {
    invalid_input: 400,
    not_found: 404,
    conflict: 409,
    unavailable: 503,
    unknown: 500
  }[error.code] ?? 500;

  return json({ error: error.message, code: error.code, details: error.details }, { status });
}
