# Standalone Form and PDF Builder Specification

## 1. Purpose

Build a reusable, standalone form and PDF document platform. The platform must let an administrator:

1. Define versioned forms with custom fields.
2. Design PDF templates that reference those fields.
3. Collect field values now or later through reusable form-rendering flows.
4. Preview a document with sample or submitted values.
5. Generate a final PDF with formatted values substituted into the template.
6. Optionally collect electronic signatures and produce an immutable signed PDF.

External systems may be integrated later through explicit adapter and event interfaces.

## 2. Product Boundary

### 2.1 Included

- Form creation, editing, duplication, review, publishing, and versioning.
- Reusable field-group templates and reusable option lists.
- Drag-and-drop form design and runtime form rendering.
- Conditional sections, validation, calculations, masks, and hidden values.
- Rich-document PDF template design using structured JSON content.
- Stable form-field references embedded in PDF templates.
- Conditional PDF content, dynamic values, images, tables, columns, and signatures.
- Sample-data preview and server-side PDF export.
- Submission storage tied to immutable form versions.
- Optional public, token-based electronic signing.
- Authorization, tenant isolation, audit metadata, and lifecycle events.
- Generic extension points for identity, storage, email, and external data.

### 2.2 Excluded

- A legally prescriptive e-signature certification. The implementation provides evidence and audit controls, but legal requirements must be reviewed for each deployment jurisdiction.

### 2.3 Optional Generic Extensions

The core may expose, but must not require:

- `IdentityProvider` for users, roles, and tenant membership.
- `ObjectStorageProvider` for generated PDFs, images, and uploads.
- `NotificationProvider` for signing links and completion notices.
- `ExternalDataResolver` for application-defined merge fields.
- `EventPublisher` for submission, generation, and signing lifecycle events.

## 3. Users and Permissions

### 3.1 Roles

- **Administrator**: manages all tenant resources and permissions.
- **Designer**: creates and edits forms, reusable assets, and PDF templates.
- **Reviewer**: approves or rejects forms before publication.
- **Filler**: creates and views authorized submissions.
- **Signer**: accesses one signing request through a public token.

Applications may map their own roles to these capabilities.

### 3.2 Resource Permissions

Support `view`, `edit`, `review`, and `fill` grants at the form level. A grant may target a user, role, or the tenant. Every server operation must enforce both tenant ownership and the required capability; client-side visibility is not authorization.

## 4. Core Domain Model

All identifiers should be opaque UUIDs. All timestamps should include a timezone. JSON payloads must be schema-validated at every write boundary.

### 4.1 Form

```ts
type FormStatus = 'draft' | 'pending_review' | 'published' | 'deleted';

interface Form {
  id: string;
  tenantId: string;
  creatorId: string;
  name: string;
  description?: string;
  category?: string;
  groupId?: string;
  status: FormStatus;
  createdAt: string;
  updatedAt: string;
}
```

### 4.2 Form Version

```ts
interface FormVersion {
  id: string;
  formId: string;
  versionNumber: number;
  schema: FormSchema;
  isPublished: boolean;
  createdBy: string;
  createdAt: string;
}
```

A published version is immutable. A submission always references the exact version used to collect its data. Publishing creates a new snapshot rather than mutating an existing published schema.

### 4.3 Form Schema and Submission Data

```ts
interface FormSchema {
  fields: FormField[];
}

type SubmissionValue =
  | string
  | string[]
  | number
  | boolean
  | null
  | Record<string, unknown>
  | Array<Record<string, unknown>>;

type SubmissionData = Record<string, SubmissionValue>;
```

Submission data is keyed by stable field ID, never by editable label. Labels and field keys are presentation and authoring aids.

### 4.4 Submission

```ts
type SubmissionStatus =
  | 'draft'
  | 'submitted'
  | 'pending_signature'
  | 'signed';

interface FormSubmission {
  id: string;
  tenantId: string;
  formId: string;
  formVersionId: string;
  submittedBy?: string;
  data: SubmissionData;
  status: SubmissionStatus;
  submittedAt: string;
}
```

### 4.5 PDF Template

