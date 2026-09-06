---
name: provider-neutral-data-layer
description: "Design, implement, review, or migrate provider-neutral feature data access using domain models, repository and identity ports, services, adapters, composition roots, capability boundaries, and contract tests. Use for PocketBase, PostgreSQL, Drizzle, Logto, files, realtime, migrations, or provider changes."
argument-hint: "Describe the app, feature, current provider, and data workflow"
user-invocable: true
---

# Provider-Neutral Data Layer

Use `specs/data-access.md` as the authoritative architecture standard.

## Procedure

1. Select the owning app and feature from its `ai-workspace.yaml`.
2. Describe the workflow in domain terms and identify its consistency requirements.
3. Define provider-neutral models, commands, query inputs, results, and stable errors.
4. Define the smallest feature-facing repository or identity ports required by the workflow.
5. Identify explicit capabilities such as transactions, files, realtime, schema administration, or identity management.
6. Implement business validation and orchestration in a service that depends only on ports.
7. Implement a server-only adapter that maps the selected provider to the ports and capability contracts.
8. Construct the adapter and service in a server-only composition root.
9. Keep routes limited to transport parsing and application result mapping.
10. Run reusable contract tests against an in-memory adapter and the production adapter where provider semantics matter.
11. Update the feature context, architecture specs, and provider exception record when boundaries change.

## Review Checklist

- Domain models contain no provider records, SDK types, SQL rows, or collection metadata.
- Provider SDK imports exist only in approved adapters, infrastructure, or composition.
- Ports express feature needs rather than mirroring provider CRUD APIs.
- Identity models and authorization rules are provider independent.
- Errors, pagination, timestamps, optional values, and identifiers are normalized.
- Unsupported capabilities fail explicitly.
- Destructive schema changes use reviewed migrations.
- A second adapter can implement the contract without changing routes or services.

## Migration Workflow

For existing direct provider access, migrate one workflow at a time:

1. Characterize current request and response behavior.
2. Add models, ports, and contract tests.
3. Wrap current provider behavior in an adapter.
4. Add a service and composition wiring.
5. Switch one route or caller to the service.
6. Run focused behavior checks and the owning app build.
7. Remove the obsolete direct provider access.

Do not combine provider replacement with domain behavior changes unless the user explicitly requests both.
