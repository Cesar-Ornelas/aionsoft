# Astro Static Site Template

Use this template for marketing pages, landing sites, docs sites, and other mostly static experiences.

## Recommended stack

- Astro (latest stable)
- TypeScript
- Content collections (optional)
- Minimal client-side islands only when needed

## Default structure blueprint

```text
astro/
  src/
    components/
    layouts/
    pages/
    content/
    styles/
  public/
  astro.config.mjs
  package.json
  tsconfig.json
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

- Set site metadata (title, description, canonical URL).
- Add sitemap and robots configuration.
- Add analytics and privacy-safe tracking only if required.
- Verify Lighthouse performance and accessibility.
- Keep JavaScript islands minimal.

## Use this template when

- You do not need heavy authenticated user flows.
- Most content is static or CMS-driven.
- You want fast pages and simple deployment.
