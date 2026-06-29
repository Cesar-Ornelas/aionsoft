# SvelteKit Dynamic App Template

Use this template for application-style products with forms, auth, role-aware routing, and server-side processing.

## Recommended stack

- SvelteKit (latest stable)
- TypeScript
- PostgreSQL
- Drizzle ORM
- Logto auth integration (for authenticated apps)

## Default structure blueprint

```text
sveltekit-dynamic-app/
  src/
    lib/
      server/
      components/
      stores/
    routes/
    app.css
    app.html
    hooks.server.ts
  static/
  drizzle/
  svelte.config.js
  vite.config.ts
  package.json
```

## First-run commands

```bash
# from a generated project directory
bun install
bun run dev
bun run build
bun run preview
```

## Minimum checklist

- Define auth model and protected route boundaries.
- Define database schema and migration flow.
- Add server-side authorization checks for critical actions.
- Add baseline observability/logging for API and auth failures.
- Validate light/dark theme parity if app has operator-facing UI.

## Use this template when

- The project includes user workflows and stateful interactions.
- You need server-side business logic.
- You expect frequent feature additions over time.
