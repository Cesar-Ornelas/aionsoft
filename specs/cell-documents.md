# Cell Documents

## Purpose

Documents is a reusable template and generated-document feature in Cell. Each new template owns a paired Management form package: the form captures structured values and the document turns those values into reusable HTML.

## Ownership

- Management/Form Builder owns form definitions, schemas, validation, calculations, and immutable published form versions. Document-owned forms use the same service and schema rules but are edited from the document workspace.
- Documents owns reusable document templates, template versions, field references, rendering, generated document snapshots, and document lifecycle.
- Operations may initiate document generation and optionally associate an instance with an Operations Account, but does not own reusable templates.

## Core model

A `DocumentTemplate` has metadata, an owned form relation for new packages, and immutable `DocumentTemplateVersion` records. Draft saves create a document revision and a matching owned `FormVersion`; one publish action publishes the matching pair. Legacy templates may retain their historical published form reference until they are edited. A generated `Document` pins the exact template version and form version used, stores validated input data, and stores rendered HTML.

Existing documents never resolve the current form or template dynamically. Editing either source creates a new version and does not change existing document snapshots.

## First scope

- Rich-text authoring using the existing TipTap infrastructure.
- Supported content is an allowlisted subset of rich text plus stable form-field references.
- HTML preview and persisted HTML generation.
- Inline Sample data authoring stores an optional JSON fixture on the draft template revision; the Document preview tab renders the current rich-text document as HTML and substitutes available fixture values.
- Authors can insert an explicit `page_break` marker from the editor toolbar or by typing `@Page`. The marker is authoring metadata, not a form field or submission value.
- Authors can open Document configurations from the editor toolbar and set version-scoped inch-based margins plus optional rich-text headers and footers. Header and footer editors support aligned cells in borderless layout tables and preset font sizes that can vary across selected text; table boundaries are authoring-only and rendered output uses zero borders, padding, and spacing. Applying settings affects the next draft revision; published versions remain immutable.
- Review shows the authored template without replacing field references and provides flat comments anchored to selected text on the latest saved template version.
- Review comment links use `?tab=review&comment=<commentId>` and fall back to the stored excerpt when the text-range anchor no longer matches.
- Reusable templates usable across many accounts or internal workflows.
- Optional Operations Account context for generated instances.
- Server-authoritative form validation and deterministic rendering.

## Deferred

PDF generation, binary/object storage, signing, approvals, customer sharing, batch generation, external data connectors, conditional document sections, reusable field groups, and final request-time authorization enforcement are separate capabilities.

## Invariants

- Draft package revisions may link to the package's owned draft form version; published template versions must link to the matching published form version.
- Standalone Forms and legacy form-backed templates remain supported independently.
- Field references must resolve against the pinned form version.
- Published template versions are immutable.
- Rollback restores an older published revision by creating a new published template/form revision; historical versions remain immutable and available in Version history.
- Generated documents pin template and form versions and preserve validated data and rendered HTML.
- User-provided values are escaped before HTML rendering.
- Sample data is authoring-only test data and is not used as generated-document submission data.
- Explicit page breaks are preserved in normalized content and rendered with `break-before: page` and `page-break-before: always` hints for future PDF/export renderers.
- Page configuration is normalized with defaults for legacy versions, preserved through rollback and package export/import, and rendered as deterministic HTML/CSS. PDF generation, repeated-page header/footer behavior, and page-number substitution remain deferred.
- Saving a review comment automatically creates an internal, open, medium-priority Issue; the Issue contains the excerpt, original comment, document identifiers, and a Review backlink.
- Automatically-created Review Issues are tagged `document-review` so they can be found from the Operations Issues tag filter.
- Review provides `Open in Issues` and a compact `Edit` Sheet for Issue title, description, and flat comments. Operational metadata remains in the full Issues view.
- Deleting a review comment is explicit; its automatically-created linked Issue is deleted with the comment.
- Review comments store the authenticated creator's user ID and display name when available; legacy comments without author data remain supported with a neutral reviewer fallback.
- Review comments and linked Issue replies support toggleable thumbs-up votes. A comment author cannot vote on their own comment, and the UI shows the vote count plus voter names on hover.
- Deleting a template permanently removes its generated documents, template versions, Review comments and votes, and automatically-created linked Issues with their replies and votes. Owned form packages are archived rather than hard-deleted.
- Templates can be exported as versioned JSON packages containing the owned form, all form/template versions, generated snapshots, and Review comments. Linked Issues, replies, and Review/Issue comment votes are optional sections. Imports always create a new copy with fresh IDs, remap internal relations, preserve JSON/HTML/version data, and omit unavailable account/user relations while retaining display-name snapshots.
- Arbitrary HTML, scripts, network fetches, and executable template expressions are rejected.
- Operations Account association is optional; an invalid supplied account must be rejected.

## Routes

Management owns reusable template authoring under `/management/documents`, including destructive deletion, JSON package export/import, and Version history rollback. Export is available from a template detail route; import is available from the template list. Operations owns generated-document workflows under `/operations/documents` and optional account-context views under `/operations/accounts/[accountId]/documents`.

## Validation

Run `bun run cell:test:documents` followed by `bun run cell:build` for Documents changes. Browser validation must confirm form-backed template creation, field insertion, publishing, internal generation, optional account generation, and immutable snapshots.
