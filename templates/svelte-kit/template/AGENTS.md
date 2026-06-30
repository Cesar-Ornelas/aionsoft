# Project Guidance

This project is generated from the Aionsoft SvelteKit template.

## Working rules

- Preserve SvelteKit as the primary framework unless there is an explicit migration decision.
- Use Tailwind utilities and shared theme tokens before adding bespoke CSS patterns.
- Keep server-side logic under `src/lib/server/` and avoid leaking secrets to client routes.
- Keep analytics and integration credentials environment-driven (`PUBLIC_SWETRIX_*`, server env vars).
- Use Drizzle ORM as the default persistence layer for PostgreSQL-backed features.
- Update `specs/` when architecture, product behavior, or operating assumptions change.

## Architecture expectations

- `src/routes/` holds route entry points and layout composition.
- `src/lib/components/` holds reusable UI building blocks.
- `src/lib/server/` holds server-only helpers and business logic.
- `src/lib/server/db/` holds database client and schema definitions.
- `src/app.css` is the Tailwind entrypoint and should remain lean.

## Delivery expectations

- Run `bun run check` and `bun run build` before shipping.
- Add metadata and accessibility checks for all public routes.
- Keep auth/authorization decisions explicit in server code and specs.
