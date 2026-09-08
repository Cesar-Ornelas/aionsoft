# Form Builder Feature Context

## Purpose

Form Builder is the Management-owned foundation for defining versioned, workspace-scoped forms. It owns normalized schemas, field visibility rules, server-authoritative validation, restricted calculations, and immutable form versions. Documents may compose these schemas for document-owned forms, inline sample-data rendering, and document previews; standalone submissions, PDFs, signing, reusable assets, tenant enforcement, and RBAC remain later capabilities unless explicitly added to this feature.

## Domain Vocabulary

- A form is metadata plus a lifecycle status: `draft`, `pending_review`, `published`, or `deleted`.
- A form version is an immutable schema snapshot identified by its form and monotonically increasing version number.
- A field has a stable `id`; `fieldKey` is an optional formula/reference key and is not the submission identity.
- Calculated fields use a restricted arithmetic grammar with references such as `[amount]`; dynamic code execution is forbidden.
- Conditional fields are visible only when their referenced field contains one of the configured values.

## Current Ownership

- `src/lib/management/model/form-*.js` owns provider-neutral schema, validation, calculation, formatting, and form error behavior.
- `src/lib/management/server/ports/form-repository.js` owns the persistence contract.
- `src/lib/management/server/services/form-service.js` owns form lifecycle and publication rules.
- `src/lib/management/server/adapters/pocketbase/repositories.js` maps form records to the provider-neutral contract.
- `src/lib/management/definitions.js` and `src/lib/server/management-bootstrap.js` own the PocketBase collection shape and additive setup.
- `src/lib/management/server/tests/form-*.test.js` owns focused foundation and lifecycle tests.
- `src/routes/management/forms/` owns the forms index, draft metadata flow, schema editor, version history, and draft-save transport.

## Boundaries

- Form Builder does not own Management users, groups, roles, or permissions; it may depend on their future authorization contracts.
- Provider SDK record shapes and errors must remain inside the PocketBase adapter.
- This first slice is workspace-scoped and does not enforce tenant membership or RBAC.
- Form Builder does not yet own standalone submission storage, PDF templates/export, storage, signing, reusable field groups, or option lists.
- The current editor supports a focused first slice of field types and properties, one-level section schemas, required indicators, and drag-and-drop field reordering; advanced field rules and full nested section editing remain future editor work.

## Invariants

- Published versions are immutable; edits create a new draft revision.
- Schemas are normalized and validated before persistence and publication.
- Server-side validation is authoritative and ignores non-rendered layout/calculated fields.
- Hidden conditional values are excluded from active submission data.
- Formula references must resolve to field keys and formula dependency cycles are rejected.
- Formula evaluation never uses `eval`, `Function`, or another dynamic-code mechanism.

## Validation

- Run `bun run cell:test:forms` for the focused schema and lifecycle suite.
- Run `bun run cell:test:management` when Management contracts or bootstrap behavior changes.
- Run `bun run cell:build` before completing feature work.

## Working Guidance

Read this document, the `form-builder` entry in `apps/cell/ai-workspace.yaml`, and only the declared shared or dependency context before changing Form Builder. Update this document in the same change when the feature's stable contracts, boundaries, invariants, routes, data, or validation change.