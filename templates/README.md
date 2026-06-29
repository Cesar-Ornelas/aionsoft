# Project Templates

This directory contains starter templates used to bootstrap new Aionsoft projects.

## What belongs here

- Templates intended to be copied or generated into new projects.
- Opinionated defaults for stack, structure, and conventions.
- Minimal docs needed to choose and start the right template quickly.

## What does not belong here

- Live production apps (those belong in `apps/`).
- Shared runtime libraries (those belong in `packages/`).
- Infra deployment definitions (those belong in `infra/`).

## Template types

- `astro`: static or mostly static websites with little to no custom backend logic.
- `svelte-kit`: dynamic apps with authenticated flows, form input, and server-side processing.
- `minimal-api`: backend APIs built with ASP.NET Core Minimal API.

## Workspace boundary

Templates are intentionally kept outside Bun workspaces for now.

Current root workspaces remain:
- `apps/*`
- `packages/*`

This avoids coupling template scaffolds to production dependency and build flows.

## Future automation convention

If/when template automation is added at the root, use script naming:

- `template:astro:<action>`
- `template:svelte-kit:<action>`
- `template:minimal-api:<action>`

Example actions: `new`, `validate`, `sync`.
