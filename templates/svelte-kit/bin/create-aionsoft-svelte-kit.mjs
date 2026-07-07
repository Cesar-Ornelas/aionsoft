#!/usr/bin/env node

import { cp, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SUPPORTED_AUTH = new Set(["none", "logto"]);
const SUPPORTED_FEATURES = new Set(["logto"]);

const helpText = `
create-aionsoft-svelte-kit

Usage:
  create-aionsoft-svelte-kit <target-directory> [--name <project-name>] [--auth <mode>] [--features <feature-list>] [--force]

Options:
  --name   Package/project name written into template files.
  --auth   Authentication mode to scaffold (supported: none, logto).
  --features  Legacy comma-separated feature alias (currently: logto -> --auth logto).
  --force  Allow writing into a non-empty target directory.
  --help   Show this message.
`;

function parseArgs(argv) {
  const result = {
    target: "",
    name: "",
    auth: "none",
    features: [],
    force: false,
    help: false,
    legacyFeaturesUsed: false
  };

  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--help" || arg === "-h") {
      result.help = true;
      continue;
    }

    if (arg === "--force") {
      result.force = true;
      continue;
    }

    if (arg === "--name") {
      result.name = argv[i + 1] || "";
      i += 1;
      continue;
    }

    if (arg === "--auth") {
      result.auth = normalizeMode(argv[i + 1] || "none");
      i += 1;
      continue;
    }

    if (arg === "--features") {
      result.features.push(...parseFeatureList(argv[i + 1] || ""));
      result.legacyFeaturesUsed = true;
      i += 1;
      continue;
    }

    if (arg.startsWith("--name=")) {
      result.name = arg.slice("--name=".length);
      continue;
    }

    if (arg.startsWith("--auth=")) {
      result.auth = normalizeMode(arg.slice("--auth=".length));
      continue;
    }

    if (arg.startsWith("--features=")) {
      result.features.push(...parseFeatureList(arg.slice("--features=".length)));
      result.legacyFeaturesUsed = true;
      continue;
    }

    positional.push(arg);
  }

  if (positional.length > 0) {
    result.target = positional[0];
  }

  return result;
}

function normalizeMode(input) {
  return (input || "none").trim().toLowerCase();
}

function parseFeatureList(input) {
  return input
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeFeatures(features) {
  return [...new Set(features.map((value) => value.trim().toLowerCase()).filter(Boolean))];
}

async function isDirectoryEmpty(directoryPath) {
  const entries = await readdir(directoryPath);
  return entries.length === 0;
}

async function walkFiles(directoryPath) {
  const entries = await readdir(directoryPath);
  const files = [];

  for (const entry of entries) {
    const absoluteEntryPath = path.join(directoryPath, entry);
    const entryStats = await stat(absoluteEntryPath);

    if (entryStats.isDirectory()) {
      const nested = await walkFiles(absoluteEntryPath);
      files.push(...nested);
      continue;
    }

    files.push(absoluteEntryPath);
  }

  return files;
}

async function replaceTokens(targetDirectory, replacements) {
  const files = await walkFiles(targetDirectory);

  for (const filePath of files) {
    const relative = path.relative(targetDirectory, filePath);
    if (relative.startsWith("static/") && !relative.endsWith(".txt") && !relative.endsWith(".svg")) {
      continue;
    }

    const original = await readFile(filePath, "utf8");
    let next = original;

    for (const [token, value] of Object.entries(replacements)) {
      next = next.split(token).join(value);
    }

    if (next !== original) {
      await writeFile(filePath, next, "utf8");
    }
  }
}

async function readJson(filePath) {
  const contents = await readFile(filePath, "utf8");
  return JSON.parse(contents);
}

async function writeJson(filePath, data) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function appendEnvSectionIfMissing(envPath, header, lines) {
  let current = "";

  try {
    current = await readFile(envPath, "utf8");
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) {
      throw error;
    }
  }

  if (current.includes(header)) {
    return;
  }

  const next = `${current.trimEnd()}\n\n${header}\n${lines.join("\n")}\n`;
  await writeFile(envPath, next, "utf8");
}

