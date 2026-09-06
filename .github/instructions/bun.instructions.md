---
name: "Aionsoft Bun"
description: "Use when changing package manifests, workspace dependencies, Bun scripts, lockfiles, or JavaScript and TypeScript tooling."
applyTo:
  - "package.json"
  - "apps/*/package.json"
  - "packages/*/package.json"
  - "templates/*/package.json"
  - "bun.lock"
---

# Bun Profile

- Use Bun as the package manager and script runner.
- Install dependencies in the narrowest owning workspace.
- Preserve workspace dependency references such as `workspace:*`.
- Group root scripts by application using `<app>:<operation>` and `<app>:infra:<operation>`.
- Do not generate npm, pnpm, or Yarn lockfiles.
