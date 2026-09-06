# CRM Feature Context

## Purpose

CRM owns companies, contacts, addresses, company relationships, opportunities, activities, and their PocketBase collection definitions.

## Domain Vocabulary

- Business-facing account records are called companies in the UI and domain contracts.
- A legal entity and each independently operated DBA are separate linked accounts.
- Account lifecycle is `related`, `prospect`, `customer`, `inactive`, or `archived`.
- A DBA may be temporarily unlinked but must be surfaced as incomplete.
- Contacts may begin unlinked during initial sales qualification, then belong to one account after linkage. The first linked contact becomes primary.
- Accounts are archived rather than hard-deleted.

## Current Ownership

- `src/lib/crm/model/` defines provider-neutral CRM records and stable errors.
- `src/lib/crm/server/ports/` defines feature-facing persistence contracts.
- `src/lib/crm/server/services/` owns CRM validation and workflows.
- `src/lib/crm/server/tests/` contains focused domain behavior tests.
- `src/lib/server/crm-bootstrap.js` defines and bootstraps CRM collections.
- `src/lib/server/pocketbase.js` provides shared PocketBase client access.
- `src/routes/crm/` owns the CRM dashboard and nested company pages and endpoints.
- `src/routes/setup/` composes CRM and management initialization.

## Routes

- `/crm/dashboard` is the canonical CRM dashboard. `/crm` redirects there for compatibility.
- `/crm/companies` is the canonical company list and mutation endpoint.
- Company details and child resources remain nested below `/crm/companies/[companyId]`.
- `/crm/contacts` is the canonical cross-company contact list and standalone contact workflow.
- Legacy customer URLs redirect to their canonical company equivalents.

## Boundaries

- CRM does not own users, groups, roles, permissions, or management migrations.
- Provider SDK calls and record mapping belong in server-only CRM adapters.
- Treat PocketBase administrator access as server-only.
- Preserve the legacy auth `contacts` collection and its deal/activity relationships until a reviewed migration exists.
- Do not infer implemented route behavior from navigation placeholders.

## Invariants

- Company search matches legal/display name, company/contact phone, and any address postal code.
- An account has at most one primary contact, and that contact must belong to the account.
- An unlinked contact cannot be a company primary contact and can be linked or unlinked explicitly.
- Account relationships cannot be self-referential, duplicated, or cyclic.
- Future contracts must distinguish the operating account from the legal contracting account.

## Working Guidance

- Read this file and the paths declared for `features.crm` in `ai-workspace.yaml` first.
- Open management context only when the task changes shared setup behavior or authorization boundaries.
- Record new CRM-owned paths in the manifest when the feature grows.
- Use `ai/todos/crm.md` for unfinished work; keep this file limited to stable context.
- Run `bun run cell:test:crm` before the Cell build when CRM domain behavior changes.
