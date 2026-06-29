# Architecture Overview

## Purpose

This repository is the Aionsoft monorepo for marketing and operational applications.

It currently contains:
- `website` — the public marketing and informational site
- `portal` — an authenticated operational app
- `admin` — an authenticated management app

This document defines the baseline architecture decisions for current and future apps so implementation stays consistent across the repo.

---

## Core Stack Decisions

### Frontend / App Runtime

- All Aionsoft apps use **SvelteKit**.
- Shared SvelteKit and Vite conventions live in `packages/config`.
- Shared UI primitives live in `packages/ui`.
- Shared non-UI utilities live in `packages/shared`.

### UI Theming

- Dynamic admin-facing surfaces must support both light mode and dark mode as first-class states.
- New route work should not ship with light-only shells, cards, tables, drawers, dialogs, or forms.
- UI updates should extend the existing theme vocabulary already in the app instead of introducing one-off color systems.
- Prefer the existing neutral slate surfaces, borders, text ramps, and accent treatments already established in the app.
- When a surface uses semantic color, the dark-mode variant should preserve the same meaning and hierarchy rather than switching to unrelated colors.
- Shared or repeated UI should prefer app-level tokens, existing utility patterns, or shared primitives before adding new color combinations.
- Visual changes should be reviewed in both themes so layout, contrast, hover states, and overlays remain coherent.

### Data Layer

- All dynamic apps use **PostgreSQL** as the primary relational database.
- All dynamic apps use **Drizzle ORM** for schema definition, queries, and migrations.
- Drizzle is the standard ORM for:
  - application tables
  - role and permission tables
  - user linkage tables
  - app-specific operational data

### Authentication

- All authenticated apps use **Logto** for authentication.
- Authenticated apps integrate with Logto using `@logto/sveltekit`.
- Logto is the identity provider and session authority.
- `portal` and `admin` already use a Logto SvelteKit hook and server-side protected routes.

### Workspace Model

- The repo uses **Bun workspaces**.
- Application packages live under `apps/*`.
- Shared packages live under `packages/*`.

### Template Model

- Project starter templates live under `templates/*`.
- Current template categories:
  - `templates/astro`
  - `templates/svelte-kit`
  - `templates/minimal-api`
- Templates are reference scaffolds and are intentionally **outside** Bun workspace globs.
- Promote copied or generated projects into `apps/*` only after they are production candidates.

---

## Application Model

This repo is **not** being designed as a traditional shared-database SaaS where one application serves all tenants under one product boundary.

Instead:
- apps may live on different domains or subdomains
- each app is its own operational boundary
- each app can own its own database schema and authorization model
- identity is shared through Logto, but application authorization remains app-specific

This means:
- authentication is centralized
- authorization is decentralized per app

---

## Static vs Dynamic Apps

### Static / Mostly Static Apps

Examples:
- `website`

Rules:
- use SvelteKit as the framework
- may use static or mostly static rendering where appropriate
- should avoid introducing a database unless there is a real need
- may still use shared packages and shared deployment conventions

### Dynamic Apps

Examples:
- `portal`
- `admin`
- future internal or client-specific apps

Rules:
- use SvelteKit
- use PostgreSQL
- use Drizzle ORM
- use Logto for authentication
- define app-local authorization using local tables and server-side enforcement

---

## Authentication and Identity Model

### Logto Responsibility

Logto is responsible for:
- sign-in and sign-out
- session handling
- OIDC / callback flow
- base user identity
- organization membership
- very basic global roles where necessary

### App Responsibility

Each app is responsible for:
- deciding who can access which screens and actions
- defining its own app roles
- defining its own app permissions
- storing app-specific user metadata and access mappings
- enforcing authorization in server-side load functions, endpoints, and actions

### Current Integration Pattern

The current `portal` and `admin` apps use:
- a `hooks.server.js` Logto handle
- a server auth helper in `src/lib/server/auth.js`
- protected root routes that redirect unauthenticated users
- callback and sign-out handlers implemented through Logto’s SvelteKit client

This is the baseline pattern for future authenticated apps.

---

## Organization Model

Because Aionsoft apps are separate operational domains rather than a single SaaS product surface:

- use **Logto Organizations** in a simple way
- do not over-model tenancy in Logto
- keep organization usage focused on grouping users and basic membership context
- keep global Logto roles minimal

Recommended use of organizations:
- identify the customer, workspace, team, or company context
- support simple member grouping
- optionally support a small number of cross-app identity-level roles

Do **not** use Logto organizations as the only authorization layer for app behavior.

---

## Authorization Model

Authorization is app-local.

Each dynamic app should own:

### App Users

A local table linked to Logto’s user id (`sub`), for example:
- `id`
- `logto_user_id`
- `organization_id` or app tenant key if needed
- profile metadata relevant to the app
- timestamps

### App Roles

A local table of roles specific to that app, for example:
- `id`
- `key`
- `name`
- `description`
- timestamps

