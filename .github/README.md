# Aionsoft AI Workspace

This directory contains team-shared AI guidance for this repository. Keep guidance concise, actionable, and version-controlled with the code it governs.

## Structure

| Path | Purpose |
| --- | --- |
| `copilot-instructions.md` | Small set of rules that apply to all repository work |
| `instructions/` | Technology or path-specific rules loaded when relevant |
| `agents/` | Focused role profiles with limited tools and clear outputs |
| `skills/` | Repeatable, multi-step workflows with optional references and scripts |
| `prompts/` | Focused, parameterized one-time tasks |
| `ai-workspace.schema.json` | Schema for per-project `ai-workspace.yaml` manifests |

## Choosing a Format

- Add an always-applicable rule to `copilot-instructions.md`.
- Add technology or file-specific guidance as `instructions/<topic>.instructions.md`.
- Add a specialist role as `agents/<role>.agent.md`.
- Add a repeatable procedure as `skills/<skill-name>/SKILL.md`.
- Add a single focused command as `prompts/<task>.prompt.md`.

Avoid duplicating product documentation here. Keep product and architecture decisions in [`specs/`](../specs/) and link to them from AI guidance when needed.

## Composing Technology Profiles

Instructions compose automatically based on the files involved in a task. Keep common framework rules separate from backend or application-specific choices.

| Work area | Instructions applied |
| --- | --- |
| `apps/admin/` or `apps/portal/` | Repository + SvelteKit + PostgreSQL/Logto |
| `apps/cell/` | Repository + SvelteKit + PocketBase |
| Future C# app under `apps/` | Repository + .NET |

Use instruction files for technology selection because their `applyTo` patterns activate from file paths. Use agent profiles for roles such as architecture review, security review, or implementation planning.

Each app may also declare its intended combination in `apps/<app>/ai-workspace.yaml`. The manifest is an Aionsoft convention rather than a native Copilot format; the repository instructions and `bootstrap-ai-workspace` skill make it part of the AI workflow.

## Feature Context

Large apps can declare `features` in their manifest. Each feature points to a short context document and its owned paths, allowing an agent working on Billing to avoid loading CRM details. Shared paths and dependent features are loaded only when the requested change crosses those boundaries.

Keep feature context under `apps/<app>/ai/features/`. Add an entry when a feature has a real domain boundary; do not create one for every route or component.

## Data Portability

[`specs/data-access.md`](../specs/data-access.md) defines the repository's provider-neutral data architecture. Features own their models, ports, services, and provider adapters. Use the `data-portability` profile and `provider-neutral-data-layer` skill for persistence, identity, files, realtime, migrations, and provider changes.

## Maintenance

- Update guidance in the same pull request as a new convention or architectural decision.
- Use specific discovery descriptions beginning with "Use when".
- Keep one concern per instruction, agent, or skill.
- Test commands before documenting them.
- Remove rules that are obsolete or already enforced by tooling.
