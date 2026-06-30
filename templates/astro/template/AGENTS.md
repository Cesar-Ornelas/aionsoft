# Project Guidance

This project is generated from the Aionsoft Astro template.

## Working rules

- Preserve Astro as the primary framework unless there is an explicit migration decision.
- Use Tailwind utilities and project-level tokens before introducing ad hoc CSS files.
- Keep pages content-first, fast, and accessible.
- Prefer static rendering by default; add client-side interactivity only when justified.
- When adding a feature, update the relevant file in `specs/` if project behavior or requirements change.

## Architecture expectations

- `src/layouts/` holds reusable page shells.
- `src/components/` holds reusable presentational building blocks.
- `src/pages/` holds route files.
- `src/styles/` holds global Tailwind entrypoints or very small shared styles only.
- `public/` holds static assets.

## Delivery expectations

- Keep Lighthouse performance and accessibility in good standing.
- Add metadata, canonical URLs, and social cards before launch.
- Document non-obvious project decisions in `specs/architecture.md`.
- Keep analytics configuration environment-driven (for example `PUBLIC_SWETRIX_*`), never hardcoded.