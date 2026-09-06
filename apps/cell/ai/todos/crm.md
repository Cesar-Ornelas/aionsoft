# CRM Follow-up

Use this backlog for unfinished CRM work. Durable rules belong in `ai/features/crm.md` or `specs/cell-crm-companies.md`.

## Blocked

### Cell Management authorization enforcement

- Status: blocked
- Rationale: Management now has provider-neutral access records and assignment services, but Cell does not yet resolve a request-local actor or enforce permission keys on server handlers.
- Dependency: Cell identity/provider-link architecture and request-local current-user resolution.
- Acceptance: Management and CRM loads/mutations require an authenticated actor and explicit server-side permissions; PocketBase rules align with the application policy.
- Affected paths: `src/hooks.server.js`, `src/lib/management/`, `src/lib/crm/server/`, `src/routes/management/`, `src/routes/crm/`

### Cell authentication and CRM authorization

- Status: blocked
- Rationale: CRM server routes use privileged PocketBase access and require an application session and role policy before production exposure.
- Dependency: Cell authentication architecture decision.
- Acceptance: Every CRM page and mutation resolves an authenticated actor and enforces an explicit permission.
- Affected paths: `src/hooks.server.js`, `src/lib/crm/server/`, `src/routes/crm/`

## Backlog

### Contracting and operating accounts

- Status: backlog
- Rationale: A DBA may operate a deal while its parent legal entity signs the contract.
- Dependency: Deals and contracts feature design.
- Acceptance: Deals/contracts persist both account roles and preserve historical attribution.
- Specification: `specs/cell-crm-companies.md`

### Legacy CRM record migration

- Status: backlog
- Rationale: Existing auth `contacts` and deal/activity relations are intentionally preserved during company delivery.
- Dependency: Production-data audit and migration mapping.
- Acceptance: Reviewed, reversible migration moves intended CRM records without changing authentication identities.
- Affected paths: `src/lib/server/crm-bootstrap.js`

### Multi-account contact affiliations

- Status: backlog
- Rationale: The first release assigns each contact to zero or one account; standalone contacts support early sales qualification.
- Dependency: Confirm reporting and primary-affiliation rules.
- Acceptance: One person can hold roles at multiple related accounts without duplicate person records.

### Atomic primary-contact assignment

- Status: backlog
- Rationale: Creating the first contact and assigning it as primary currently requires two PocketBase writes.
- Dependency: Transaction-capable persistence boundary.
- Acceptance: First-contact creation and primary assignment either both persist or both roll back.

### Relationship write integrity

- Status: backlog
- Rationale: Service validation alone cannot prevent duplicate or cyclic hierarchy writes under concurrency.
- Dependency: Database uniqueness constraints and transaction-safe hierarchy validation.
- Acceptance: Concurrent writes cannot create duplicate relationships or hierarchy cycles.

### Duplicate detection and account merge

- Status: backlog
- Rationale: Name, domain, phone, and future tax identifiers can indicate duplicate accounts.
- Dependency: Audit and canonical-record requirements.
- Acceptance: Users can review candidates, merge safely, and retain relationship history.

### Tax identifiers

- Status: backlog
- Rationale: EIN and country-specific identifiers may improve legal-entity matching but require access and retention rules.
- Dependency: Security and compliance review.
- Acceptance: Identifiers are protected, validated by country, and usable for deduplication.

### Bulk import and export

- Status: backlog
- Rationale: Company onboarding may require structured migration from external systems.
- Dependency: Stable company schema and merge behavior.
- Acceptance: Validated import preview, row-level errors, and permission-aware export are available.

### CRM realtime updates

- Status: backlog
- Rationale: Concurrent operators may need list and detail refreshes.
- Dependency: Stable mutation APIs and authorization.
- Acceptance: Authorized users receive scoped changes with a polling fallback.