async function scaffoldLogtoFeature(targetDirectory) {
  const packageJsonPath = path.join(targetDirectory, "package.json");
  const envExamplePath = path.join(targetDirectory, ".env.example");
  const envPath = path.join(targetDirectory, ".env");
  const scriptsDir = path.join(targetDirectory, "scripts");

  let targetEnvPath = envExamplePath;

  try {
    await stat(envExamplePath);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      targetEnvPath = envPath;
    } else {
      throw error;
    }
  }

  const packageJson = await readJson(packageJsonPath);
  if (!packageJson.devDependencies) {
    packageJson.devDependencies = {};
  }
  if (!packageJson.scripts) {
    packageJson.scripts = {};
  }
  packageJson.devDependencies["@logto/sveltekit"] = packageJson.devDependencies["@logto/sveltekit"] || "^0.3.23";
  packageJson.scripts["db:seed"] = packageJson.scripts["db:seed"] || "bun run ./scripts/seed-access-control.ts";
  await writeJson(packageJsonPath, packageJson);

  await appendEnvSectionIfMissing(targetEnvPath, "# Logto auth", [
    "LOGTO_ENDPOINT=",
    "LOGTO_ADMIN_ENDPOINT=",
    "LOGTO_APP_ID=",
    "LOGTO_APP_SECRET=",
    "LOGTO_M2M_APP_ID=",
    "LOGTO_M2M_APP_SECRET=",
    "LOGTO_COOKIE_ENCRYPTION_KEY=",
    "LOGTO_MANAGEMENT_RESOURCE=https://default.logto.app/api",
    "LOGTO_DEFAULT_ORGANIZATION_NAME=Default Organization",
    "LOGTO_DEFAULT_ORGANIZATION_DESCRIPTION=Initial organization created during first-run setup.",
    "SEED_ADMIN_LOGTO_USER_ID=",
    "SEED_ADMIN_EMAIL=",
    "SEED_ADMIN_DISPLAY_NAME="
  ]);

  const authServerDir = path.join(targetDirectory, "src", "lib", "features", "auth-logto", "server");
  const authSignInDir = path.join(targetDirectory, "src", "routes", "auth", "sign-in");
  const authSignOutDir = path.join(targetDirectory, "src", "routes", "auth", "sign-out");
  const setupRouteDir = path.join(targetDirectory, "src", "routes", "setup");

  await mkdir(authServerDir, { recursive: true });
  await mkdir(authSignInDir, { recursive: true });
  await mkdir(authSignOutDir, { recursive: true });
  await mkdir(setupRouteDir, { recursive: true });
  await mkdir(scriptsDir, { recursive: true });

  await writeFile(
    path.join(authServerDir, "config.ts"),
    `import { env } from "$env/dynamic/private";

const REQUIRED_ENV_NAMES = [
  "LOGTO_ENDPOINT",
  "LOGTO_APP_ID",
  "LOGTO_APP_SECRET",
  "LOGTO_COOKIE_ENCRYPTION_KEY"
] as const;

function getRequiredEnv(name: string) {
  const value = env[name]?.trim();

  if (!value) {
    throw new Error(\`Missing required auth env var: \${name}\`);
  }

  return value;
}

function normalizeReturnTo(returnTo: string | null) {
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return "/";
  }

  return returnTo;
}

export function getLogtoConfig() {
  for (const name of REQUIRED_ENV_NAMES) {
    getRequiredEnv(name);
  }

  return {
    endpoint: getRequiredEnv("LOGTO_ENDPOINT"),
    appId: getRequiredEnv("LOGTO_APP_ID"),
    appSecret: getRequiredEnv("LOGTO_APP_SECRET")
  };
}

export function getLogtoCookieConfig() {
  return {
    encryptionKey: getRequiredEnv("LOGTO_COOKIE_ENCRYPTION_KEY")
  };
}

export function getReturnTo(searchParams: URLSearchParams) {
  return normalizeReturnTo(searchParams.get("returnTo"));
}

export function buildCallbackUrl(url: URL) {
  return new URL("/callback", url.origin).toString();
}

export function buildPostSignInUrl(url: URL, returnTo: string) {
  return new URL(normalizeReturnTo(returnTo), url.origin).toString();
}

export function buildPostSignOutUrl(url: URL) {
  return new URL("/", url.origin).toString();
}
`,
    "utf8"
  );

  await writeFile(
    path.join(targetDirectory, "src", "hooks.server.ts"),
    `import { handleLogto } from "@logto/sveltekit";
import { error, redirect, type Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { getLogtoConfig, getLogtoCookieConfig } from "$lib/features/auth-logto/server/config";
import { hasAnyAccessUsers } from "$lib/entities/access-control";
import { resolveCurrentRequestUser } from "$lib/features/authorization-rbac/server/current-request-user";

const LOGTO_CONSENT_COOKIE = "logto-consent-granted";

const logtoHandle = handleLogto(getLogtoConfig(), getLogtoCookieConfig());

const logtoHandleWithConsentCookie: Handle = async ({ event, resolve }) => {
  return logtoHandle({
    event,
    resolve: async (scopedEvent) => {
      if (scopedEvent.locals.user && !scopedEvent.cookies.get(LOGTO_CONSENT_COOKIE)) {
        scopedEvent.cookies.set(LOGTO_CONSENT_COOKIE, "1", {
          path: "/",
          httpOnly: true,
          sameSite: "lax",
          secure: scopedEvent.url.protocol === "https:",
          maxAge: 60 * 60 * 24 * 365
        });
      }

      return resolve(scopedEvent);
    }
  });
};

const authContextHandle: Handle = async ({ event, resolve }) => {
  await resolveCurrentRequestUser(event);
  return resolve(event);
};

function isPublicPath(pathname: string) {
  return pathname.startsWith("/auth/") || pathname === "/setup" || pathname.startsWith("/setup/") || pathname === "/callback";
}

const authGuardHandle: Handle = async ({ event, resolve }) => {
  const pathname = event.url.pathname;
  const publicPath = isPublicPath(pathname);
  const localUsersExist = await hasAnyAccessUsers();

  if (!localUsersExist && !publicPath) {
    throw redirect(302, "/setup");
  }

  if (localUsersExist && !publicPath && !event.locals.user) {
    const returnTo = pathname + event.url.search;
    throw redirect(302, "/auth/sign-in?returnTo=" + encodeURIComponent(returnTo || "/"));
  }

  if (localUsersExist && !publicPath && event.locals.user && !event.locals.currentAppUser) {
    throw error(403, "The authenticated identity is not linked to a local app user.");
  }

  return resolve(event);
};

export const handle = sequence(logtoHandleWithConsentCookie, authContextHandle, authGuardHandle);
`,
    "utf8"
  );

  const managementTemplatePath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../template/src/lib/features/auth-logto/server/management.ts"
  );
  const managementTemplate = await readFile(managementTemplatePath, "utf8");
  await writeFile(path.join(authServerDir, "management.ts"), managementTemplate, "utf8");

  await writeFile(
    path.join(authSignInDir, "+server.ts"),
    `import type { RequestHandler } from "@sveltejs/kit";
import { redirect } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { buildCallbackUrl, buildPostSignInUrl, getReturnTo } from "$lib/features/auth-logto/server/config";

const LOGTO_CONSENT_COOKIE = "logto-consent-granted";

export const GET: RequestHandler = async ({ locals, cookies, url }) => {
  const scopedLocals = locals as {
    user?: unknown;
    logtoClient: {
      signIn: (options: { redirectUri: string; postRedirectUri: string; prompt?: string }) => Promise<void>;
    };
  };

  const returnTo = getReturnTo(url.searchParams);

  if (scopedLocals.user) {
    throw redirect(302, returnTo);
  }

  const hasConsentCookie = url.searchParams.has("forceConsent")
    ? false
    : url.searchParams.has("consent")
      ? true
      : Boolean(cookies.get(LOGTO_CONSENT_COOKIE));
  const isProduction = env.NODE_ENV === "production";
  const prompt = url.searchParams.has("forceConsent")
    ? "consent"
    : isProduction
      ? "login"
      : hasConsentCookie
        ? "login"
        : "consent";

  await scopedLocals.logtoClient.signIn({
    redirectUri: buildCallbackUrl(url),
    postRedirectUri: buildPostSignInUrl(url, returnTo),
    prompt
  });

  return new Response(null, { status: 204 });
};
`,
    "utf8"
  );

  await writeFile(
    path.join(authSignOutDir, "+server.ts"),
    `import type { RequestHandler } from "@sveltejs/kit";
import { buildPostSignOutUrl } from "$lib/features/auth-logto/server/config";

const signOut: RequestHandler = async ({ locals, url }) => {
  const scopedLocals = locals as {
    logtoClient: {
      signOut: (redirectUri: string) => Promise<void>;
    };
  };

  await scopedLocals.logtoClient.signOut(buildPostSignOutUrl(url));
  return new Response(null, { status: 204 });
};

export const GET = signOut;
export const POST = signOut;
`,
    "utf8"
  );

  await writeFile(
    path.join(setupRouteDir, "+page.server.ts"),
    `import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
  addUsersToOrganization,
  createBootstrapUser,
  ensureDefaultOrganization,
  getPublicErrorMessage
} from "$lib/features/auth-logto/server/management";
import {
  createAccessRole,
  getAccessRoleByKey,
  hasAnyAccessUsers,
  listAccessPermissionIds,
  setRolePermissions,
  setUserRoles,
  upsertAccessUser
} from "$lib/entities/access-control";

function readTrimmedString(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

async function ensureBootstrapAdminRole() {
  const existingAdminRole = await getAccessRoleByKey("admin");

  if (existingAdminRole) {
    return existingAdminRole;
  }

  const createdRole = await createAccessRole({
    key: "admin",
    name: "Administrator",
    description: "Default administrator role created during first-run setup."
  });

  const permissionIds = await listAccessPermissionIds();
  if (permissionIds.length > 0) {
    await setRolePermissions(createdRole.id, permissionIds);
  }

  return createdRole;
}

export const load: PageServerLoad = async ({ locals }) => {
  if (await hasAnyAccessUsers()) {
    if (locals.user) {
      throw redirect(302, "/");
    }

    throw redirect(302, "/auth/sign-in?returnTo=/");
  }

  return {};
};

export const actions: Actions = {
  default: async ({ request }) => {
    if (await hasAnyAccessUsers()) {
      throw redirect(303, "/auth/sign-in?returnTo=/");
    }

    const formData = await request.formData();
    const username = readTrimmedString(formData, "username");
    const email = readTrimmedString(formData, "email").toLowerCase();
    const password = String(formData.get("password") ?? "");
    const errors: Record<string, string> = {};

    if (!username) {
      errors.username = "Username is required.";
    }

    if (!email) {
      errors.email = "Email is required.";
    }

    if (!password) {
      errors.password = "Password is required.";
    }

    if (Object.keys(errors).length > 0) {
      return fail(400, {
        errors,
        values: { username, email }
      });
    }

    try {
      const organization = await ensureDefaultOrganization();
      const user = await createBootstrapUser({ username, email, password });

      await addUsersToOrganization(organization.id, [user.id]);

      const localUser = await upsertAccessUser({
        logtoUserId: user.id,
        email,
        displayName: username
      });

      const adminRole = await ensureBootstrapAdminRole();
      await setUserRoles(localUser.id, [adminRole.id]);
    } catch (error) {
      return fail(500, {
        message: getPublicErrorMessage(error),
        values: { username, email }
      });
    }

    throw redirect(303, "/auth/sign-in?returnTo=/");
  }
};
`,
    "utf8"
  );

  await writeFile(
    path.join(setupRouteDir, "+page.svelte"),
    `<script lang="ts">
  import type { ActionData } from "./$types";

  let { form }: { form: ActionData | null | undefined } = $props();
</script>

<section class="mx-auto w-full max-w-lg space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
  <div class="space-y-2">
    <p class="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">First-run setup</p>
    <h1 class="text-2xl font-semibold tracking-tight">Create default organization and admin user</h1>
    <p class="text-sm text-muted-foreground">
      This page is available only until the first local user is created.
    </p>
  </div>

  {#if form?.message}
    <p class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{form.message}</p>
  {/if}

  <form method="POST" class="space-y-4">
    <div>
      <label class="text-sm font-medium" for="username">Username</label>
      <input
        id="username"
        name="username"
        value={form?.values?.username ?? ""}
        class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        placeholder="admin"
      />
      {#if form?.errors?.username}
        <p class="mt-1 text-sm text-rose-600">{form.errors.username}</p>
      {/if}
    </div>

    <div>
      <label class="text-sm font-medium" for="email">Email</label>
      <input
        id="email"
        name="email"
        type="email"
        value={form?.values?.email ?? ""}
        class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        placeholder="admin@example.com"
      />
      {#if form?.errors?.email}
        <p class="mt-1 text-sm text-rose-600">{form.errors.email}</p>
      {/if}
    </div>

    <div>
      <label class="text-sm font-medium" for="password">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        placeholder="Set an initial password"
      />
      {#if form?.errors?.password}
        <p class="mt-1 text-sm text-rose-600">{form.errors.password}</p>
      {/if}
    </div>

    <button class="w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">
      Create organization and user
    </button>
  </form>
</section>
`,
    "utf8"
  );

  await scaffoldRbacStarter(targetDirectory);

  await writeFile(
    path.join(scriptsDir, "seed-access-control.ts"),
    `import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  appPermissions,
  appRolePermissions,
  appRoles,
  appUserRoles,
  appUsers
} from "../src/lib/entities/access-control/model/schema";

const DEFAULT_PERMISSIONS = [
  {
    key: "view:dashboard",
    name: "View dashboard",
    description: "Access the main application dashboard."
  },
  {
    key: "manage:users",
    name: "Manage users",
    description: "Create, update, and manage app-local users."
  },
  {
    key: "manage:roles",
    name: "Manage roles",
    description: "Create, update, and assign roles."
  },
  {
    key: "manage:permissions",
    name: "Manage permissions",
    description: "Review and assign permission capabilities."
  },
  {
    key: "manage:settings",
    name: "Manage settings",
    description: "Update application settings and configuration."
  }
];

const DEFAULT_ROLES = [
  {
    key: "admin",
    name: "Administrator",
    description: "Full starter access across the generated app.",
    permissionKeys: DEFAULT_PERMISSIONS.map((permission) => permission.key)
  },
  {
    key: "editor",
    name: "Editor",
    description: "Can use the app but cannot manage roles or permissions.",
    permissionKeys: ["view:dashboard", "manage:settings"]
  },
  {
    key: "viewer",
    name: "Viewer",
    description: "Read-only starter access.",
    permissionKeys: ["view:dashboard"]
  }
];

function getDatabaseUrl() {
  const value = process.env.DATABASE_URL?.trim();

  if (!value) {
    throw new Error("Missing required DATABASE_URL environment variable.");
  }

  return value;
}

async function seedPermissions(db) {
  const permissionIdByKey = new Map();

  for (const permission of DEFAULT_PERMISSIONS) {
    const existing = await db.select().from(appPermissions).where(eq(appPermissions.key, permission.key)).limit(1);

    if (existing.length > 0) {
      permissionIdByKey.set(permission.key, existing[0].id);
      continue;
    }

    const inserted = await db.insert(appPermissions).values(permission).returning({ id: appPermissions.id });
    permissionIdByKey.set(permission.key, inserted[0].id);
  }

  return permissionIdByKey;
}

async function seedRoles(db, permissionIdByKey) {
  const roleIdByKey = new Map();

  for (const role of DEFAULT_ROLES) {
    const existing = await db.select().from(appRoles).where(eq(appRoles.key, role.key)).limit(1);

    let roleId;
    if (existing.length > 0) {
      roleId = existing[0].id;
    } else {
      const inserted = await db.insert(appRoles).values({
        key: role.key,
        name: role.name,
        description: role.description
      }).returning({ id: appRoles.id });
      roleId = inserted[0].id;
    }

    roleIdByKey.set(role.key, roleId);

    for (const permissionKey of role.permissionKeys) {
      const permissionId = permissionIdByKey.get(permissionKey);
      if (!permissionId) continue;

      const existingLink = await db.select().from(appRolePermissions).where(and(
        eq(appRolePermissions.roleId, roleId),
        eq(appRolePermissions.permissionId, permissionId)
      )).limit(1);

      if (existingLink.length === 0) {
        await db.insert(appRolePermissions).values({ roleId, permissionId });
      }
    }
  }

  return roleIdByKey;
}

async function seedBootstrapAdmin(db, roleIdByKey) {
  const logtoUserId = process.env.SEED_ADMIN_LOGTO_USER_ID?.trim();

  if (!logtoUserId) {
    console.log("Skipping bootstrap admin user seed because SEED_ADMIN_LOGTO_USER_ID is not set.");
    return;
  }

  const email = process.env.SEED_ADMIN_EMAIL?.trim() || null;
  const displayName = process.env.SEED_ADMIN_DISPLAY_NAME?.trim() || null;

  const existingUser = await db.select().from(appUsers).where(eq(appUsers.logtoUserId, logtoUserId)).limit(1);

  let userId;
  if (existingUser.length > 0) {
    userId = existingUser[0].id;
  } else {
    const inserted = await db.insert(appUsers).values({
      logtoUserId,
      email,
      displayName
    }).returning({ id: appUsers.id });
    userId = inserted[0].id;
  }

  const adminRoleId = roleIdByKey.get("admin");
  if (!adminRoleId) {
    throw new Error("Missing seeded admin role.");
  }

  const existingAssignment = await db.select().from(appUserRoles).where(and(
    eq(appUserRoles.userId, userId),
    eq(appUserRoles.roleId, adminRoleId)
  )).limit(1);

  if (existingAssignment.length === 0) {
    await db.insert(appUserRoles).values({ userId, roleId: adminRoleId });
  }

  console.log(\`Bootstrap admin seeded for Logto user \${logtoUserId}.\`);
}

async function main() {
  const sql = postgres(getDatabaseUrl(), { prepare: false, max: 1 });
  const db = drizzle(sql);

  try {
    const permissionIdByKey = await seedPermissions(db);
    const roleIdByKey = await seedRoles(db, permissionIdByKey);
    await seedBootstrapAdmin(db, roleIdByKey);
    console.log("Access-control seed completed.");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
`,
    "utf8"
  );
}

