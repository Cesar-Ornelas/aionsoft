---
name: "Aionsoft SvelteKit"
description: "Use when developing SvelteKit applications, routes, server logic, persistence, authentication, or UI in apps/ and packages/ui."
applyTo: "apps/**/*.{js,ts,svelte,css}, packages/ui/**/*.{js,ts,svelte,css}"
---

# SvelteKit Engineering Rules

- Use Svelte 5 and SvelteKit patterns already present in the owning application.
- Keep routes focused on request handling and composition; move reusable domain logic into `src/lib/`.
- Put secrets, privileged integrations, and persistence code in server-only modules.
- Follow the owning app's backend-specific instruction profile for persistence and authentication.
- Keep authorization decisions explicit on the server regardless of authentication provider.
- Prefer shared theme tokens, Tailwind utilities, and existing shadcn-svelte components before custom UI primitives.
- Use Lucide icons for familiar actions and provide accessible labels for icon-only controls.
- Keep public routes accessible and supply appropriate page metadata.
- Validate changes with the owning app's available checks and `bun run <app>:build` from the repository root.
