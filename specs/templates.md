# Templates Guide

## Purpose

This document explains how to consume and maintain Aionsoft project templates.

Current template directories:
- `templates/astro`
- `templates/svelte-kit`
- `templates/minimal-api`

Current publishable package:
- `@cesar-ornelas/template-astro`

## One-time setup to install private packages

Aionsoft template packages are published to GitHub Packages, not npmjs.

### 1) Create a GitHub token with package read access

Use a personal access token that can read packages for the owner namespace.

Recommended permissions:
- `read:packages`
- `repo` only if your org policy requires it for private package access

### 2) Configure npm to use GitHub Packages for the owner scope

Add this to your global npm config at `~/.npmrc`:
```shell
cat >> ~/.npmrc <<'EOF'
heredoc> @cesar-ornelas:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}
always-auth=true
EOF
```

```ini
@cesar-ornelas:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}
always-auth=true
```

Then set your token in shell startup or current terminal:

```bash
export GITHUB_PACKAGES_TOKEN=YOUR_TOKEN_HERE
```

```zsh
echo 'export GITHUB_PACKAGES_TOKEN=YOUR_TOKEN_HERE' >> ~/.zshrc
source ~/.zshrc
```


Alternative (without env var): run `npm login --registry=https://npm.pkg.github.com --scope=@cesar-ornelas`.

### 3) Verify access

```bash
npm view @cesar-ornelas/template-astro version --registry=https://npm.pkg.github.com
```

If this succeeds, package install and `npx` should work.

## How to scaffold an Astro site from template package

Run from any parent directory where you want the project created:

```bash
npx @cesar-ornelas/template-astro my-site
```

Equivalent binary usage:

```bash
npx create-aionsoft-astro my-site
```

Then start development:

```bash
cd my-site
bun install
bun run dev
```

## Post-generation checklist

After scaffolding:
- Update project name and metadata.
- Update site URL in `astro.config.mjs`.
- Replace starter content in `src/pages/index.astro`.
- Add analytics, SEO, and content structure as needed.

## Troubleshooting

### 403 permission_denied on publish or install

Common causes:
- Wrong scope in package name (must match owner namespace, here `@cesar-ornelas`).
- Missing token permissions for packages.
- Using old workflow run tied to an old tag/commit.

### Workflow rerun still uses old scope

If a run was triggered from an older tag, rerunning that job uses the same old commit.
Use one of these instead:
- manual workflow dispatch on latest commit
- new tag on latest commit

## Maintainer notes: publishing Astro template

Workflow file:
- `.github/workflows/astro-template.yml`

Behavior:
- Validates on changes under `templates/astro/**`.
- Builds a real tarball and uploads artifact.
- Publishes to GitHub Packages on:
  - tags matching `astro-template-v*`, or
  - manual dispatch with `publish=true`.