async function scaffoldRbacStarter(targetDirectory) {
  const accessControlModelDir = path.join(targetDirectory, "src", "lib", "entities", "access-control", "model");
  const accessControlServerDir = path.join(targetDirectory, "src", "lib", "entities", "access-control", "server");
  const accessControlDir = path.join(targetDirectory, "src", "lib", "entities", "access-control");
  const authorizationServerDir = path.join(targetDirectory, "src", "lib", "features", "authorization-rbac", "server");

  await mkdir(accessControlModelDir, { recursive: true });
  await mkdir(accessControlServerDir, { recursive: true });
  await mkdir(authorizationServerDir, { recursive: true });

  await writeFile(
    path.join(accessControlModelDir, "schema.ts"),
    `import { pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const appUsers = pgTable("app_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  logtoUserId: text("logto_user_id").notNull(),
  email: text("email"),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [uniqueIndex("app_users_logto_user_id_uq").on(table.logtoUserId)]);

export const appRoles = pgTable("app_roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [uniqueIndex("app_roles_key_uq").on(table.key)]);

export const appPermissions = pgTable("app_permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [uniqueIndex("app_permissions_key_uq").on(table.key)]);

export const appUserRoles = pgTable("app_user_roles", {
  userId: uuid("user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  roleId: uuid("role_id").notNull().references(() => appRoles.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [primaryKey({ columns: [table.userId, table.roleId], name: "app_user_roles_pk" })]);

export const appRolePermissions = pgTable("app_role_permissions", {
  roleId: uuid("role_id").notNull().references(() => appRoles.id, { onDelete: "cascade" }),
  permissionId: uuid("permission_id").notNull().references(() => appPermissions.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [primaryKey({ columns: [table.roleId, table.permissionId], name: "app_role_permissions_pk" })]);
`,
    "utf8"
  );

  await writeFile(
    path.join(accessControlModelDir, "types.ts"),
    `export type AccessRole = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AccessPermission = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AccessUser = {
  id: string;
  logtoUserId: string;
  email: string | null;
  displayName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PermissionKey = string;

export type CurrentAppUser = {
  id: string;
  logtoUserId: string;
  permissionKeys: PermissionKey[];
};
`,
    "utf8"
  );

  await writeFile(
    path.join(accessControlServerDir, "repository.ts"),
    `import { and, asc, eq } from "drizzle-orm";
import { getDb } from "$lib/server/db";
import {
  appPermissions,
  appRolePermissions,
  appRoles,
  appUserRoles,
  appUsers
} from "$lib/entities/access-control/model/schema";
import type { CurrentAppUser } from "$lib/entities/access-control/model/types";

function normalizeKey(value: string | null | undefined, fallback: string) {
  const normalized = String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || fallback;
}

export function getAccessStoreErrorMessage(error: unknown, fallback = "The requested access change could not be completed.") {
  if (error && typeof error === "object" && "code" in error && error.code === "23505") {
    return "An item with the same key already exists.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export async function listAccessRoles() {
  const db = getDb();

  return db
    .select({
      id: appRoles.id,
      key: appRoles.key,
      name: appRoles.name,
      description: appRoles.description,
      createdAt: appRoles.createdAt,
      updatedAt: appRoles.updatedAt
    })
    .from(appRoles)
    .orderBy(asc(appRoles.name));
}

export async function listAccessPermissions() {
  const db = getDb();

  return db
    .select({
      id: appPermissions.id,
      key: appPermissions.key,
      name: appPermissions.name,
      description: appPermissions.description,
      createdAt: appPermissions.createdAt,
      updatedAt: appPermissions.updatedAt
    })
    .from(appPermissions)
    .orderBy(asc(appPermissions.key));
}

export async function listAccessUsers() {
  const db = getDb();

  return db
    .select({
      id: appUsers.id,
      logtoUserId: appUsers.logtoUserId,
      email: appUsers.email,
      displayName: appUsers.displayName,
      createdAt: appUsers.createdAt,
      updatedAt: appUsers.updatedAt
    })
    .from(appUsers)
    .orderBy(asc(appUsers.displayName), asc(appUsers.email));
}

export async function hasAnyAccessUsers() {
  const db = getDb();
  const [record] = await db.select({ id: appUsers.id }).from(appUsers).limit(1);
  return Boolean(record);
}

export async function getAccessUserByLogtoUserId(logtoUserId: string) {
  const db = getDb();
  const [record] = await db
    .select({
      id: appUsers.id,
      logtoUserId: appUsers.logtoUserId,
      email: appUsers.email,
      displayName: appUsers.displayName,
      createdAt: appUsers.createdAt,
      updatedAt: appUsers.updatedAt
    })
    .from(appUsers)
    .where(eq(appUsers.logtoUserId, logtoUserId))
    .limit(1);

  return record ?? null;
}

export async function getAccessRoleByKey(roleKey: string) {
  const db = getDb();
  const [record] = await db
    .select({
      id: appRoles.id,
      key: appRoles.key,
      name: appRoles.name,
      description: appRoles.description,
      createdAt: appRoles.createdAt,
      updatedAt: appRoles.updatedAt
    })
    .from(appRoles)
    .where(eq(appRoles.key, roleKey))
    .limit(1);

  return record ?? null;
}

export async function listAccessPermissionIds() {
  const db = getDb();
  const rows = await db.select({ id: appPermissions.id }).from(appPermissions);
  return rows.map((row) => row.id);
}

export async function createAccessRole(input: { key?: string; name?: string; description?: string }) {
  const db = getDb();
  const roleKey = normalizeKey(input.key || input.name, "role");
  const roleName = String(input.name || input.key || "Role").trim();

  const [record] = await db
    .insert(appRoles)
    .values({
      key: roleKey,
      name: roleName,
      description: input.description || null
    })
    .returning({
      id: appRoles.id,
      key: appRoles.key,
      name: appRoles.name,
      description: appRoles.description,
      createdAt: appRoles.createdAt,
      updatedAt: appRoles.updatedAt
    });

  return record;
}

export async function updateAccessRole(roleId: string, input: { key?: string; name?: string; description?: string }) {
  const db = getDb();
  const roleKey = normalizeKey(input.key || input.name, "role");
  const roleName = String(input.name || input.key || "Role").trim();

  const [record] = await db
    .update(appRoles)
    .set({
      key: roleKey,
      name: roleName,
      description: input.description || null,
      updatedAt: new Date()
    })
    .where(eq(appRoles.id, roleId))
    .returning({
      id: appRoles.id,
      key: appRoles.key,
      name: appRoles.name,
      description: appRoles.description,
      createdAt: appRoles.createdAt,
      updatedAt: appRoles.updatedAt
    });

  return record ?? null;
}

export async function createAccessPermission(input: { key?: string; name?: string; description?: string }) {
  const db = getDb();
  const permissionKey = normalizeKey(input.key || input.name, "permission");
  const permissionName = String(input.name || input.key || "Permission").trim();

  const [record] = await db
    .insert(appPermissions)
    .values({
      key: permissionKey,
      name: permissionName,
      description: input.description || null
    })
    .returning({
      id: appPermissions.id,
      key: appPermissions.key,
      name: appPermissions.name,
      description: appPermissions.description,
      createdAt: appPermissions.createdAt,
      updatedAt: appPermissions.updatedAt
    });

  return record;
}

export async function updateAccessPermission(permissionId: string, input: { key?: string; name?: string; description?: string }) {
  const db = getDb();
  const permissionKey = normalizeKey(input.key || input.name, "permission");
  const permissionName = String(input.name || input.key || "Permission").trim();

  const [record] = await db
    .update(appPermissions)
    .set({
      key: permissionKey,
      name: permissionName,
      description: input.description || null,
      updatedAt: new Date()
    })
    .where(eq(appPermissions.id, permissionId))
    .returning({
      id: appPermissions.id,
      key: appPermissions.key,
      name: appPermissions.name,
      description: appPermissions.description,
      createdAt: appPermissions.createdAt,
      updatedAt: appPermissions.updatedAt
    });

  return record ?? null;
}

export async function upsertAccessUser(input: {
  logtoUserId: string;
  email?: string | null;
  displayName?: string | null;
}) {
  const db = getDb();
  const existing = await getAccessUserByLogtoUserId(input.logtoUserId);

  if (existing) {
    const [updated] = await db
      .update(appUsers)
      .set({
        email: input.email ?? null,
        displayName: input.displayName ?? null,
        updatedAt: new Date()
      })
      .where(eq(appUsers.id, existing.id))
      .returning({
        id: appUsers.id,
        logtoUserId: appUsers.logtoUserId,
        email: appUsers.email,
        displayName: appUsers.displayName,
        createdAt: appUsers.createdAt,
        updatedAt: appUsers.updatedAt
      });

    return updated;
  }

  const [created] = await db
    .insert(appUsers)
    .values({
      logtoUserId: input.logtoUserId,
      email: input.email ?? null,
      displayName: input.displayName ?? null
    })
    .returning({
      id: appUsers.id,
      logtoUserId: appUsers.logtoUserId,
      email: appUsers.email,
      displayName: appUsers.displayName,
      createdAt: appUsers.createdAt,
      updatedAt: appUsers.updatedAt
    });

  return created;
}

export async function assignRoleToUser({ userId, roleId }: { userId: string; roleId: string }) {
  const db = getDb();
  await db.insert(appUserRoles).values({ userId, roleId }).onConflictDoNothing();
}

export async function setUserRoles(userId: string, roleIds: string[]) {
  const db = getDb();
  const uniqueRoleIds = [...new Set(roleIds.filter(Boolean))];

  await db.delete(appUserRoles).where(eq(appUserRoles.userId, userId));

  if (uniqueRoleIds.length === 0) {
    return;
  }

  await db.insert(appUserRoles).values(uniqueRoleIds.map((roleId) => ({ userId, roleId }))).onConflictDoNothing();
}

export async function setRolePermissions(roleId: string, permissionIds: string[]) {
  const db = getDb();
  const uniquePermissionIds = [...new Set(permissionIds.filter(Boolean))];

  await db.delete(appRolePermissions).where(eq(appRolePermissions.roleId, roleId));

  if (uniquePermissionIds.length === 0) {
    return;
  }

  await db
    .insert(appRolePermissions)
    .values(uniquePermissionIds.map((permissionId) => ({ roleId, permissionId })))
    .onConflictDoNothing();
}

export async function listRoleIdsForUser(userId: string) {
  const db = getDb();
  const rows = await db
    .select({ roleId: appUserRoles.roleId })
    .from(appUserRoles)
    .where(eq(appUserRoles.userId, userId));

  return rows.map((row) => row.roleId);
}

export async function listPermissionKeysForLogtoUser(logtoUserId: string) {
  const db = getDb();
  const rows = await db
    .select({ key: appPermissions.key })
    .from(appUsers)
    .innerJoin(appUserRoles, eq(appUserRoles.userId, appUsers.id))
    .innerJoin(appRolePermissions, eq(appRolePermissions.roleId, appUserRoles.roleId))
    .innerJoin(appPermissions, eq(appPermissions.id, appRolePermissions.permissionId))
    .where(eq(appUsers.logtoUserId, logtoUserId));

  return [...new Set(rows.map((row) => row.key))];
}

export async function getCurrentAppUserByLogtoUserId(logtoUserId: string): Promise<CurrentAppUser | null> {
  const user = await getAccessUserByLogtoUserId(logtoUserId);

  if (!user) {
    return null;
  }

  const permissionKeys = await listPermissionKeysForLogtoUser(logtoUserId);
  return {
    id: user.id,
    logtoUserId: user.logtoUserId,
    permissionKeys
  };
}
`,
    "utf8"
  );

  await writeFile(
    path.join(accessControlDir, "index.ts"),
    `export type {
  AccessPermission,
  AccessRole,
  AccessUser,
  CurrentAppUser,
  PermissionKey
} from "$lib/entities/access-control/model/types";
export {
  assignRoleToUser,
  createAccessPermission,
  createAccessRole,
  getAccessStoreErrorMessage,
  getAccessRoleByKey,
  getAccessUserByLogtoUserId,
  getCurrentAppUserByLogtoUserId,
  hasAnyAccessUsers,
  listAccessPermissions,
  listAccessPermissionIds,
  listAccessRoles,
  listAccessUsers,
  listPermissionKeysForLogtoUser,
  listRoleIdsForUser,
  setRolePermissions,
  setUserRoles,
  updateAccessPermission,
  updateAccessRole,
  upsertAccessUser
} from "$lib/entities/access-control/server/repository";
`,
    "utf8"
  );

  await writeFile(
    path.join(authorizationServerDir, "permissions.ts"),
    `import { listPermissionKeysForLogtoUser } from "$lib/entities/access-control";
import type { CurrentAppUser, PermissionKey } from "$lib/entities/access-control";

export function hasPermission(permissionKeys: PermissionKey[], requiredPermission: PermissionKey) {
  return permissionKeys.includes(requiredPermission);
}

export function requirePermission(permissionKeys: PermissionKey[], requiredPermission: PermissionKey) {
  if (!hasPermission(permissionKeys, requiredPermission)) {
    throw new Error(\`Missing required permission: \${requiredPermission}\`);
  }
}

export async function resolveCurrentAppUser(logtoUserId: string): Promise<CurrentAppUser> {
  const permissionKeys = await listPermissionKeysForLogtoUser(logtoUserId);

  return {
    id: logtoUserId,
    logtoUserId,
    permissionKeys
  };
}

export async function requireUserPermission(logtoUserId: string, requiredPermission: PermissionKey) {
  const permissionKeys = await listPermissionKeysForLogtoUser(logtoUserId);
  requirePermission(permissionKeys, requiredPermission);
}
`,
    "utf8"
  );
}

