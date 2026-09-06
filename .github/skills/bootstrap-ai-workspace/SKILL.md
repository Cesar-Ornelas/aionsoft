---
name: bootstrap-ai-workspace
description: "Create, validate, or update an ai-workspace.yaml project manifest and its reusable AI profiles. Use when bootstrapping AI guidance for an app, selecting technology profiles, configuring project skills, or defining validation commands."
argument-hint: "Provide the app path and its technology stack"
user-invocable: true
---

# Bootstrap AI Workspace

Create or update a project's `ai-workspace.yaml` so AI-assisted work uses explicit technology and validation context.

## Manifest Location

- For an app in this monorepo, use `apps/<app>/ai-workspace.yaml`.
- For a standalone repository, use `ai-workspace.yaml` at the repository root.
- Point YAML tooling to [`../../ai-workspace.schema.json`](../../ai-workspace.schema.json), adjusting the relative path when necessary.

## Procedure

1. Inspect the target project's package manifest, framework configuration, infrastructure, persistence, and component configuration.
2. Read any existing `ai-workspace.yaml`; preserve project-specific variables and commands unless they are obsolete.
3. Select only profiles supported by repository evidence.
4. Confirm each profile has a matching `.github/instructions/<profile>.instructions.md` file or document an intentional mapping.
5. Select only skills available under `.github/skills/` or `.agents/skills/`.
6. Add focused validation commands that can run from the repository root.
7. Set `initialize_work_state: true` when agents should establish task scope and current repository state before editing.
8. Validate the YAML against `.github/ai-workspace.schema.json` and verify that referenced profiles and skills exist.

## Feature Context

For applications with multiple business domains, add `features` entries that declare concise context documents and code ownership paths. Use the `feature-context` skill to select them per request. Do not place all feature documentation in the app-level manifest.

Each feature should define:

- `description`: selection-oriented summary using domain vocabulary
- `context`: short, curated feature documents
- `owned_paths`: code primarily owned by the feature
- `shared_context`: optional shared boundaries loaded only when relevant
- `depends_on`: optional feature contracts needed by this feature
- `validation_commands`: focused commands for the feature
- `variables`: optional stable feature-specific values

## Profile Selection

Profiles describe technologies and constraints. They compose; they are not exclusive presets.

- `bun`: Bun package management and workspace conventions
- `sveltekit`: shared SvelteKit application rules
- `tailwindcss`: Tailwind styling and theme conventions
- `shadcn-svelte`: shadcn-svelte composition and component configuration
- `pocketbase`: PocketBase persistence and server access
- `postgres-logto`: PostgreSQL, Drizzle, and Logto conventions
- `docker-compose`: application infrastructure and Compose conventions
- `dotnet`: .NET and ASP.NET Core conventions
- `data-portability`: provider-neutral models, ports, adapters, capabilities, and testing

## Skill Selection

Skills describe workflows. A profile should not be listed as a skill.

- `bootstrap-ai-workspace`: maintain this manifest and its profile mappings
- `aionsoft-feature-delivery`: implement a feature end to end
- `shadcn-svelte`: manage or compose shadcn-svelte components
- `feature-context`: select only the relevant feature context within an app
- `provider-neutral-data-layer`: design or migrate feature data and identity access across providers

Do not list aspirational skills such as `diagnose-bug` or `testing` until a matching skill directory exists.
