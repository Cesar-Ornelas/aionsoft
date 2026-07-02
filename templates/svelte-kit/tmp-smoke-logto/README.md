# tmp-smoke-logto

SvelteKit app created from the Aionsoft private template package.

## Stack

- SvelteKit 2
- Svelte 5
- Tailwind CSS 4
- shadcn-svelte baseline
- Drizzle ORM + PostgreSQL baseline
- TypeScript 6

## Development

```bash
bun install
bun run dev
```

## Optional generation features

This project can be scaffolded with optional features at generation time:

```bash
npx @cesar-ornelas/template-svelte-kit my-app --features logto
```

When `logto` is enabled, the generated app includes:

- `@logto/sveltekit`
- `src/hooks.server.ts`
- `src/lib/features/auth-logto/server/config.ts`
- `src/routes/auth/sign-in/+server.ts`
- `src/routes/auth/sign-out/+server.ts`
- Logto env placeholders in `.env.example`

## shadcn-svelte AI skill (optional)

If you use Copilot skills, install the shadcn-svelte skill in this project:

```bash
bun x skills add huntabyte/shadcn-svelte
```

Then restart your editor session so the skill is discovered.

## Design system configuration

This template ships with shadcn-svelte preconfigured.

- `components.json` stores builder-style choices such as `style`, `baseColor`, `iconLibrary`, `menuColor`, and `menuAccent`.
- `src/app.css` stores theme tokens such as fonts, radius, surface colors, and chart colors.
- `src/lib/utils.ts` provides the shared `cn()` helper used by shadcn components.

Current default baseline:

- style: `nova`
- base color: `neutral`
- icon library: `lucide`
- menu: `default`
- menu accent: `subtle`

If you generate a preset from the shadcn-svelte website builder, copy the structural settings into `components.json` and the theme token changes into `src/app.css`.

Current font setup:

- body: `DM Sans`
- headings: `Noto Sans`

## Build

```bash
bun run build
bun run preview
```

## Database baseline

This template includes a Drizzle ORM + PostgreSQL baseline.

Included files:

- `drizzle.config.ts`
- `src/lib/server/db/index.ts`
- `src/lib/server/db/schema/`
- `.env.example` with `DATABASE_URL`

Initial setup:

```bash
cp .env.example .env
```

Set your database connection string:

```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/tmp-smoke-logto
```

Drizzle commands:

```bash
bun run db:generate
bun run db:migrate
bun run db:studio
```

The template includes a minimal `app_settings` table as a starting point. Add new schemas under `src/lib/entities/<entity>/model/schema.ts`.

## Feature-Sliced architecture baseline

This template is organized with Feature-Sliced Design defaults:

- `src/lib/widgets/` for page-building blocks
- `src/lib/features/` for user workflows
- `src/lib/entities/` for business entities and persistence
- `src/lib/shared/` for generic utilities and technical infrastructure

Dependency direction is enforced with a boundary check script:

```bash
bun run lint:boundaries
```

The default reference slice demonstrates entity-owned persistence:

- `src/lib/entities/app-settings/model/schema.ts`
- `src/lib/entities/app-settings/server/repository.ts`
- `src/lib/features/settings-health/server/get-settings-health.ts`
- `src/lib/widgets/home-dashboard/ui/HomeDashboard.svelte`

`src/lib/server/db/` remains as a compatibility shim for older imports, but new code should use `src/lib/shared/server/db/client.ts` and entity-owned models.

## Project guidance

- `AGENTS.md` contains AI collaboration rules for the project.
- `specs/architecture.md` defines structure and delivery expectations.
- `specs/product-and-content.md` defines baseline product/content requirements.

## Swetrix analytics (optional)

The root layout includes built-in Swetrix wiring activated only when `PUBLIC_SWETRIX_PROJECT_ID` is set.

```bash
cp .env.example .env
```

Then set:

```bash
PUBLIC_SWETRIX_PROJECT_ID=YOUR_PROJECT_ID
```
