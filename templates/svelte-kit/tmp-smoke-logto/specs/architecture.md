# Architecture

## Purpose

This project is a dynamic SvelteKit application generated from the Aionsoft template baseline.

## Core stack

- SvelteKit for routing, rendering, and server handlers
- Tailwind CSS for UI styling
- Drizzle ORM for schema and query management
- PostgreSQL as the default relational database
- TypeScript for type safety and maintainability

## Feature-Sliced layer model

- `app`: app-wide setup and cross-cutting initialization.
- `pages`: route-level composition and page orchestration.
- `widgets`: reusable page blocks composed from features/entities.
- `features`: user interactions and workflow logic.
- `entities`: business entities, domain contracts, and persistence ownership.
- `shared`: generic utilities and technical infrastructure.

Dependency direction is one-way only:

- `app -> pages -> widgets -> features -> entities -> shared`

Layers must never import upward.

## Structural rules

- Keep route files thin; push workflows into `features` and persistence into `entities`.
- Expose each slice via a public API barrel (`index.ts`) and prefer those imports cross-layer.
- Keep environment and integration configuration explicit and documented.
- Keep database client bootstrap in `src/lib/shared/server/db/client.ts`.
- Keep schemas and repositories with the owning entity under `src/lib/entities/<entity>/`.
- Keep `src/lib/server/db/` only as a compatibility shim for legacy imports.

## Reference slice included

- Entity: `app-settings`
	- Schema: `src/lib/entities/app-settings/model/schema.ts`
	- Repository: `src/lib/entities/app-settings/server/repository.ts`
- Feature: `settings-health`
	- Server workflow: `src/lib/features/settings-health/server/get-settings-health.ts`
	- UI: `src/lib/features/settings-health/ui/SettingsHealthCard.svelte`
- Widget: `home-dashboard`
	- Composition UI: `src/lib/widgets/home-dashboard/ui/HomeDashboard.svelte`
- Route composition:
	- `src/routes/+page.server.ts` orchestrates load
	- `src/routes/+page.svelte` composes widget only

## Optional features at generation time

- `--features logto` adds a minimal auth slice and route endpoints:
	- `src/lib/features/auth-logto/server/config.ts`
	- `src/hooks.server.ts`
	- `src/routes/auth/sign-in/+server.ts`
	- `src/routes/auth/sign-out/+server.ts`
- Logto-specific env variables are only added when this feature is enabled.

## Quality rules

- Accessibility is a default requirement, not a stretch goal.
- Metadata should be configured per route for discoverability.
- Performance regressions should be treated as defects.
