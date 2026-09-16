# Management Feature Context

## Purpose

Management owns Cell users, groups, roles, permissions, authorization relationships, and its PocketBase migration history.

## Current Ownership

- `src/lib/management/` owns collection definitions and feature-level constants.
- `src/lib/management/model/` owns provider-neutral Management records, commands, and stable data-access errors.
- `src/lib/management/server/ports/` owns provider-neutral authorization and identity contracts.
- `src/lib/server/management-bootstrap.js` owns collection setup and bootstrap behavior.
- `src/lib/server/management-migrations.js` owns management migration definitions.
- `src/routes/management/` owns management pages and HTTP handlers.
- `/management/configuration` owns workspace configuration, including reusable global document variables.
- `src/lib/server/pocketbase.js` provides shared PocketBase client access.

## Boundaries

- Management does not own CRM contacts, organizations, opportunities, or activities.
- Routes and services must not depend on PocketBase record shapes or SDK errors.
- Identity operations use the identity port; PocketBase administrator authentication remains server infrastructure.
- Authorization must be enforced in server handlers and PocketBase rules, not only in UI navigation.
- Shared setup may call management bootstrap, but CRM code must not absorb management models.

## Working Guidance

- Read this file and the paths declared for `features.management` in `ai-workspace.yaml` first.
- Open CRM context only when shared setup or cross-feature authorization requires it.
- Keep new management routes and persistence definitions inside the declared ownership paths.

## Management Foundation

- Users are provider-neutral application records with name, email, job title, and lifecycle state. Provider identity links remain optional capabilities and are not part of the domain contract.
- Users may belong to many groups, groups may have many roles, and roles may have many permissions.
- Permissions have a display name and stable policy key such as `manage:accounts` or `read:accounts`.
- Users, groups, roles, and permissions use lifecycle states (`active`, `inactive`, or `archived`) instead of hard deletes.
- Inactive or archived records cannot receive new assignments; existing relationships remain available for history.
- Role permissions are normalized through `management_role_permissions`; the legacy role JSON field is migration input only.
- The first implementation adds provider-neutral services and tests before switching every Management route to the new composition boundary.
- Cell authenticates against the PocketBase `users` auth collection. The session token is stored in the `cell_session` HTTP-only cookie, and request-time identity is resolved into `locals.user` through `authRefresh`.
- Protected Cell pages and server endpoints require an authenticated session; `/login` and `/setup` remain public bootstrap routes. UI visibility is not an authorization boundary.
- Global document variables are text values with a unique stable key, display label, optional description, and active/archived lifecycle. They are stored independently from versioned form fields and are available to document editors through the `#variable_key` namespace.
