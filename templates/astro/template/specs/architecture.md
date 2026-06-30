# Architecture

## Purpose

This project is a content-first Astro site generated from the Aionsoft template baseline.

## Core stack

- Astro for routing and rendering
- Tailwind CSS for UI styling
- TypeScript for type safety

## Structural rules

- Prefer static rendering and keep runtime JavaScript minimal.
- Keep reusable UI in `src/components/` and shared page shells in `src/layouts/`.
- Keep feature-specific content close to the route or component that owns it.
- Add integrations only when there is a clear operational need.

## Quality rules

- New UI should remain accessible by default.
- SEO metadata must be defined for every public page.
- Performance regressions should be treated as defects, not polish work.