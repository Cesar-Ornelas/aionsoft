# Project Guidance

This project is generated from the Aionsoft SvelteKit template.

## Working rules

- Preserve SvelteKit as the primary framework unless there is an explicit migration decision.
- Use Tailwind utilities and shared theme tokens before adding bespoke CSS patterns.
- Keep server-side logic under `src/lib/server/` and avoid leaking secrets to client routes.
- Keep analytics and integration credentials environment-driven (`PUBLIC_SWETRIX_*`, server env vars).
- Use Drizzle ORM as the default persistence layer for PostgreSQL-backed features.
- Update `specs/` when architecture, product behavior, or operating assumptions change.

## Feature-Sliced defaults

- Treat routes as composition points, not owners of business logic.
- Keep dependency flow one-way: `app -> pages -> widgets -> features -> entities -> shared`.
- Import across layers using each slice public API (`index.ts`) instead of deep internals.
- Keep entity persistence contracts with the owning entity slice (`src/lib/entities/<entity>/server`).
- Keep only technical infrastructure in shared server code (`src/lib/shared/server`).
- Optional auth scaffolding can be generated with `--features logto`; keep auth server logic inside `src/lib/features/auth-logto/server/`.

## Architecture expectations

- `src/routes/` holds route entry points and thin composition.
- `src/lib/widgets/` holds UI blocks assembled from features/entities.
- `src/lib/features/` holds user workflows and interaction logic.
- `src/lib/entities/` holds domain models and persistence boundaries.
- `src/lib/shared/` holds generic utilities and technical infrastructure.
- `src/lib/server/db/` remains as a compatibility shim for older imports.
- `src/app.css` is the Tailwind entrypoint and should remain lean.

## Delivery expectations

- Run `bun run check` and `bun run build` before shipping.
- Add metadata and accessibility checks for all public routes.
- Keep auth/authorization decisions explicit in server code and specs.
