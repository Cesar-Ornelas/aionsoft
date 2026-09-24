# Documents Feature Context

## Purpose

Documents owns reusable document templates, paired document-owned form packages, and generated HTML document snapshots. New package authoring keeps the form schema and rich-text content together while still using the Management Form Builder service.

## Vocabulary

- A document template is reusable metadata plus versioned rich-text content.
- A template owns a form for new packages. A draft package save creates paired document and form revisions; one publish action publishes the pair.
- A template version is immutable once published. Legacy template versions may retain historical external form references.
- A field reference points to a stable field ID/key from the pinned form version.
- A global variable reference points to a stable Management variable key and uses the separate `#Label` authoring syntax; form fields continue to use `@Label`.
- Field and variable tokens are selectable atomic nodes with persisted font-size presets, including 8pt, controlled text/background palette colors, paragraph alignment, and paragraph line-height presets from 0.75 through 2. The document workspace inspector applies those properties to body, header, and footer tokens; reset and remove actions update the rich-text JSON used by preview, review, generation, and print output.
- Sample data is an optional JSON fixture saved on a draft template revision for testing document rendering without a submission collection.
- Authors can insert an explicit `page_break` marker from the editor toolbar or by typing `@Page`; it is not a form field or generated value.
- Authors can insert and edit tables from the document editor. When the cursor is inside a table, the editor shows its row and column count and provides controls to add or remove rows and columns or delete the table.
- Carta slash commands can insert a List-backed table whose second row is a template row. The row stores a stable List binding and each cell stores a stable child-field binding; preview and generation repeat it once per submitted List item.
- Carta's slash menu groups Lists, List items, calculated List values, ordinary fields, and global variables. Selecting a List such as Services inserts a complete declarative `|>Table` block with one column per current child field; List items insert dotted child tokens and calculated List values insert ordinary scalar tokens. Document colors and formatting use the fixed semantic palette shared by table cells and field/variable tokens: light grays, `primary`, `secondary`, `accent`, `neutral`, `ink`, and `white`. Palette background and text classes also support `odd:` and `even:` variants for alternating table rows, and color slash aliases insert the final class names.
- Legacy class attributes may remain in historical document content for compatibility, but document utility classes are no longer compiled or injected. New authoring should use the built-in palette and persisted inline styles.
- Existing PocketBase CSS artifact records and version relations are retained as unused compatibility data. They are not created, read, updated, or required by document save, publish, preview, print, or generation flows.
- Carta plugin conventions: implement each non-native Markdown feature as a focused model pair under `src/lib/documents/model/`, with a parser/serializer module for the stable source grammar and a Carta extension module for live preview. Register the extension in `CartaDocumentEditor.svelte`, and register insertion commands in `document-slash-snippets.js` when the feature should be available from `/`.
- The Markdown pipeline must split a complete custom block before parsing surrounding Markdown, require an explicit opener and closer, preserve content boundaries, reject unknown options, and parse the block's inner Markdown with the same allowlisted parser used by ordinary document content. Do not rely on arbitrary HTML as the persisted representation.
- Every plugin must compile to provider-neutral canonical document nodes. Add the node types to `content.js` allowlists, normalize and bound every attribute there, render both generated and authored/review HTML, and keep token values escaped. Carta preview HTML is only an authoring aid; server normalization and rendering remain authoritative.
- Preserve source round-trips through `documentContentToMarkdown(markdownToDocumentContent(source))`, including option ordering where the syntax promises stable output. Add focused parser rejection, round-trip, normalization, and HTML rendering tests to `document-markdown.test.js` or the owning Documents test file.
- Authors can select the active table column from the editor toolbar and persist its width mode, optional custom percentage, palette background/text colors, and horizontal/vertical alignment. Formatting applies to cells intersecting the selected column, preserves merged cells, and renders consistently in Preview, Review, generated HTML, and browser print output.
- Document configurations are saved per template version. The Document workspace provides secondary Content, Header, and Footer tabs for authoring the body and optional rich-text page regions; headers and footers remain unused when their content is empty. Inch-based page margins stay in a focused configuration dialog. Headers and footers support field and variable tokens, compact layout tables with aligned cells, and preset font sizes that can vary within a line. Layout-table boundaries are visible while authoring but render with zero borders, padding, and spacing. The settings are preserved by rollback and package export/import.
- The template Preview tab presents generated content on a centered, non-persisted US Letter paper canvas with local zoom controls from 50% to 150%; zoom affects authoring presentation only and does not change saved content, generated HTML, or future print/PDF behavior.
- The document body authoring surface is migrating to Carta Markdown source and preview. Carta uses namespaced directives for form fields, global variables, page breaks, and resource images, then converts back to the provider-neutral document content model before draft saves. Header/footer authoring and advanced layout inspection remain on the legacy editor until their formatting metadata has a lossless Markdown representation.
- Review shows authored template content without data substitution and supports flat comments anchored to selected text on a saved template version.
- Every saved Review comment creates an internal Operations Issue; linked comments retain a direct Issue link and a Review deep link.
- The Review comment body seeds the Issue description. The compact Review editor keeps the original comment context and supports the flat Issue conversation without changing the Review anchor; larger Issue updates use the full Issue page.
- Deleting a review comment also deletes its automatically-created Operations Issue.
- A document is a generated instance that snapshots template version, form version, validated data, and rendered HTML.
- Global variables resolve from their current Management values when a document is generated. The rendered HTML is then immutable like other generated-document snapshot data; editing a global value does not rewrite existing documents.
- A document package is a versioned JSON bundle containing one template, its owned form and all revisions, generated snapshots, and Review comments. Linked Issues, replies, and thumbs-up votes are optional collaboration sections.
- Template deletion permanently removes generated instances, template versions, Review comments and votes, and automatically-created linked Issues with their replies and votes; the owned form package is archived.

