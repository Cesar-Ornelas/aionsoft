---
name: "Aionsoft PocketBase"
description: "Use when developing the Cell application, PocketBase collections, migrations, authentication, data access, setup, or server routes."
applyTo: "apps/cell/**/*.{js,ts,svelte}"
---

# PocketBase Profile

- Use the existing PocketBase client helpers under `apps/cell/src/lib/server/` instead of creating clients throughout route code.
- Keep administrator credentials and privileged collection operations in server-only modules.
- Model collection setup and schema evolution through the existing bootstrap and migration workflow.
- Make collection rules and authorization checks explicit; do not rely on UI visibility for access control.
- Keep route handlers focused on HTTP concerns and move reusable PocketBase operations into the owning server module.
- Do not introduce PostgreSQL, Drizzle, or Logto into Cell unless an approved architecture change requires them.
- Validate changes with Cell's focused checks and `bun run cell:build` from the repository root.