```ts
interface PdfTemplate {
  id: string;
  tenantId: string;
  formVersionId: string;
  name: string;
  description?: string;
  content: PdfBuilderDocument;
  header: PdfRegion;
  footer: PdfRegion;
  settings: PdfSettings;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}
```

The baseline implementation supports one PDF template per form version. The schema should avoid preventing a future one-to-many relationship if multiple document variants become necessary.

## 5. Form Builder Requirements

### 5.1 Builder Experience

The form builder must provide:

- A categorized field palette.
- Drag-and-drop insertion and reordering.
- Full-width and half-width layout hints.
- One level of field nesting inside section containers.
- Clear before/after drop indicators.
- Field selection with a property drawer.
- Field duplication with recursively regenerated IDs.
- Field deletion with confirmation when children or references are affected.
- Live form preview using the same renderer used in production.
- Schema normalization that removes properties invalid for the selected field type.
- Detection of broken formula, condition, and PDF references before publish.
- Accessible keyboard alternatives for add, move, duplicate, and delete actions.

### 5.2 Field Contract

```ts
interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  fieldKey?: string;
  placeholder?: string;
  helpText?: string;
  defaultValue?: string;
  colSpan?: 1 | 0.5;
  validation?: FieldValidation;
  mask?: string;
  options?: Array<{ label: string; value: string }>;
  sortOptions?: boolean;
  listId?: string;
  formula?: string;
  calculationFormat?: 'number' | 'currency' | 'percent';
  hideInForm?: boolean;
  fields?: FormField[];
  condition?: SectionCondition;
  viewRules?: FieldViewRule[];
  templateId?: string;
  templateVersionId?: string;
  derivedExpression?: string;
  providerConfig?: Record<string, unknown>;
}
```

`providerConfig` is reserved for optional application adapters. The core renderer must ignore unknown provider configuration safely.

### 5.3 Core Field Types

The standalone core must support:

| Category | Types | Required behavior |
| --- | --- | --- |
| Text | `text`, `textarea` | Placeholder, help text, default, length and regex validation; optional display mask with raw storage. |
| Numeric | `number`, `money`, `percent` | Numeric input, min/max validation, locale-aware PDF formatting. |
| Date/time | `date`, `datetime` | Native or accessible picker and deterministic PDF formatting. |
| Single choice | `radio`, `select`, `button-select` | Static or reusable-list options; stored value resolves to display label in PDFs. |
| Multiple choice | `checkbox`, `button-multi-select` | Stored string array; inline or checklist PDF display. |
| Computed | `calculation`, `derived-hidden` | Recomputed from other fields; never accepts untrusted client output as authoritative. |
| Attachments | `file` | Pluggable storage, file metadata in submission data, size/type limits. |
| Signature | `signature` | Signature-pad value when a signature is part of the form rather than the document signing flow. |
| Layout | `section`, `template-section`, `divider` | Grouping, reusable groups, conditional visibility, and visual separation. |
| Hidden | `hidden` | Stored or prefilled but not displayed to fillers. |
| Identity | `user-select` | Optional identity-provider-backed user selection with role filters. |

### 5.4 Validation

```ts
interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
}
```

Validation must run on both client and server. Server validation is authoritative and must:

- Ignore non-rendered divider and calculated fields.
- Validate only fields in currently visible conditional sections.
- Reject values not present in a field's static or resolved option set.
- Validate every member of multi-select values.
- Reject malformed structured values.
- Return errors keyed by field ID.
- Prevent unsafe regular expressions through validation, limits, or a safe regex engine.

### 5.5 Conditional Sections

```ts
interface SectionCondition {
  fieldId: string;
  values: string[];
}
```

A section is visible when the controlling scalar value is included in `values`, or when any member of an array value is included. Missing values hide the section. When a visible section becomes hidden, its child values must be removed from the active payload unless an application explicitly configures value preservation.

### 5.6 Calculations

Support formulas such as:

```text
=[quantity] * [unit_price] + 100
```

Requirements:

