# Catalog Feature Context

## Purpose

Catalog owns reusable service definitions, pricing offers, bundle plans, internal delivery costs, and service lifecycle management.

## Ownership

- Catalog is a Sales-adjacent reference-data domain.
- Operations may consume catalog services later for delivery planning and account work.
- Management owns platform permissions and administration, not service definitions.
- Catalog services are global and reusable across customers in the first release.

## Behavior

- A service has a name, description, stable code/SKU, legacy compatibility prices, currency, and lifecycle status.
- Pricing offers hold the billing basis (`fixed`, `hourly`, `daily`, `per_unit`, or `recurring`), unit label, sale amount, internal cost, and optional effective dates.
- Plans bundle included quantities at a bundle price and can define an optional overage amount, such as 10 hours for $900 and $90/hour after that.
- Retainer plans can require a monthly minimum charge or act as a prepaid allowance, define whether unused quantities are forfeited or carried forward, and use effective dates. The discounted rate is derived from bundle price divided by committed quantity.
- Customer price and internal cost are independent values. Internal cost may represent a subcontractor or other delivery cost.
- Codes are normalized to uppercase and must be unique.
- Money is stored as integer minor units with an explicit currency.
- Services are archived rather than deleted so future quotes and invoices can retain historical references.
- Internal cost is shown only in the authenticated internal catalog UI and is not a customer-facing value.

## Routes

- `/catalog/services` is the canonical list, search, create, edit, and archive route.
- `/catalog/services/[serviceId]` exposes server API operations for one service.
- `/catalog/services/[serviceId]/offers` lists and creates pricing offers.
- `/catalog/plans` lists and creates bundle plans.
- `/catalog/plans/[planId]/items` adds included-quantity and overage rules to a plan.

## Boundaries

- Routes use the Catalog service; PocketBase is restricted to server adapters and bootstrap.
- Quotes, estimates, invoices, taxes, customer-specific price books, usage metering, recurring billing execution, and profitability reporting are future work.
