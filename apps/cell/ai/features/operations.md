# Operations

Operations Accounts organize service delivery after Sales companies become customers.

## Vocabulary

- **Company**: CRM-owned legal or operating entity being acquired, qualified, or managed in Sales.
- **Operations Account**: service and delivery container that can group one or more customer companies.
- **Link**: optional relationship from one CRM Company to one Operations Account.

## Invariants

- An account requires only a name at creation.
- One account can contain many companies.
- A company can belong to at most one account.
- Only CRM companies with lifecycle `customer` can be linked.
- Linking never changes CRM lifecycle.
- Only active accounts accept new links.
- Archiving preserves links for history and compliance.
- Account schedule events are persisted and account-scoped.
- Event dates, type, title, description, all-day state, status, and optional links are supported.
- Event creation uses `Details` and `Attendees` tabs; attendees include active internal users and contacts from linked customer companies.
- Account Communications includes an account-scoped Calls view with calendar markers, selected-date call history, and registration for date/time, duration, linked customer contact, direction, outcome, and notes.
- Calls are persisted separately from schedule events and only offer contacts from CRM companies linked to the current Operations Account.

## Validation

- Focused tests: `bun run cell:test:operations`
- App build: `bun run cell:build`
- PocketBase Compose validation: `bun run cell:infra:config`
