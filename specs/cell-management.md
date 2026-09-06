# Cell Management Workspace

## Purpose

Cell Management owns application access metadata: users, groups, roles, permissions, and their assignments. It is separate from CRM data and from the eventual identity provider.

## Domain Model

- Users have a name, email, optional job title, optional provider subject, and lifecycle state.
- Groups have a name, slug, optional description, and lifecycle state.
- Roles have a name, stable key, optional description, and lifecycle state.
- Permissions have a display name, stable key, optional description/category, and lifecycle state.
- Users and groups are many-to-many.
- Groups and roles are many-to-many.
- Roles and permissions are many-to-many through `management_role_permissions`.

## Lifecycle

Lifecycle states are `active`, `inactive`, and `archived`.

State transitions replace hard deletes. Inactive and archived records remain readable and retain existing relationships, but cannot receive new memberships or assignments.

## Persistence

Cell currently uses PocketBase adapters, but Management domain records and services must not expose PocketBase record shapes or SDK errors. Relation collections are additive and migration-backed.

The legacy `management_roles.permissions` JSON field is retained only as migration input. Migration `002_management_role_permissions` backfills its keys into normalized role-permission records and is idempotent.

## Authorization Boundary

This foundation does not yet enforce request-time permissions. Current-user resolution, provider identity linking, server permission guards, and PocketBase rule alignment are required before Management or CRM mutations are considered production-protected. That work is tracked in the CRM follow-up TODO because it affects shared Cell request handling.

## Validation

- `bun run cell:test:management`
- `bun run cell:build`
- `bun run cell:infra:config`