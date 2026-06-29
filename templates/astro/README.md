# Astro Template

Installable private npm package that scaffolds a static Astro site starter.

## Package identity

- Name: `@aionsoft/template-astro`
- Binary: `create-aionsoft-astro`
- Registry target: GitHub Packages (`https://npm.pkg.github.com`)

## Generate a project

```bash
npx @aionsoft/template-astro my-site
# or
npx @aionsoft/template-astro my-site --name my-site
```

Then run:

```bash
cd my-site
bun install
bun run dev
```

## Template contents

The generated project includes:

- Astro + TypeScript starter config
- basic layout and landing page
- global styles with a clean static-site baseline
- placeholder README and robots file

## Local package checks

```bash
cd templates/astro
npm pack
node ./bin/create-aionsoft-astro.mjs ./tmp-smoke --force
```

## Publish to GitHub Packages

1. Authenticate npm to GitHub Packages for your org scope.
2. Ensure package scope matches your GitHub org (`@aionsoft`).
3. From `templates/astro`, run:

```bash
npm publish
```

## Use this template when

- you need a static or mostly static website
- you do not need heavy authenticated app workflows
- you want minimal backend complexity
