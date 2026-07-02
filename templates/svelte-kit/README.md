# SvelteKit Template

Installable private npm package that scaffolds a dynamic SvelteKit app starter.

## Package identity

- Name: `@cesar-ornelas/template-svelte-kit`
- Binary: `create-aionsoft-svelte-kit`
- Registry target: GitHub Packages (`https://npm.pkg.github.com`)

## Generate a project

```bash
npx @cesar-ornelas/template-svelte-kit my-app
# or
npx @cesar-ornelas/template-svelte-kit my-app --name my-app
# or include optional feature scaffolds
npx @cesar-ornelas/template-svelte-kit my-app --features logto
```

Then run:

```bash
cd my-app
bun install
bun run dev
```

Optional skill setup for AI-assisted UI work:

```bash
cd my-app
bun x skills add huntabyte/shadcn-svelte
```

Then restart your editor session so the skill is discovered.

The generated app includes Tailwind CSS 4, optional Swetrix analytics wiring, and starter AI guidance/spec files.

It also includes a Drizzle ORM + PostgreSQL baseline with a starter schema, database client, and migration config.

It also includes shadcn-svelte baseline configuration, so users can start adding components without running `init` first.

It now includes a Feature-Sliced Design baseline (`widgets`, `features`, `entities`, `shared`) with import-boundary checks and a reference feature slice.

Optional features can be enabled at generation time using `--features`.

Current feature options:

- `logto` - adds Logto auth scaffolding (`@logto/sveltekit`, auth routes, hooks, and Logto env placeholders)

## Design system configuration

The generated SvelteKit app includes:

- `components.json` for shadcn-svelte builder selections such as style, base color, icon library, and menu settings
- `src/app.css` for theme tokens such as radius, fonts, semantic colors, and chart colors
- `src/lib/utils.ts` for the shared `cn()` helper used by shadcn components

Current default profile in the template:

- style: `nova`
- base color: `neutral`
- icon library: `lucide`
- menu: `default`
- menu accent: `subtle`

## Database baseline

The generated SvelteKit app includes:

- `drizzle.config.ts`
- `src/lib/shared/server/db/client.ts`
- `src/lib/entities/app-settings/model/schema.ts`
- `src/lib/entities/app-settings/server/repository.ts`
- `.env.example` with `DATABASE_URL`

Starter commands:

```bash
bun run db:generate
bun run db:migrate
bun run db:studio
```

## Feature-Sliced architecture baseline

Generated apps include:

- `src/lib/widgets/` for page composition blocks
- `src/lib/features/` for user workflows
- `src/lib/entities/` for domain and persistence ownership
- `src/lib/shared/` for generic utilities and technical infrastructure

Dependency direction:

- `app -> pages -> widgets -> features -> entities -> shared`

Boundary validation command:

```bash
bun run lint:boundaries
```

## Local package checks

```bash
cd templates/svelte-kit
npm pack
node ./bin/create-aionsoft-svelte-kit.mjs ./tmp-smoke --force
```

## Publish to GitHub Packages

1. Authenticate npm to GitHub Packages for your org scope.
2. Ensure package scope matches your GitHub owner/org.
3. From `templates/svelte-kit`, run:

```bash
npm publish
```

## Use this template when

- the project includes user workflows and stateful interactions
- you need server-side business logic
- you want SvelteKit with a standardized delivery baseline
