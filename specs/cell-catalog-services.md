# Cell Catalog Services

## Purpose

The Catalog feature manages reusable services offered by Aionsoft. It is surfaced in the Sales workspace and is separate from Operations delivery records and Management administration.

## Service fields

Each catalog service has:

- `name`: required display name
- `description`: optional internal description
- `code`: required unique code or SKU, normalized to uppercase
- `customerPriceCents` and `internalCostCents`: legacy compatibility fields in integer minor units
- `currency`: explicit currency, currently USD
- `status`: `active`, `inactive`, or `archived`
- created and updated timestamps

A subcontracted service may have a customer price of 100000 cents and an internal cost of 80000 cents. Margin is derived from these values later and is not stored as an editable field.

## Pricing offers and plans

New pricing is represented separately from the service definition:

- A `catalog_price_offers` record describes one way to sell a service: `fixed`, `hourly`, `daily`, `per_unit`, or `recurring`.
- Each offer has a unit label, sale amount, internal cost, currency, lifecycle status, and optional effective dates.
- A `catalog_plans` record describes a bundle with a code, bundle price, and term such as one-time, monthly, quarterly, or annual.
- A plan also records commitment enforcement (`minimum_charge` or `prepaid_allowance`), unused-quantity policy (`forfeit` or `carry_forward`), and effective dates.
- `catalog_plan_items` records the included quantity for a service or offer and an optional overage amount and billing basis.

For example, a monthly plan can require 40 hours for 540000 cents and charge 15000 cents per hour after the included quantity. Its derived effective rate is 13500 cents per hour when the full commitment is purchased. Prices remain integer minor units, and historical pricing is preserved by effective dates rather than overwriting old plans or offers.

## Persistence

Cell uses the provider-neutral Catalog model, repository port, service, and server-only PocketBase adapter. PocketBase bootstraps additive `catalog_services`, `catalog_price_offers`, `catalog_plans`, and `catalog_plan_items` collections. Setup is safe to run repeatedly and does not remove existing fields or records.

## Lifecycle and security

Services are archived instead of hard-deleted. Internal cost is an internal business value and must not be exposed in customer-facing workflows. The initial page is an authenticated internal catalog view; authorization roles for editing and cost visibility are a follow-up as Cell authorization matures.

## Scope

The first release supports global service definitions, search, status filtering, create, edit, archive, pricing offers, and retainer plan contracts. The plan editor supports one service item per plan in this first slice. Quotes, estimates, invoices, taxes, customer-specific price books, usage metering, recurring billing execution, proration, and Operations Account service assignments are deferred.
