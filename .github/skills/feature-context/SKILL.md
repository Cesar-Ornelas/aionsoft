---
name: feature-context
description: "Select and load only the relevant feature context from an app's ai-workspace.yaml. Use when a request names a feature such as CRM, billing, management, projects, or notifications, or when work should avoid unrelated application context."
argument-hint: "Name the app, feature, and requested change"
user-invocable: true
---

# Feature Context

Use this workflow to keep feature work focused within a large application.

## Selection Procedure

1. Read the nearest `ai-workspace.yaml`.
2. Select a feature by explicit request name first, then by a matching `owned_paths` entry.
3. Read only the selected feature's `context` documents and the smallest relevant files under `owned_paths`.
4. Read `shared_context` only when the task crosses that boundary.
5. Load a dependency feature from `depends_on` only when its contract is directly involved.
6. Do not preload sibling feature context for general awareness.
7. Use feature `variables` to interpret feature-specific names or boundaries.
8. Run feature `validation_commands` first, followed by app-level validation when required.

## Maintaining Context

- Every manifest feature must have one concise document at `ai/features/<feature>.md`.
- Create the document and manifest entry before implementing a new feature.
- Update the document in the same change when purpose, vocabulary, ownership, boundaries, invariants, routes, data contracts, or validation changes.
- Keep context stable and factual; do not turn it into a task log or copy routine implementation details.

## When No Feature Matches

- Ask for the intended feature when two or more are plausible and the choice changes ownership.
- For genuinely cross-feature work, name each selected feature and explain the boundary being changed.
- For a new feature, create its short context document and manifest entry before broad implementation.

## Context Document Standard

Keep each feature context concise and stable. Include:

- Purpose and domain vocabulary
- Owned code and data
- Explicit non-ownership boundaries
- External or sibling-feature contracts
- Important invariants and security rules
- Feature-specific validation

Do not use feature context as a task log or duplicate implementation details that are easy to discover from code.
