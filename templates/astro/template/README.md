# __PROJECT_NAME__

Astro static website created from the Aionsoft private template package.

## Stack

- Astro 7
- Tailwind CSS 4
- TypeScript 6

## Development

```bash
bun install
bun run dev
```

## Build

```bash
bun run build
bun run preview
```

## Project guidance

- `AGENTS.md` contains AI collaboration rules for the project.
- `specs/architecture.md` defines the app structure and delivery expectations.
- `specs/content-and-seo.md` defines content, metadata, and launch requirements.

## Swetrix analytics (optional)

The layout includes built-in Swetrix wiring that is activated only when `PUBLIC_SWETRIX_PROJECT_ID` is set.

1. Copy environment example:

```bash
cp .env.example .env
```

2. Set your project id:

```bash
PUBLIC_SWETRIX_PROJECT_ID=YOUR_PROJECT_ID
```

3. Optional: override URLs if you use a custom Swetrix endpoint.

If `PUBLIC_SWETRIX_PROJECT_ID` is empty, no Swetrix script is loaded.