- Tokens use unique, human-readable `fieldKey` values.
- Operators: `+`, `-`, `*`, `/`, parentheses, and decimal literals.
- Missing or nonnumeric inputs resolve predictably to zero or a documented null result.
- Dependent calculations are evaluated in bounded passes.
- Circular dependencies and invalid tokens are reported before publish.
- Formats: plain number, currency, and percent.
- Do not evaluate formulas with `eval`, `Function`, or arbitrary JavaScript. Use a restricted parser and expression evaluator.

### 5.7 Reusable Lists and Field Groups

- A reusable list has a name, scope, and ordered `{label, value}` items.
- A reusable field group has versioned field definitions.
- A form pins a field-group version at publish time.
- Updating a reusable group must not silently mutate published forms.
- Designers may explicitly upgrade a form to a newer group version and review the diff.
- Deleting an in-use list or group must be blocked or converted to an archived state.

### 5.8 Runtime Form Renderer

The renderer must accept schema, initial data, option-list data, context, read-only state, and a data-change callback. It must:

- Render the same field semantics in builder preview and production.
- Seed defaults only when no submitted value exists.
- Recalculate computed fields after relevant changes.
- enforce conditional visibility and field-level view rules.
- Display field-specific validation messages.
- Support read-only rendering without changing values.
- Preserve stable layout while dynamic fields appear or disappear.
- Meet WCAG 2.2 AA for labels, errors, focus, keyboard input, and contrast.

## 6. Form Lifecycle

1. **Create**: create a form and editable version 1.
2. **Edit**: change the draft schema and metadata.
3. **Review**: optionally transition to `pending_review`.
4. **Publish**: validate all references and atomically create/mark the published immutable version.
5. **Revise**: clone the published schema into a new draft version.
6. **Archive/Delete**: hide the form from new use without invalidating historical submissions.

Publishing a group may atomically publish its forms, reusable lists, and reusable field-group versions. No partial publish may remain after failure.

## 7. PDF Builder Requirements

### 7.1 Authoring Experience

The PDF builder must provide:

- A rich-document editor with undo/redo and keyboard shortcuts.
- A form-field browser grouped by section/path.
- Searchable field insertion as atomic reference chips.
- Multiple logical pages with add, delete, reorder, and explicit page breaks.
- Header, footer, and page-setting controls.
- Sample field values rendered with the production form renderer.
- Preview that calls the production server render pipeline.
- Save status, validation errors, and protection against accidental navigation with unsaved changes.
- A JSON inspection view for administrators or development environments.

### 7.2 Document Model

```ts
interface PdfBuilderDocument {
  type: 'doc';
  content?: PdfNode[];
}

interface PdfNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PdfNode[];
  text?: string;
  marks?: PdfMark[];
}
```

Persist structured JSON, not generated HTML. The server must normalize older supported document shapes before rendering. Unknown nodes must fail validation or degrade safely without executing content.

### 7.3 Supported Content

The editor and renderer must support:

- Paragraphs and headings levels 1-6.
- Bold, italic, underline, strike-through, inline code, text color, and links.
- Left, center, right, and justified text alignment.
- Hard breaks, horizontal rules, blockquotes, and code blocks.
- Bulleted, ordered, and task lists.
- Tables with header/cell nodes and optional borderless layout.
- Images with URL, alt text, caption, width, and left/center/right alignment.
- Two or more columns with configurable widths and `card`, `outline`, or `plain` presentation.
- Explicit page breaks.
- Stable field-reference nodes.
- Conditional content with if and optional else branches.
- Dynamic values supplied by an allowlisted resolver.
- Signer signature placeholders.
- Optional internal/user signature blocks.
- Optional signature evidence/certificate block.

### 7.4 Field References

```ts
interface FieldReferenceAttrs {
  fieldId: string;
  label: string;
  displayMode: 'inline' | 'checkbox-list';
}
```

- `fieldId` is authoritative; `label` is a saved fallback for authoring and diagnostics.
- Renaming a form field must not break a saved template.
- Deleted or unavailable references must be reported before save/publish and visibly marked in the editor.
- Inline references render a formatted string.
- Checklist references render selection options with selected states.
- All substituted text must be HTML-escaped before HTML rendering.

