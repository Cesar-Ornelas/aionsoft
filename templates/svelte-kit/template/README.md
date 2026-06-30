# __PROJECT_NAME__

SvelteKit app created from the Aionsoft private template package.

## Stack

- SvelteKit 2
- Svelte 5
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
