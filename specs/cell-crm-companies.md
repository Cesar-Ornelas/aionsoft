# Cell CRM Companies

## Purpose

Cell CRM manages companies and the people and locations associated with them. A company may represent a legal entity, DBA, prospect, or related organization.

## Account identity

- A legal entity and each independently operated DBA use separate account records.
- A parent legal entity may exist with lifecycle `related` before it enters the `customer` lifecycle.
- A DBA may initially be unlinked, but the UI must flag it until a `dba_of` relationship is recorded.
- Account relationships are directional: `dba_of`, `subsidiary_of`, or `affiliate_of`.
- Future contracts and deals must identify both the operating account and legal contracting account when they differ.

## Company

An account stores:

- type: `legal_entity` or `dba`
- legal name
- optional display or operating name
- lifecycle: `related`, `prospect`, `customer`, `inactive`, or `archived`
- main phone
- optional primary contact
- created and updated timestamps

Accounts are archived rather than hard-deleted.

## Contacts

- An account may have multiple contacts.
- A contact may be created without an account during initial sales qualification.
- A contact belongs to zero or one account in this release and can be linked or unlinked explicitly.
- First name, last name, and at least one of email or phone are required.
- Job title and phone extension are optional.
- The first contact becomes primary automatically.
- An account has at most one primary contact, represented by the account's primary-contact relation.
- A primary contact must be reassigned before that contact can be deleted.
- Unlinked contacts cannot be primary contacts. Archiving a company must not delete its contacts.

## Addresses

An account may have multiple addresses. Each address stores a label/type, address lines, city, region, postal code, and country.

## Company list

The list is server-paginated and excludes archived accounts by default. Filters are URL-backed and combine with AND semantics:

- Name matches legal name or display name.
- Phone matches the account phone or any contact phone after formatting is removed.
- ZIP/postal code matches any account address.

Filters are staged in a right-side sheet and change results only when applied.

## Application routes

- CRM dashboard: `/crm/dashboard`
- Legacy CRM landing route `/crm` redirects to the dashboard.
- Company list and create endpoint: `/crm/companies`
- Company detail and update endpoint: `/crm/companies/[companyId]`
- Contacts, addresses, and relationships: nested below the company detail route
- Cross-company and standalone contacts: `/crm/contacts` and `/crm/contacts/[contactId]`

Lowercase app prefixes are canonical. Legacy customer URLs redirect to their company equivalents in the CRM namespace.

## Data access

CRM follows `specs/data-access.md`:

```text
route -> CRM service -> CRM repository port <- PocketBase adapter
```

PocketBase SDK calls and administrator credentials remain server-only. The CRM collections deny direct browser access. Cell application authentication and CRM authorization are required before production exposure.

## Initial scope

Included:

- account list, filters, pagination, create, edit, detail, and archive
- multiple contacts and addresses
- primary-contact management
- linked legal entity, DBA, subsidiary, and affiliate accounts

Deferred work is tracked in `apps/cell/ai/todos/crm.md`.