### 7.5 Conditional Document Blocks

Support `equals`, `notEquals`, `contains`, and `notEmpty` operators. Conditions reference stable field IDs and are evaluated only against resolved submission data. The same evaluator must be used for preview and final generation.

### 7.6 Dynamic Values

The core must include allowlisted values such as:

- Current date, short format.
- Current date, long format.
- Generation timestamp.
- Document or submission identifier.

Applications may register more values through `ExternalDataResolver`. Resolver IDs are stored in the document; arbitrary code or property paths are not.

### 7.7 Header and Footer

Each region supports:

- Enabled/disabled state.
- Structured mode with logo URL, logo alt text, logo width, title, subtitle, region height, and divider toggle.
- Rich-content mode using the same safe document model where enabled by the implementation.
- Repetition on each generated page.
- Reserved body spacing so content never overlaps the region.

Structured limits:

- Region height: 40-240 px.
- Logo width: 24-320 px.
- Logo URL: at most 2,000 characters.
- Title/subtitle: at most 255 characters each.

### 7.8 Page Settings

```ts
interface PdfSettings {
  pageSize: 'A4' | 'Letter';
  marginPreset: 'narrow' | 'normal' | 'wide';
  baseFontSize: number;
  lineHeight: number;
}
```

- Margins map to approximately 10 mm, 18 mm, and 25 mm.
- Base font size range: 8-24 pt.
- Line height range: 1.0-2.5.
- Preview and export must use identical settings.

### 7.9 Value Formatting

The render layer must format by field type:

- Date: configured locale with a deterministic default such as `MM/DD/YYYY`.
- Datetime: configured locale, date, time, and timezone.
- Money: configured locale and currency, preserving zero values.
- Percent: configured numeric convention; document whether stored values are fractions or display percentages.
- Single choice: display label, not stored code.
- Multiple choice: joined labels or a checklist.
- Calculation: its configured number, currency, or percent format.
- Signature: validated image content.
- Unknown or missing value: an explicit empty-value policy, never the field label as accidental final output.

Locale, currency, and timezone must be render inputs or tenant settings rather than hard-coded application assumptions.

## 8. PDF Rendering Pipeline

The authoritative pipeline is:

```text
template JSON
  + pinned form schema
  + validated submission/sample data
  + custom lists
  + allowlisted dynamic/external values
  + optional signatures
        |
        v
normalize and validate document
        |
        v
resolve conditions and field references
        |
        v
escape values and render controlled HTML/CSS
        |
        v
isolated HTML-to-PDF generation
        |
        v
PDF bytes + checksum + generation record
```

Requirements:

- Use the same render functions for sample preview, unsigned export, signing preview, and signed export.
- Wait for approved fonts and images before printing.
- Set deterministic page size, margins, background printing, and header/footer spacing.
- Apply request timeout, memory, document-size, image-size, and page-count limits.
- Block the rendering engine from accessing local files, metadata endpoints, and unapproved network destinations.
- Permit images only from configured origins or ingest them into controlled object storage.
- Return structured render errors without exposing server internals.
- Calculate a SHA-256 checksum for finalized documents.
- Record template version, form version, renderer version, actor, timestamp, status, and error summary.

## 9. Preview and Generation

### 9.1 Sample Preview

- Designers may enter sample values using the runtime form renderer.
- A generate-sample action may populate sensible values by field type.
- Sample values are ephemeral by default and must not create a submission.
- Preview opens inline and can be refreshed without saving the template.
- Preview requests still enforce document validation and resource limits.

### 9.2 Submission PDF

- Generate only from a stored submission and its pinned form version.
- The request may select an authorized template associated with that version.
- Generation may be synchronous for small documents or queued through a job interface.
- Generated files should be stored through `ObjectStorageProvider`; storing large PDF binaries in the primary database is optional and not preferred.
- Keep generation history rather than silently replacing prior finalized files.

### 9.3 Generation Record

```ts
interface PdfGeneration {
  id: string;
  tenantId: string;
  templateId: string;
  formVersionId: string;
  submissionId?: string;
  requestedBy?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  storageKey?: string;
  sha256?: string;
  byteLength?: number;
  rendererVersion: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}
```

