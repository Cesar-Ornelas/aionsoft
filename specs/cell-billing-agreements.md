# Cell Billing Agreements

Billing Agreements represent commercial commitments for an Operations Account. A customer may have multiple agreements, and each agreement may contain multiple independent service or plan items.

## Invariants

- An agreement belongs to one Operations Account and may reference a CRM company.
- Agreement status is `draft`, `active`, `paused`, `expired`, or `cancelled`.
- An agreement item references exactly one Catalog service or plan.
- Item prices and terms are immutable snapshots of Catalog values at item creation.
- Agreement and item dates must be valid and end dates cannot precede start dates.
- Expired and cancelled agreements cannot receive new items.

PocketBase setup is additive and idempotent. Existing collections and records are preserved; historical snapshots are never recalculated when Catalog records change.

Invoices, usage, tax, payments, recurring execution, and project delivery grouping are outside this first lifecycle slice.
