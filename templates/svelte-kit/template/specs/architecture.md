# Architecture

## Purpose

This project is a dynamic SvelteKit application generated from the Aionsoft template baseline.

## Core stack

- SvelteKit for routing, rendering, and server handlers
- Tailwind CSS for UI styling
- TypeScript for type safety and maintainability

## Structural rules

- Keep domain logic server-first when security or data integrity matters.
- Keep presentational components reusable and route pages focused on composition.
- Keep environment and integration configuration explicit and documented.

## Quality rules

- Accessibility is a default requirement, not a stretch goal.
- Metadata should be configured per route for discoverability.
- Performance regressions should be treated as defects.