Examples:
- `portal_operator`
- `portal_manager`
- `admin_support`
- `admin_supervisor`

### App Permissions

A local table of assignable permissions specific to that app.

Permissions should follow a stable naming convention:
- `view:dashboard`
- `manage:users`
- `manage:projects`
- `manage:billing`
- `manage:roles`
- `manage:settings`

### Role Permissions

A join table assigning permissions to roles.

### User Roles

A join table assigning app roles to users.

---

## Authorization Rules

### Source of Truth

- Logto is the source of truth for authentication and identity.
- Each app database is the source of truth for app roles and app permissions.

### Enforcement

Authorization should be enforced:
- in SvelteKit server `load` functions
- in `+server.js` endpoints
- in form actions
- in server-only service modules

UI visibility should never be the only protection.

### Minimal Global Roles

If Logto roles are used, they should stay minimal and identity-oriented, not app-behavior-oriented.

Examples of acceptable global roles:
- `platform-admin`
- `customer-member`

Examples of roles that should stay local to apps:
- `project-approver`
- `billing-reviewer`
- `portal-editor`
- `admin-operator`

---

## Machine-to-Machine Usage

M2M is allowed, but it is not the primary operator access model.

### Use M2M For

- background sync with Logto Management API
- invitation flows
- user provisioning or deactivation
- organization membership sync
- app-triggered administrative automation performed server-side

### Do Not Use M2M For

- normal day-to-day human administration in place of real user accounts
- broad cross-customer super-admin control without strict scope
- UI access patterns that should be tied to real operators and audits

Recommended rule:
- human admins use UI with real Logto accounts
- app servers use M2M for narrow automation tasks behind the scenes

---

## Database Conventions

All dynamic apps should define database structure with Drizzle.

Recommended conventions:
- keep schemas modular per feature
- aggregate schema exports in one server-side schema entry point per app
- use explicit migrations
- avoid app logic depending directly on raw SQL except when truly necessary
- use stable foreign-key relationships from local app tables to Logto user ids

Suggested app-level feature layout:
- `src/lib/features/<feature>/schema.ts`
- `src/lib/features/<feature>/server/*.ts`
- `src/lib/features/<feature>/types.ts`

---

## Directory Conventions

### Applications

- `apps/website`
- `apps/portal`
- `apps/admin`

### Shared Packages

- `packages/config`
- `packages/ui`
- `packages/shared`

### Infra

Each deployable app should have:
- `infra/<app>/compose.yaml` for deployment/runtime
- `infra/<app>/compose-dev.yaml` for local infra dependencies where needed
- `infra/<app>/.env` for local env defaults or examples

### Docker

Each dynamic app should have its own Dockerfile under `docker/`.

### Specs

High-level product and architecture docs live under `specs/`.

---

## Current Baseline Status

### Already Implemented

- Bun workspace monorepo
- shared SvelteKit/Vite config package
- `portal` Logto auth shell
- `admin` Logto auth shell
- separate Dockerfiles for `website`, `portal`, and `admin`
- separate local infra stacks for `portal` and `admin`

### Not Yet Implemented but Now Standard

- Drizzle ORM in dynamic apps
- PostgreSQL schema and migration structure for `portal` and `admin`
- app-local user / role / permission tables
- server-side authorization helpers built on top of those tables
- Logto Management API integration through M2M for controlled automation

---

## Reference Implementation

Authorization and user-management direction should use the existing implementation in:

- `/Users/cesarornelas/Repos/cs-jamul-pest-control/`

Especially:
- `specs/auth-and-users.md`
- `specs/architecture.md`

This reference should guide:
- Logto management patterns
- role and permission naming
- M2M usage boundaries
- local app authorization layering on top of Logto authentication

It should be treated as a reference, not copied blindly.

---

## Initial Implementation Guidance

### Portal

Portal should evolve toward:
- local Drizzle schema
- portal-specific users / roles / permissions
- workflow and operational permissions

### Admin

Admin should evolve toward:
- local Drizzle schema
- admin-specific users / roles / permissions
- stronger management permissions than portal
- controlled Logto management operations behind server routes

### Website

Website remains SvelteKit-based, but it should stay lean and not inherit dynamic app requirements unless a real authenticated or database-backed feature is introduced.

---

## Non-Goals

This baseline intentionally does not define:
- a shared SaaS multi-tenant authorization engine
- a single permission model reused blindly across all apps
- customer-wide super-admin automation as the default control plane
- frontend-only authorization
- multiple frontend frameworks inside the monorepo

---

## Decision Summary

- Use **SvelteKit** for all apps.
- Use **Drizzle ORM + PostgreSQL** for all dynamic apps.
- Use **Logto** for authentication.
- Use **simple Logto organizations** and only very basic global roles.
- Keep **users, roles, and permissions app-local** for application behavior.
- Use **M2M only for controlled backend automation**, not as the default human admin model.