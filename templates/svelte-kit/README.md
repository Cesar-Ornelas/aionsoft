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
```

Then run:

```bash
cd my-app
bun install
bun run dev
```

The generated app includes Tailwind CSS 4, optional Swetrix analytics wiring, and starter AI guidance/spec files.

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
