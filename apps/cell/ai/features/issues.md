# Operations Issues

## Purpose

Issues are a global Operations work queue for customer, provider, and internal problems. An issue may optionally link to a CRM company and an Operations Account, but it is not owned by one account.

## Ownership

- `src/lib/issues/` owns issue models, validation, ports, services, and PocketBase adapters.
- `src/routes/operations/issues/` owns the list/create HTTP and UI surface.
- CRM and Operations provide optional linked-record lookups through the composition boundary.
- Management owns team-member records; issue assignments reference active management users.

## Initial contract

- Types: `customer`, `provider`, `internal`.
- Priorities: `low`, `medium`, `high`, `urgent`.
- Statuses: `open`, `in_progress`, `resolved`, `closed`, `cancelled`.
- Descriptions are Markdown produced by the existing TipTap editor pattern.
- Issues support normalized lowercase tags, tag badges, and queue filtering by tag.
- Tags are created or reused when an issue is created or updated; tag links are owned by the Issues adapter.
- Issue comments are flat, Markdown-authored records with explicit authenticated authors and chronological ordering.
- The existing threaded comment persistence remains deferred while the flat conversation model is evaluated.
- Comment edits and deletes are restricted to the comment author; missing request identity is rejected.
- Closed and cancelled issues remain available for history.

## Validation

- Focused tests: `bun run cell:test:issues`
- App build: `bun run cell:build`
- PocketBase setup: `bun run cell:setup:pb`