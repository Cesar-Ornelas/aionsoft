# Clients

## Overview

The admin app needs a top-level `Clients` area for storing customer company records and the people Aionsoft works with inside each customer account.

This first pass is intentionally basic CRUD only.

It covers:
- company information
- multiple contacts per client
- one primary contact per client

It does not yet cover:
- lifecycle or status tracking
- contact categories or routing types
- notes, activity, tasks, or CRM workflow
- billing, contracts, or project associations

---

## Route Shape

The feature lives outside the security section.

Routes:
- `/clients`
- `/clients/new`
- `/clients/[clientId]`
- `/clients/[clientId]/overview`
- `/clients/[clientId]/edit`

This keeps clients as a separate operational domain in the admin app rather than mixing it with authentication and authorization management.

When a client is selected, the app enters a dedicated client workspace.

Inside that workspace:
- the left navigation is replaced with client-specific navigation
- the normal admin menu is hidden
- an explicit exit action returns the user to `/clients`

This focused shell is intended to be reusable for future entity-driven areas.

---

## Data Model

### Client

Each client stores:
- `id`
- `company_name`
- `address`
- `website`
- `phone`
- `created_at`
- `updated_at`

### Client Contact

Each client contact stores:
- `id`
- `client_id`
- `name`
- `email`
- `phone`
- `extension`
- `title`
- `is_primary`
- `created_at`
- `updated_at`

Contacts are owned by a single client.

---

## Rules

1. A client must have a company name.
2. A client must have at least one contact.
3. Exactly one contact must be marked as primary.
4. Each populated contact must have a name.
5. Contacts are created and edited through dedicated routes inside the client workspace.

Primary-contact enforcement should happen in both server validation and persistence safeguards.

---

## UI Shape

The list page should show:
- company name
- primary contact
- website
- phone
- updated timestamp

The create and edit pages should:
- stay visually compact
- reuse the current admin form shell style
- support adding and removing contact blocks inline
- keep primary-contact selection simple

The selected-client workspace should:
- provide a dedicated left-side client menu
- default to an overview page for the selected client
- keep editing inside the workspace rather than redirecting back to the client list

---

## Architecture Notes

This feature is app-local.

It should use the admin app PostgreSQL database and server-side SvelteKit form actions. Logto is not part of the client data model.