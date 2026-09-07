# Operations Issues

Operations Issues is a global employee-facing queue for problems involving customers, providers, or internal work. Issues are not restricted to one Operations Account, but may optionally link to a CRM company and an Operations Account.

## Initial contract

- Types: `customer`, `provider`, `internal`.
- Priorities: `low`, `medium`, `high`, `urgent`.
- Statuses: `open`, `in_progress`, `resolved`, `closed`, `cancelled`.
- Titles are required and descriptions are Markdown-compatible text.
- Due dates, company links, and account links are optional.
- The conversation is the issue's source of resolution context; resolving or closing an issue does not require a separate summary field.
- Closed and cancelled issues are retained for history and cannot be reopened in the first release.

## Architecture

Issue domain models, ports, validation, and PocketBase adapters live under `apps/cell/src/lib/issues/`. Routes depend on the issue service through the shared server composition root. CRM companies, Operations Accounts, and Management users remain owned by their respective features.

PocketBase schema setup is additive and idempotent. The first slice creates the issue collection and supporting comment/tag/assignment collections so later collaboration workflows can be added without changing the issue identity contract.

## Deferred

Comments, tags, assignments, company/account selectors, notifications, attachments, SLA timers, automation, email ingestion, webhooks, customer portal visibility, and advanced request-time authorization are staged follow-up work. Related tasks should be linkable from an issue and link back to the issue conversation. Any two-way task/issue status synchronization, including closing an issue updating related tasks, must be designed with explicit ownership, permissions, loop prevention, and conflict handling before implementation.