async function applySelections(targetDirectory, options) {
  if (options.auth === "logto") {
    await scaffoldLogtoFeature(targetDirectory);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const features = normalizeFeatures(args.features);
  const auth = args.auth;

  if (args.help) {
    console.log(helpText.trim());
    return;
  }

  if (!args.target) {
    console.error("Missing target directory. Use --help for usage.");
    process.exitCode = 1;
    return;
  }

  const unsupported = features.filter((feature) => !SUPPORTED_FEATURES.has(feature));
  if (unsupported.length > 0) {
    console.error(`Unsupported feature(s): ${unsupported.join(", ")}. Supported features: ${[...SUPPORTED_FEATURES].join(", ")}`);
    process.exitCode = 1;
    return;
  }

  if (!SUPPORTED_AUTH.has(auth)) {
    console.error(`Unsupported auth mode: ${auth}. Supported auth modes: ${[...SUPPORTED_AUTH].join(", ")}`);
    process.exitCode = 1;
    return;
  }

  const normalizedAuth = auth === "none" && features.includes("logto") ? "logto" : auth;

  const cwd = process.cwd();
  const targetDirectory = path.resolve(cwd, args.target);

  await mkdir(targetDirectory, { recursive: true });

  const empty = await isDirectoryEmpty(targetDirectory);
  if (!empty && !args.force) {
    console.error("Target directory is not empty. Re-run with --force to continue.");
    process.exitCode = 1;
    return;
  }

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const templateDirectory = path.resolve(scriptDir, "../template");

  await cp(templateDirectory, targetDirectory, { recursive: true, force: true });

  const projectName = args.name || path.basename(targetDirectory);
  const currentYear = String(new Date().getFullYear());

  await replaceTokens(targetDirectory, {
    "__PROJECT_NAME__": projectName,
    "__YEAR__": currentYear
  });

  await applySelections(targetDirectory, {
    auth: normalizedAuth
  });

  console.log(`Created SvelteKit template in ${targetDirectory}`);
  if (args.legacyFeaturesUsed) {
    console.warn("Legacy --features flag detected. Prefer --auth and --authorization for new scaffolds.");
  }
  if (normalizedAuth !== "none") {
    console.log(`Enabled auth: ${normalizedAuth}`);
    if (normalizedAuth === "logto") {
      console.log("Included RBAC starter scaffold.");
    }
  }
  if (features.length > 0) {
    console.log(`Enabled features: ${features.join(", ")}`);
  }
  console.log("Next steps:");
  console.log(`  cd ${args.target}`);
  console.log("  bun install");
  console.log("  bun run dev");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
