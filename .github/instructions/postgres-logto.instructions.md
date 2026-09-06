---
name: "Aionsoft PostgreSQL and Logto"
description: "Use when developing persistence, authentication, authorization, migrations, or server features in the Admin and Portal SvelteKit applications."
applyTo:
  - "apps/admin/**/*.{js,ts,svelte}"
  - "apps/portal/**/*.{js,ts,svelte}"
---

# PostgreSQL and Logto Profile

- Use PostgreSQL as the primary relational database and follow the owning app's established persistence patterns.
- Use Drizzle ORM for new schema definitions, queries, and migrations when adding relational persistence.
- Use Logto as the identity and session provider through `@logto/sveltekit`.
- Keep application roles and permissions in the owning application's database rather than encoding product authorization in Logto.
- Link local users to stable Logto user identifiers without leaking provider-specific fields into unrelated domain models.
- Keep database access, Logto secrets, and Management API credentials in server-only modules.
- Make schema and authorization changes explicit in the relevant document under `specs/`.