## 10. Electronic Signing

Signing is an optional module layered on submissions and PDF templates.

### 10.1 Signature Nodes

Each signer placeholder has a unique `placeholderId` and label. A template may contain multiple placeholders. Duplicate or missing IDs must block template publication.

An internal/user-signature node may insert a signature supplied by the authenticated application user. Its source and authorization must be recorded.

### 10.2 Signing Request

```ts
interface SigningRequest {
  id: string;
  tenantId: string;
  submissionId: string;
  templateId: string;
  tokenHash: string;
  createdBy: string;
  expiresAt?: string;
  usedAt?: string;
  revokedAt?: string;
  createdAt: string;
}
```

Store a hash of the public token, not the raw token. Tokens must be cryptographically random, URL-safe, scoped to one request, expire when configured, and become unusable atomically after signing.

### 10.3 Public Signing Experience

The signing page must:

- Validate token existence, expiry, revocation, and use before disclosing document data.
- Show an unsigned PDF preview generated from the pinned submission and template.
- Collect signer name and email.
- Require explicit consent text and checkbox.
- Render one accessible signature pad per placeholder, with clear and undo actions and a larger drawing mode on small screens.
- Require all mandatory placeholders before submit.
- Prevent double submission and provide an idempotent server completion path.
- Show a completion receipt without allowing document mutation.

### 10.4 Signing Completion

In one transaction or recoverable workflow:

1. Revalidate and lock the signing request.
2. Validate signature image type, decoded size, and dimensions.
3. Render the final PDF with signatures and optional evidence block.
4. Store the final PDF and SHA-256 checksum.
5. Create an immutable signing event.
6. Mark the token used and submission signed.
7. Publish `document.signed` after durable completion.

The signing event records signer identity, consent text/version, timestamp, placeholder-to-image mapping or storage references, IP address, user agent, submission ID, form version, template ID, generated-document ID, and checksum. IP and user-agent collection must be configurable for privacy requirements.

## 11. API Contract

The transport may use REST, RPC, or server actions, but must expose equivalent operations.

### 11.1 Forms and Assets

- `POST /forms`
- `GET /forms`
- `GET /forms/{formId}`
- `PATCH /forms/{formId}`
- `POST /forms/{formId}/duplicate`
- `POST /forms/{formId}/submit-for-review`
- `POST /forms/{formId}/publish`
- `POST /forms/{formId}/versions/{versionId}/clone`
- `DELETE /forms/{formId}`
- CRUD and version endpoints for reusable field groups.
- CRUD endpoints for reusable lists.
- CRUD endpoints for form permissions.

### 11.2 Submissions

- `POST /forms/{formId}/submissions`
- `GET /submissions/{submissionId}`
- `PATCH /submissions/{submissionId}` for authorized draft updates.
- `POST /submissions/{submissionId}/validate`
- `POST /submissions/{submissionId}/submit`

### 11.3 PDF Templates and Generation

- `GET /form-versions/{versionId}/pdf-template`
- `PUT /form-versions/{versionId}/pdf-template`
- `POST /document-templates/{templateId}/validate`
- `POST /document-templates/{templateId}/preview` with ephemeral sample data.
- `POST /document-templates/{templateId}/generate` with a submission ID.
- `GET /pdf-generations/{generationId}`
- `GET /pdf-generations/{generationId}/download` using authorized or short-lived access.

### 11.4 Signing

- `POST /submissions/{submissionId}/signing-requests`
- `POST /signing-requests/{requestId}/revoke`
- `GET /sign/{token}`
- `GET /sign/{token}/preview`
- `POST /sign/{token}/complete`

Every mutation must support request validation. Creation, generation, and signing completion should accept idempotency keys.

## 12. Events and Integration Contracts

Publish versioned events after durable state changes:

- `form.published`
- `form.submitted`
- `submission.status_changed`
- `document.generation_requested`
- `document.generated`
- `document.generation_failed`
- `signing.requested`
- `signing.completed`
- `signing.revoked`

