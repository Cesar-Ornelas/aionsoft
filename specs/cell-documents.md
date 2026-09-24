# Cell Documents

## Purpose

Documents is a reusable template and generated-document feature in Cell. Each new template owns a paired Management form package: the form captures structured values and the document turns those values into reusable HTML.

## Ownership

- Management/Form Builder owns form definitions, schemas, validation, calculations, and immutable published form versions. Document-owned forms use the same service and schema rules but are edited from the document workspace.
- Documents owns reusable document templates, template versions, field references, rendering, generated document snapshots, and document lifecycle.
- Management owns reusable global document variables. Document templates reference them by stable key in a separate `document_variable` namespace so `#company_name` cannot collide with a form field using the same key.
- Operations may initiate document generation and optionally associate an instance with an Operations Account, but does not own reusable templates.

## Core model

A `DocumentTemplate` has metadata, an owned form relation for new packages, and immutable `DocumentTemplateVersion` records. Draft saves create a document revision and a matching owned `FormVersion`; one publish action publishes the matching pair. Legacy templates may retain their historical published form reference until they are edited. A generated `Document` pins the exact template version and form version used, stores validated input data, and stores rendered HTML.

Existing documents never resolve the current form or template dynamically. Editing either source creates a new version and does not change existing document snapshots.

## First scope

- Rich-text authoring using the existing TipTap infrastructure.
- Carta Markdown body authoring preserves table column widths through namespaced table directives such as `<!-- aionsoft:table {"widths":[25,75]} -->`; generated HTML renders those widths with a `<colgroup>`.
- Form schemas support top-level Lists with scalar child columns. Canonical List data is an ordered array of row objects keyed by child field ID. Structured Aggregate fields select a List, numeric child, and Sum or Average operation; empty aggregates resolve to zero and generated snapshots use server-recomputed values.
- Carta slash commands can insert a List-backed Markdown table. Its namespaced table directive persists the List and template-row binding, dotted child tokens map cells to List columns, and generated HTML repeats that row once per List item.
- Carta's slash menu exposes Lists, List items, and calculated List values separately. Selecting a List inserts a ready-to-edit table containing every current List child as a column; selecting a List item inserts its dotted child token, and selecting a calculated List value inserts its scalar token. Document formatting uses a fixed semantic palette shared by table cells and field/variable tokens, including light grays, `primary`, `secondary`, `accent`, `neutral`, `ink`, and `white`; palette background and text classes support `odd:` and `even:` variants for alternating table rows, and color aliases in the slash menu insert the final class names. Carta also supports a concise declarative List-table block that remains visible in saved Markdown:
	```text
	|>Table
	class="border-collapse border border-gray-400"
	src={{@services|Services}}
	col={{@service_name}} class="w-[30%]"
	col={{@service_amount}} class="w-[50%] font-bold text-right"
	summary={{@services_total|Total}} class="font-bold text-xs"
	<|
	```
	Classes are validated document metadata and apply to the table, repeated body cells, and summary cells. The former `w`, `f`, `s`, and `a` modifiers are replaced rather than accepted as a second grammar.
- Carta Sections blocks compile into normalized row-oriented flex content. Legacy class attributes may remain in historical content but are not compiled or injected; new document styling uses persisted inline styles and the fixed semantic palette.
- Existing CSS artifact collections and version relations are retained for non-destructive compatibility only. Document save, publish, preview, print, and generation do not create, load, update, or require CSS artifacts.
- Carta plugin implementation contract: non-native Markdown blocks use a focused parser/serializer plus a Carta remark transformer. The parser owns explicit block boundaries and option validation; the transformer provides authoring-only preview; `document-slash-snippets.js` owns `/` insertion; `content.js` owns canonical node allowlisting, normalization, escaping, and both generated/authored HTML renderers. New plugins must be registered in `CartaDocumentEditor.svelte` and must not make arbitrary HTML the persisted model.
- A new plugin must be tested at four boundaries: malformed source rejection, source-to-model-to-source round-trip, normalized attribute safety, and generated/authored HTML output. The server-side normalized model is authoritative even when Carta preview behavior differs.
- Table cells support persisted selected-column formatting: default/fill/custom percentage widths, controlled palette background/text colors, and horizontal/vertical alignment. Formatting is stored on affected cells, preserves colspan/rowspan merges, and is rendered consistently in authored review, preview, generated HTML, and browser print output.
- Supported content is an allowlisted subset of rich text plus stable form-field references.
- HTML preview and persisted HTML generation.
- Inline Sample data authoring stores an optional JSON fixture on the draft template revision; the Document preview tab renders the current rich-text document as HTML and substitutes available fixture values.
- Global document variables are text-only configuration records managed at `/management/configuration`. The editor offers them through `#` suggestions and renders them separately from `@` form-field suggestions. Current values are resolved for previews and generation, while generated HTML remains an immutable snapshot.
- Field and variable token attrs persist with the rich-text node: font size is limited to the existing preset list, including 8pt, colors use the controlled document palette, and paragraph alignment and line height remain block-level attributes. Line-height presets range from 0.75 through 2 for tighter small-font layouts. Generated and authored renderers apply the validated token styles to body, header, and footer output; unsupported values normalize to defaults.
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
- List table bindings and child tokens must resolve against the pinned form version; unknown row properties and client-supplied Aggregate values are never trusted.
- Declarative List-table blocks compile to the existing normalized repeating-table model, preserve their concise source through save/reload, reject malformed directives and unsupported options, and do not change legacy GFM or namespaced table behavior.
- Declarative Sections blocks compile to normalized flex rows, preserve their concise source through save/reload, and reject malformed definitions or unsupported options.
- Carta extensions preserve a provider-neutral document model: source grammar, preview transformer, slash insertion, canonical node normalization, and HTML rendering are separate responsibilities. Custom attributes use existing controlled token/style vocabularies or introduce equivalent explicit validation; values are never trusted because they came from preview HTML.
- Token property edits are applied through selectable editor nodes and must survive save/reload, Preview, Review, generation, browser print, and package export/import.
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
- Legacy document class attributes are never treated as a CSS compilation contract. Supported document styling is limited to normalized inline style and palette values.
- Operations Account association is optional; an invalid supplied account must be rejected.

## Routes

Management owns reusable template authoring under `/management/documents`, including destructive deletion, JSON package export/import, and Version history rollback. Export is available from a template detail route; import is available from the template list. Operations owns generated-document workflows under `/operations/documents` and optional account-context views under `/operations/accounts/[accountId]/documents`.

## Validation

Run `bun run cell:test:documents` followed by `bun run cell:build` for Documents changes. Browser validation must confirm form-backed template creation, field insertion, publishing, internal generation, optional account generation, and immutable snapshots.
