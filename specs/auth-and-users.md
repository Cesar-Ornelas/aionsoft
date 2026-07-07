# Auth & User Management

## Overview

Authentication and identity are handled by **Logto**.

Within this repo, Logto is responsible for:
- sign-in and sign-out
- session handling
- OIDC callback flow
- base user identity
- organization membership
- minimal identity-level roles where needed

Applications are responsible for:
- app-local user records
- app-local roles
- app-local permissions
- app-local authorization checks
- app-specific management flows

This separation is intentional because Aionsoft apps are separate operational domains rather than one shared SaaS surface.

---

## Current Auth Pattern

Generator direction for new template-based apps:

- auth should be selected with an explicit generator axis such as `--auth logto`
- for internal template usage, `--auth logto` can bundle the baseline RBAC starter scaffold by default
- authorization data ownership remains app-local even when scaffolded with auth

The current `portal` and `admin` apps both follow the same base pattern:

1. A SvelteKit hook initializes Logto with `@logto/sveltekit`.
2. `locals.user` is populated when the session is authenticated.
3. Protected routes redirect anonymous users to sign-in.
4. Dedicated callback and sign-out handlers complete the auth flow.

This pattern is the baseline for future authenticated apps in this repo.

---

## Session Flow

### Protected Route Flow

1. User visits a protected route.
2. `hooks.server.js` initializes the Logto client.
3. A server `load` function checks `locals.user`.
4. If `locals.user` is missing, the request redirects to `/auth/sign-in`.
5. The app sends the user to Logto.
6. Logto redirects back to `/callback`.
7. The app completes the callback and redirects back into the protected app.

### Current File Pattern

Each authenticated app should have:
- `src/hooks.server.js`
- `src/lib/server/auth.js`
- `src/routes/+layout.server.js`
- `src/routes/+page.server.js` or app-specific protected route loads
- `src/routes/auth/sign-in/+server.js`
- `src/routes/auth/sign-out/+server.js`

---

## Logto Configuration

### Required Runtime Variables

Authenticated apps require:
- `LOGTO_ENDPOINT`
- `LOGTO_APP_ID`
- `LOGTO_APP_SECRET`
- `LOGTO_COOKIE_ENCRYPTION_KEY`

Reserved for later management flows:
- `LOGTO_M2M_APP_ID`
- `LOGTO_M2M_APP_SECRET`
- `LOGTO_MANAGEMENT_RESOURCE`

### Redirect URIs

Redirect URIs in Logto should point to the application callback URL, not to the Logto server itself.

Pattern:
- local: `http://localhost:<app-port>/callback`
- production: `https://<app-domain>/callback`

Post logout redirect URIs should point to the app root:
- local: `http://localhost:<app-port>/`
- production: `https://<app-domain>/`

---

## Organization Strategy

Use Logto Organizations in a simple way.

Organizations represent:
- customer
- workspace
- company
- team

Organizations should provide:
- basic membership grouping
- simple context for who belongs where
- optional high-level identity grouping across apps

Organizations should **not** be the only permission system for application behavior.

---

## Role Strategy

### Global / Identity-Level Roles

Keep Logto roles minimal.

Examples:
- `platform-admin`
- `customer-member`
- `support-user`

These should answer identity-level questions, not feature-level UI rules.

### App Roles

Each app owns its own roles in its own database.

Examples:
- `portal_operator`
- `portal_manager`
- `admin_support`
- `admin_supervisor`
- `admin_billing_reviewer`

App roles should map to app permissions, not directly to Logto roles.

---

## Permission Strategy

Permissions are app-local and assignable to app roles.

Recommended format:
- `view:dashboard`
- `manage:users`
- `manage:projects`
- `manage:billing`
- `manage:roles`
- `manage:settings`

Rules:
- permissions should reflect application behavior
- permissions should be enforceable on the server
- UI visibility should be derived from permissions, not treated as protection by itself

---

## Local Data Model

Each dynamic app should maintain local authorization tables linked to Logto identity.

### App Users

Minimum shape:
- `id`
- `logto_user_id`
- app-specific profile fields
- optional organization reference
- timestamps

### App Roles

Minimum shape:
- `id`
- `key`
- `name`
- `description`
- timestamps

### App Permissions

Minimum shape:
- `id`
- `key`
- `name`
- `description`

### Role Permissions

Join table mapping app roles to app permissions.

### User Roles

Join table mapping app users to app roles.

All of these tables should be defined with **Drizzle ORM** in each dynamic app.

---

## Enforcement Rules

