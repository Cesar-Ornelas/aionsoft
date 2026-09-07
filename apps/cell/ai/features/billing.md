# Billing Feature Context

## Purpose

Billing owns customer commercial agreements attached to Operations Accounts. An agreement is the commitment; services and plans are independently managed agreement items.

## Behavior

- Agreements move through draft, active, paused, expired, and cancelled states.
- Each item references exactly one Catalog service or plan.
- Catalog price, currency, billing basis, unit, and bundle terms are snapshotted when an item is added.
- Agreement items have independent effective dates and lifecycle status.
- Historical agreements never recalculate from current Catalog values.

## Boundaries

- Billing consumes Catalog and Operations services through provider-neutral service dependencies.
- PocketBase access stays in the Billing adapter and schema bootstrap.
- Invoices, usage, taxes, payments, recurring execution, and Projects are future capabilities.
