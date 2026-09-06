---
name: aionsoft-feature-delivery
description: "Plan, implement, and validate a feature in an Aionsoft app or shared package. Use for application features, routes, data models, integrations, and cross-layer changes in this monorepo."
argument-hint: "Describe the feature, owning app, and acceptance criteria"
user-invocable: true
---

# Aionsoft Feature Delivery

Use this workflow for feature work that spans more than a trivial local edit.

## Procedure

1. Identify the owning app, existing behavior, acceptance criteria, and closest implementation pattern.
2. Read the relevant document under `specs/`; update it when behavior or architecture changes.
3. For persistence, identity, files, realtime, or provider integrations, load the `provider-neutral-data-layer` skill and follow `specs/data-access.md`.
4. Trace the smallest controlling code path from route or UI entry point to domain and persistence ownership.
5. State one falsifiable implementation hypothesis and choose the cheapest check that could disprove it.
6. Implement the smallest complete vertical change using existing repository patterns.
7. Keep authentication, authorization, validation, and secrets on the server side.
8. Add focused tests or checks proportional to the behavior and blast radius.
9. Run the narrowest relevant validation, followed by `bun run <app>:build` for an application change.
10. Report changed behavior, validation results, and any remaining operational or migration step.

## Architecture Defaults

- Apps own product behavior and app-specific persistence.
- `packages/` contains code with demonstrated reuse across applications.
- SvelteKit routes compose behavior; reusable logic belongs under `src/lib/`.
- Feature data and identity access use provider-neutral ports with server-only provider adapters.
- PostgreSQL-backed adapters use established Drizzle patterns where available.
- Each app owns its authorization rules independently of its identity provider.
- Infrastructure changes stay under the corresponding `infra/<app>/` directory.

## Completion Checklist

- Acceptance criteria are implemented.
- Failure and empty states are handled.
- Authorization boundaries are explicit.
- Schema, environment, and deployment changes are documented.
- Relevant specs are current.
- Focused validation and the owning app build pass.