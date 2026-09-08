# Aionsoft Repository Instructions

- Before changing an app, read its nearest `ai-workspace.yaml` when present and use the declared profiles, skills, validation commands, and variables as project context.
- When an app manifest defines `features`, select the feature named by the request or inferred from its owned paths. Load that feature's context and declared shared context only; do not preload unrelated feature context.
- Every manifest feature must have one concise context document at `ai/features/<feature>.md`. Create that document and its manifest entry before implementing a new feature.
- Treat feature context documents as living contracts: when a change alters a feature's purpose, vocabulary, ownership, boundaries, invariants, routes, data contracts, or validation, update the feature document in the same change. Do not use it as a task log or duplicate routine implementation details.
- For persistence, identity, files, realtime, or provider integrations, follow `specs/data-access.md`: feature code depends on provider-neutral ports and services, while provider SDKs stay in server-only adapters, infrastructure, or composition.
- Treat this repository as a Bun monorepo. Use `bun` and existing root scripts instead of introducing another package manager.
- Group root scripts by application using `<app>:<operation>` and `<app>:infra:<operation>` naming.
- Keep changes scoped to the owning app or package; place genuinely reusable code in `packages/`.
- Follow existing local patterns before introducing dependencies or abstractions.
- Keep secrets and server-only behavior out of browser code. Configure credentials through environment variables.
- Update `specs/` when product behavior, architecture, data contracts, or operating assumptions change.
- Do not modify generated `build/` or `.svelte-kit/` output directly.
- Run the narrowest relevant validation first, then run the owning app's build before completion.
- Preserve unrelated work in the repository and avoid broad formatting changes.
