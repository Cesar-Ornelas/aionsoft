# Data Access and Provider Portability

Feature export/import packages are provider-neutral JSON contracts. They must use stable application-level keys inside the package, remap provider IDs during import, validate required references before writes, and keep provider SDK calls inside server-only adapters/composition roots. Imports that cannot guarantee a transaction must use explicit compensation cleanup and report skipped optional relations. Provider-specific dump/restore formats are not feature contracts.

## Purpose

Application features must remain understandable and testable without depending directly on a database, authentication service, file store, or provider SDK. This standard makes changing providers an adapter replacement rather than a rewrite of routes and business rules.

Provider neutrality is required by default for new feature data access. Existing direct provider access may be migrated incrementally when the owning feature is changed.

## Architecture

Each feature owns four layers:

1. **Models** define provider-neutral domain records, commands, query inputs, and results.
2. **Ports** define the operations required by feature workflows.
3. **Services** implement validation and business workflows using ports.
4. **Adapters** translate between ports and a concrete provider.

The application composition root selects adapters and supplies them to feature services. Routes are transport adapters: they parse requests, invoke services, and map results to HTTP responses.

```text
route -> feature service -> feature port <- provider adapter -> provider SDK
                         ^
                         <- in-memory test adapter
```

## Feature Ownership

Keep models, ports, services, and adapters inside the owning feature. A typical JavaScript feature uses:

```text
src/lib/<feature>/
  model/
  server/
    ports/
    services/
    adapters/
      pocketbase/
      postgres/
```

Use JSDoc structural types in JavaScript applications. TypeScript applications use interfaces and types. Move a contract to `packages/` only after demonstrated reuse by multiple applications.

## Models and Identifiers

- Domain models must not expose provider response objects, collection metadata, SQL rows, query builders, or SDK error types.
- Use stable application identifiers in domain relationships. Keep provider identifiers in adapter mappings when they differ.
- Normalize timestamps, optional values, status values, pagination, sorting, and filtering at the port boundary.
- Commands should describe business intent instead of provider mutations.
- Return domain records or explicit results, not raw provider responses.

## Repository Ports

Define ports from the feature's needs rather than mirroring generic provider CRUD APIs. Prefer operations such as `findContactByEmail`, `listOpenDeals`, or `saveRole` when they express stable domain behavior.

Ports must define:

- Inputs and returned models
- Not-found, conflict, validation, and unavailable behavior
- Pagination and ordering semantics
- Consistency expectations
- Required provider capabilities

Use stable application error codes. Adapters translate provider errors into these errors; routes translate application errors into HTTP responses.

## Identity and Authentication

Authentication follows the same port-and-adapter model for common application needs.

- Identity models expose stable subject, profile, and status information without Logto or PocketBase record shapes.
- Identity ports may define session resolution, identity lookup, provisioning, profile updates, and supported credential workflows.
- Application authorization remains feature or app owned and must not depend directly on provider role formats.
- Provider administrator authentication, token exchange, callback protocols, and management APIs remain infrastructure or capability adapters.
- A provider must report unsupported identity capabilities explicitly; adapters must not pretend to support behavior they cannot guarantee.

## Explicit Capabilities

Do not hide meaningful provider differences behind misleading repository methods. Define separate capability ports for behavior such as:

- Transactions and atomic multi-record operations
- Realtime subscriptions
- File and object storage
- Full-text or provider-specific search
- Collection or database schema administration
- Identity administration and credential management

Feature services may require a capability or define a fallback. Test adapters must expose the same capability status and must not silently simulate stronger guarantees.

## Composition

- Provider selection, credentials, SDK clients, and adapter construction belong in a server-only composition root.
- Routes and feature services must not import provider SDKs or create provider clients.
- Cross-feature workflows depend on another feature's public service or port, not its adapter.
- Avoid service locators that allow arbitrary provider access throughout the application.

## Schema and Migrations

- Domain models are not database schemas. Adapters own provider schema mapping.
- Schema administration is an explicit provider capability.
- Additive synchronization may ensure missing structures; destructive changes require a reviewed migration.
- Migration state and failure behavior must be documented for each provider.
- Data migrations must preserve stable application identifiers or maintain an explicit mapping table.

## Testing

Every production adapter should pass a reusable contract suite for the behavior promised by its ports.

- Use in-memory adapters for fast service tests.
- Use provider integration tests for provider semantics such as relations, files, auth fields, migrations, realtime, and transactions.
- Run the same core behavioral cases against each provider adapter.
- Test unsupported capabilities and partial-failure behavior explicitly.

## Exceptions

Direct provider access outside adapters, infrastructure, or composition requires a documented exception containing:

- Provider capability being used
- Why a neutral port or capability port is unsuitable
- Feature and files affected
- Fallback or failure behavior
- Migration and lock-in impact
- Responsible owner and review date

## Current Repository State

- Cell uses PocketBase. Existing routes and bootstrap code contain direct PocketBase calls and will migrate feature by feature, beginning with Management.
- Admin uses PostgreSQL with existing raw SQL store modules. New data work should introduce feature-facing ports and adapters; existing stores may migrate incrementally.
- Portal uses Logto and may add app-local PostgreSQL persistence as features require it.
- PostgreSQL, PocketBase, Drizzle, and Logto are implementation choices, not domain-layer contracts.
