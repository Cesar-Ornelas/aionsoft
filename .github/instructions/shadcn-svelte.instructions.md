---
name: "Aionsoft shadcn-svelte"
description: "Use when creating, updating, composing, or styling shadcn-svelte components in an app with components.json, especially Admin and Cell."
applyTo:
  - "apps/admin/**/*.{svelte,ts,js,css}"
  - "apps/cell/**/*.{svelte,ts,js,css}"
---

# shadcn-svelte Profile

- Read the owning app's `components.json` before adding or changing UI components.
- Prefer installed shadcn-svelte components and their existing variants before creating custom primitives.
- Use the aliases, style, icon library, registry, and Tailwind CSS path declared in `components.json`.
- Use component barrel exports and composition patterns already present in the owning app.
- Use semantic theme tokens instead of raw colors and preserve light and dark theme behavior.
- Use field, group, title, and accessibility primitives required by the component API.
- Use the repository's `shadcn-svelte` skill for CLI operations, component documentation, updates, and detailed composition rules.
- Review generated source before adapting it; never overwrite customized components without explicit approval.