Events include event ID, schema version, tenant ID, aggregate ID, actor ID when available, occurred-at timestamp, and minimal payload. Use an outbox pattern when delivery consistency matters. No external integration may be called from core domain code directly.

## 13. Security and Privacy

- Enforce tenant scoping in every repository query.
- Use parameterized database access and strict input schemas.
- Sanitize links and image URLs; reject scriptable URL schemes.
- Escape all merged values and do not accept arbitrary HTML nodes.
- Apply CSRF protection to authenticated browser mutations.
- Rate-limit public signing, preview, and generation endpoints.
- Never log raw signing tokens, signatures, full submission data, or signed URLs.
- Encrypt storage and transport; use short-lived signed download URLs.
- Restrict upload MIME types by content inspection, not extension alone.
- Define retention and deletion policies for submissions, signatures, audit metadata, and generated PDFs.
- Preserve finalized document bytes and checksums as immutable records.
- Avoid module-level mutable render context so concurrent renders cannot leak values between requests.
- Run the PDF rendering engine with process isolation and restricted networking suitable for untrusted document data.

## 14. Non-Functional Requirements

### 14.1 Reliability

- Final generation and signing completion are idempotent.
- Failed jobs are retryable without creating duplicate finalized documents.
- Published form versions and completed signing events are immutable.
- Database and object-storage failures leave recoverable states.

### 14.2 Performance Targets

- Builder interactions respond within 100 ms for forms up to 200 fields on a supported desktop browser.
- Form value changes, conditions, and calculations settle within 150 ms for typical forms.
- Preview request begins returning status within 500 ms.
- A typical 10-page document without remote asset delays renders within 10 seconds at p95 in the target environment.
- Limits are configurable for fields, nodes, pages, image bytes, upload bytes, and render time.

### 14.3 Compatibility and Accessibility

- Support current and previous major versions of Chrome, Edge, Firefox, and Safari for authoring/filling where editor dependencies permit.
- Public fill and signing flows are responsive from 320 px width upward.
- Public and administrative flows meet WCAG 2.2 AA.
- Generated PDFs use embedded or reliably available fonts and preserve selectable text where possible.

### 14.4 Observability

Record structured metrics and logs for render duration, queue delay, page count, output size, failures by code, signing completion, and adapter latency. Correlate requests, jobs, and events with trace IDs without logging sensitive values.

## 15. Suggested Architecture

```text
modules/
  forms/
    domain/            field types, schema, conditions, calculations
    application/       commands, versioning, submissions
    adapters/          database, identity, lists
    ui/                builder and renderer
  documents/
    domain/            document nodes, settings, normalization
    application/       template management and generation
    rendering/         field resolution, safe HTML, PDF engine
    ui/                rich editor, field browser, preview
  signing/
    domain/            requests and signing events
    application/       token lifecycle and completion workflow
    ui/                public signing and signature pad
  platform/
    auth/
    storage/
    notifications/
    events/
```

Keep domain types and pure evaluators framework-independent. UI components may use the host framework, while rendering and validation contracts should remain portable TypeScript packages.

## 16. Delivery Plan

### Phase 1: Domain Foundation

- Form, version, reusable list, field-group, submission, and permission models.
- Pure schema validation, conditions, safe formula evaluation, and value formatting.
- Tenant-aware repositories and migrations.

### Phase 2: Form Builder and Renderer

- Core field palette, canvas, property editing, preview, and runtime renderer.
- Publishing and immutable version snapshots.
- Reusable lists and version-pinned field groups.

### Phase 3: PDF Authoring and Export

- Structured document model and rich editor.
- Field references, conditional blocks, dynamic values, layout nodes, header/footer, and page settings.
- Safe HTML renderer, isolated PDF service, sample preview, generation history, and object storage.

### Phase 4: Signing

- Signature nodes and pad.
- Hashed one-time tokens, public preview, consent, finalization, checksums, and immutable signing events.

### Phase 5: Integration SDK

- Identity, storage, notification, external-data, and event adapters.
- Import/export format for forms and PDF templates.
- Webhooks or outbox delivery and operational dashboards.