Authorization checks should happen in:
- server `load` functions
- `+server.js` endpoints
- SvelteKit form actions
- server-only service modules

They should not depend on client-only checks.

Recommended server pattern:
- resolve current authenticated user from `locals.user`
- map the Logto user id to the local app user
- load role assignments and effective permissions
- fail early with `redirect(302, ...)`, `error(401, ...)`, or `error(403, ...)`

### Current Request User Object

Authenticated dynamic apps should expose a request-scoped authorization object on server requests.

Canonical shape:

```ts
type CurrentAppUser = {
	id: string;
	logtoUserId: string;
	roleIds: string[];
	permissionKeys: string[];
};
```

Recommended request lifecycle:
- `hooks.server` resolves `locals.user.sub` to local authz context once per request
- resolved data is stored in `event.locals.currentAppUser`
- routes/actions/endpoints call guard helpers instead of implementing ad hoc checks

Session guidance:
- keep session/cookie state lightweight (identity marker only, for example subject)
- do not treat long-lived session permission snapshots as source of truth
- use app DB as source of truth for roles and permissions

### Route usage for new features

Every new feature server handler should require current request user context before business logic.

```ts
import type { Actions, PageServerLoad } from "./$types";
import {
	requireCurrentRequestUser,
	requireUserPermission
} from "$lib/features/authorization-rbac/server/permissions";

export const load: PageServerLoad = async (event) => {
	await requireCurrentRequestUser(event);
	// optional: await requireUserPermission(event, "view:my-feature");
	return {};
};

export const actions: Actions = {
	save: async (event) => {
		await requireUserPermission(event, "manage:my-feature");
		const formData = await event.request.formData();
		// feature workflow here
		return { ok: true };
	}
};
```

---

## Machine-to-Machine Usage

M2M should be used for controlled server-side automation, not as the default human access model.

### Appropriate M2M Use Cases

- creating or updating users through Logto Management API
- assigning organization memberships
- assigning identity-level roles
- background provisioning or deactivation flows
- invitation or sync jobs

### Inappropriate M2M Use Cases

- replacing human administrators for normal user-management work
- giving one central backend unrestricted power across every customer environment by default
- bypassing user-level auditing and UI workflows when a human operator should be responsible

Recommended rule:
- human admins sign in with real accounts and use the UI
- M2M supports backend automation behind the scenes

---

## Per-App Guidance

### Portal

Portal should manage:
- portal users linked to Logto users
- portal roles
- portal permissions
- workflow and operational access

Portal should not assume that admin-level management permissions belong in the same permission set.

### Admin

Admin should manage:
- admin users linked to Logto users
- admin roles
- admin permissions
- higher-trust operational actions
- controlled user-management workflows that may later call the Logto Management API

Admin is the natural place for future M2M-backed management operations.

### Website

Website is currently public-facing and should not adopt the dynamic app authorization model unless a real authenticated feature requires it.

---

## Reference Repo

Use `/Users/cesarornelas/Repos/cs-jamul-pest-control/` as the main reference for:
- Logto auth shape
- role and permission naming conventions
- management API boundaries
- app-local authorization layering

Especially:
- `specs/auth-and-users.md`
- `specs/architecture.md`

This reference should inform implementation, but Aionsoft should keep its own simpler multi-app model.

---

## Initial Implementation Plan

### Phase 1

- keep the current Logto auth shells for `portal` and `admin`
- introduce Drizzle into both dynamic apps
- create local user, role, permission, user-role, and role-permission tables
- add server-side helpers to resolve effective permissions

### Phase 2

- permission-gate routes and actions in `portal`
- permission-gate routes and actions in `admin`
- add UI gating that mirrors server enforcement

### Phase 3

- add M2M-backed Logto Management API integration where there is a real operational need
- keep those calls inside server-only modules and admin-only flows

---

## Security Notes

- Never log `LOGTO_APP_SECRET`, `LOGTO_M2M_APP_SECRET`, or `LOGTO_COOKIE_ENCRYPTION_KEY`.
- Treat Logto M2M credentials as backend-only.
- Do not rely on UI-only checks for authorization.
- Keep permission checks server-side for all state-changing actions.
- Keep M2M scope as narrow as possible.

---

## Decision Summary

- Logto handles authentication.
- Organizations stay simple.
- Global Logto roles stay minimal.
- Each app owns its own users, roles, and permissions in PostgreSQL.
- Drizzle is the ORM for all dynamic-app authorization data.
- M2M is for backend automation, not the default human management path.