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

## Optional auth at generation time

- `--auth logto` adds a minimal auth slice and route endpoints:
	- `src/lib/features/auth-logto/server/config.ts`
	- `src/hooks.server.ts`
	- `src/routes/auth/sign-in/+server.ts`
	- `src/routes/auth/sign-out/+server.ts`
	- request authz context baseline:
		- `src/lib/features/authorization-rbac/server/current-request-user.ts`
		- `src/lib/features/authorization-rbac/server/permissions.ts`
		- `src/app.d.ts` locals contract (`currentAppUser`, `sessionUserKey`)
	- RBAC starter schema and helpers:
		- `src/lib/entities/access-control/model/schema.ts`
		- `src/lib/entities/access-control/model/types.ts`
		- `src/lib/features/authorization-rbac/server/permissions.ts`
- Logto-specific env variables are only added when this auth mode is enabled.

## Request user context contract

The generated auth baseline resolves a request-scoped user authorization object once in hooks and makes it available to all server handlers.

Contract intent:
- `locals.user` is identity/session input from Logto
- `locals.currentAppUser` is app-local authorization context (`id`, `logtoUserId`, `roleIds`, `permissionKeys`)
- `locals.sessionUserKey` is a lightweight identity marker for request/session correlation

Usage rule for new features:
- in `+page.server`, `+layout.server`, and `+server` handlers, call guard helpers from `src/lib/features/authorization-rbac/server/permissions.ts`
- avoid direct per-route identity-to-permission lookup logic
- treat DB role/permission assignments as the source of truth

## Notifications center

The template includes a global notifications center opened from a single `Notifications` menu item in the app sidebar.

Current behavior:
- opens in a right-side sheet from the root layout
- loads persisted notifications for the current user context (user-scoped + global)
- supports list, read-state filter, mark-one-read, mark-all-read, and delete
- uses standard server actions/endpoints and does not depend on live push updates

Ownership and contracts:
- entity schema and persistence live under `src/lib/entities/notifications/`
- feature publishers must call `publishNotification()` from the notifications entity barrel instead of writing direct DB queries in route files
- notifications actions are handled by `src/routes/notifications/+server.ts`

Publish contract guidance:
- include clear `title` + `message`
- set `recipientScope` to `global` for broad operational events and `user` with `recipientUserId` for actor-targeted events
- prefer including an `actionHref` to help users jump to relevant screens

## Quality rules

- Accessibility is a default requirement, not a stretch goal.
- Metadata should be configured per route for discoverability.
- Performance regressions should be treated as defects.
