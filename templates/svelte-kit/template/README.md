# __PROJECT_NAME__

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
DATABASE_URL=postgresql://postgres:password@localhost:5432/__PROJECT_NAME__
```

Drizzle commands:

```bash
bun run db:generate
bun run db:migrate
bun run db:studio
```

The template includes a minimal `app_settings` table as a starting point. Extend `src/lib/server/db/schema/` with your project tables.

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