## Ownership

- `src/lib/documents/` owns provider-neutral document models, ports, services, rendering, and adapters.
- `src/routes/management/documents/` owns reusable template authoring and preview.
- `src/routes/operations/documents/` owns generated-document workflows.
- `src/routes/operations/accounts/[accountId]/documents/` may provide optional account context.

## Boundaries

- Form Builder owns form definitions, schemas, validation, calculations, and published form versions. Documents composes those services for owned package workflows.
- Operations owns account context and operational entry points, not reusable templates.
- PDF, files, signing, approvals, sharing, and advanced authorization are deferred capabilities.
- Review comments capture the authenticated creator's stable user ID and display name when available; older comments without those fields use a neutral reviewer fallback in the UI.
- Provider SDKs remain in server-only adapters and composition roots.
- Document package imports always create a new copy with remapped IDs. Missing target accounts or users do not block import; account relations are omitted and author/voter display-name snapshots remain.

## Invariants

- Published package revisions and their referenced form versions are immutable.
- New package draft revisions may use an owned draft form version; publication requires a matching pair.
- Generated documents pin both source versions and never resolve current versions later.
- Field references must resolve against the pinned form schema.
- Repeating table bindings must resolve to a List and its child fields in the pinned form schema. Ordinary tables remain static, empty Lists emit no repeated body rows, and generated snapshots retain server-recomputed Aggregate values.
- Declarative List tables round-trip as their concise source syntax while compiling to the existing normalized repeating-table model. Their headers use List child labels, summaries render as ordered footer rows, and existing GFM and namespaced table directives remain supported.
- Global variable references must resolve against an active Management document variable when a template draft is saved or rendered.
- Rendering is deterministic, escapes values, and rejects unsafe or unsupported content.
- Explicit page-break markers are preserved in document content and rendered with print-oriented `break-before: page` hints for future PDF/export adapters; normal HTML preview remains valid.
- Page configuration rendering emits deterministic print-oriented CSS and header/footer regions for HTML preview and browser Print/Save as PDF output. A server-side PDF renderer and page-number substitution remain deferred.
- Account context is optional for generated documents.
- Sample data is draft-only authoring data and is never used as generated-document submission data.
- Review comments are scoped to a saved template version, flat rather than threaded, and use text-range anchors with excerpt fallback when content changes.
- Clicking a review comment scrolls the authored saved-version content to its anchor and applies a temporary highlight; stale anchors show an explicit status instead of silently failing.
- Saving a Review comment automatically creates an internal, open, medium-priority Issue; ordinary non-Review comments do not create Issues.
- Automatically-created Review Issues use the `document-review` tag for filtering and discovery in Operations Issues.
- Comment deletion is explicit and removes the linked Issue before removing the comment.
- Template deletion is explicit, confirms the exact template name with a copy affordance, and never removes unrelated Issues.
- Package export/import is explicit and limited to one template bundle. JSON content, form schemas, anchors, generated HTML, and version metadata are preserved; overwrite/merge and provider-specific dumps are not supported.
- Global variable definitions and binary resources are not yet included in document package portability; this is a deferred capability.
- Published templates can be rolled back from Version history by restoring an older published revision. Rollback creates and publishes a new revision, including a matching owned form revision, and never mutates historical versions.
- Review comments and their linked Issue conversation replies support one toggleable thumbs-up vote per user, except authors cannot vote on their own comments; vote counts and voter name snapshots are shown in the Review and Sheet surfaces.

## Validation

Run `bun run cell:test:documents`, then `bun run cell:build`.