## 17. Acceptance Criteria

### 17.1 Form Authoring

- A designer can create, reorder, duplicate, configure, and delete every core field type.
- A nested section deeper than one level is rejected.
- Publishing rejects duplicate field IDs/keys and broken condition, formula, template, list, or PDF references.
- Editing a published form creates a new version; existing submissions continue rendering against the old version.
- Hidden conditional-section data is not submitted or rendered into PDFs.
- Client and server produce equivalent validation results for supported rules.

### 17.2 Calculations and Lists

- A formula such as `=[quantity] * [unit_price]` updates when either source changes and formats correctly.
- Invalid and circular formulas are reported without executing arbitrary code.
- Choice values resolve to saved display labels in generated PDFs.
- Updating a reusable list or field group cannot alter an already published form version.

### 17.3 PDF Authoring

- A designer can create a multipage document containing rich text, lists, tables, images, columns, fields, conditions, and signatures.
- Field references survive field-label changes because they use field IDs.
- Missing references are visibly identified and block final publication.
- Header/footer content repeats without overlapping body content.
- A4/Letter, margins, font size, and line height match between preview and export.
- Preview with sample values and generation from the same values produce equivalent document content.

### 17.4 Rendering

- Date, datetime, money, percent, calculation, and option fields render using configured locale settings.
- Zero, false, empty array, and missing values are distinguished correctly.
- User-provided text cannot inject HTML, scripts, local file access, or unapproved network requests.
- Concurrent renders cannot exchange submission data or signatures.
- A completed generation has stored bytes, metadata, and a verified SHA-256 checksum.

### 17.5 Signing

- Invalid, expired, revoked, and used tokens disclose no document and return distinct safe errors.
- Every required placeholder must be signed before completion.
- Two concurrent completion requests create one signed event and one finalized document.
- The signed PDF contains the expected signatures and optional evidence block.
- The signing event links the exact submission, form version, template, generated bytes, consent version, and checksum.

### 17.6 Isolation and Authorization

- A user cannot read or mutate another tenant's forms, submissions, templates, generations, or reusable assets even with guessed IDs.
- Public signing responses expose only data required to review and sign that request.
- Private submission data never appears in public payloads or PDFs unless deliberately inserted through an authorized field.

## 18. Testing Strategy

- **Unit tests**: schema normalization, conditional visibility, safe formula parsing, value formatting, token resolution, document normalization, and node rendering.
- **Component tests**: drag-and-drop keyboard equivalents, property editing, runtime fields, signature pad, and validation errors.
- **Integration tests**: publish/version transactions, submission validation, reusable asset pinning, template saves, object storage, and adapter failures.
- **Render snapshot tests**: controlled HTML and PDF text extraction for each node and field type.
- **Visual regression tests**: representative A4 and Letter documents across page breaks, headers, footers, tables, columns, and long values.
- **End-to-end tests**: create form, publish, submit, preview, generate, request signature, sign, download, and verify checksum.
- **Security tests**: tenant ID tampering, token brute-force controls, XSS payloads, unsafe URLs, SSRF attempts, oversized images/uploads, malformed JSON, and concurrent signing.
- **Load tests**: parallel previews and exports with checks for memory pressure, queue behavior, and cross-request isolation.

## 19. Portability and Import/Export

Define a versioned bundle format containing form metadata, form schema, reusable lists, pinned field-group snapshots, PDF document JSON, region configuration, and page settings. Exclude tenant IDs, user IDs, raw submission data, signing tokens, and secrets. On import:

- Generate new resource IDs.
- Rewrite all internal field, list, group, condition, formula, and PDF references.
- Report unsupported node or field types before committing.
- Validate the complete bundle atomically.

This bundle is the preferred mechanism for moving builders between applications while keeping runtime integrations application-specific.

## 20. Definition of Done

The standalone feature is complete when an application can install or host the modules, create and publish a custom form, collect a version-pinned submission, design a rich PDF using those fields, preview and generate the PDF with deterministic formatting, optionally complete a secure signing flow, and verify the resulting immutable document through its stored metadata and checksum.