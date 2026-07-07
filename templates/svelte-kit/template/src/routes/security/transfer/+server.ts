import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  createAccessPermission,
  createAccessRole,
  listAccessPermissions,
  listAccessRoles,
  listAccessUsers,
  listPermissionIdsForRole,
  listRoleIdsForUser,
  setRolePermissions,
  setUserRoles,
  updateAccessPermission,
  updateAccessRole,
  upsertAccessUser
} from "$lib/entities/access-control";
import { requireCurrentRequestUser } from "$lib/features/authorization-rbac/server/permissions";

type TransferPayload = {
  version: 1;
  exportedAt: string;
  roles: Array<{ key: string; name: string; description: string | null }>;
  permissions: Array<{ key: string; name: string; description: string | null }>;
  users: Array<{
    logtoUserId: string;
    email: string | null;
    displayName: string | null;
    roleKeys: string[];
  }>;
  rolePermissions: Array<{ roleKey: string; permissionKeys: string[] }>;
};

function trim(value: unknown) {
  return String(value ?? "").trim();
}

function safeRedirectTo(value: unknown) {
  const fallback = "/security/users";
  const next = trim(value);

  if (!next.startsWith("/security")) {
    return fallback;
  }

  return next;
}

function statusRedirect(basePath: string, imported: "1" | "0", reason?: string) {
  const url = new URL(basePath, "http://security.local");
  url.searchParams.set("imported", imported);

  if (reason) {
    url.searchParams.set("importReason", reason);
  }

  return `${url.pathname}${url.search}`;
}

function ensureArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function readRoleEntries(value: unknown) {
  return ensureArray(value)
    .map((entry) => {
      const key = trim((entry as { key?: unknown })?.key).toLowerCase();

      if (!key) {
        return null;
      }

      return {
        key,
        name: trim((entry as { name?: unknown })?.name) || key,
        description: trim((entry as { description?: unknown })?.description) || null
      };
    })
    .filter((entry): entry is { key: string; name: string; description: string | null } => Boolean(entry));
}

function readPermissionEntries(value: unknown) {
  return ensureArray(value)
    .map((entry) => {
      const key = trim((entry as { key?: unknown })?.key).toLowerCase();

      if (!key) {
        return null;
      }

      return {
        key,
        name: trim((entry as { name?: unknown })?.name) || key,
        description: trim((entry as { description?: unknown })?.description) || null
      };
    })
    .filter((entry): entry is { key: string; name: string; description: string | null } => Boolean(entry));
}

function readUserEntries(value: unknown) {
  return ensureArray(value)
    .map((entry) => {
      const logtoUserId = trim((entry as { logtoUserId?: unknown })?.logtoUserId);

      if (!logtoUserId) {
        return null;
      }

      return {
        logtoUserId,
        email: trim((entry as { email?: unknown })?.email) || null,
        displayName: trim((entry as { displayName?: unknown })?.displayName) || null,
        roleKeys: ensureArray((entry as { roleKeys?: unknown })?.roleKeys)
          .map((roleKey) => trim(roleKey).toLowerCase())
          .filter(Boolean)
      };
    })
    .filter(
      (
        entry
      ): entry is { logtoUserId: string; email: string | null; displayName: string | null; roleKeys: string[] } =>
        Boolean(entry)
    );
}

function readRolePermissionEntries(value: unknown) {
  return ensureArray(value)
    .map((entry) => {
      const roleKey = trim((entry as { roleKey?: unknown })?.roleKey).toLowerCase();

      if (!roleKey) {
        return null;
      }

      return {
        roleKey,
        permissionKeys: ensureArray((entry as { permissionKeys?: unknown })?.permissionKeys)
          .map((permissionKey) => trim(permissionKey).toLowerCase())
          .filter(Boolean)
      };
    })
    .filter((entry): entry is { roleKey: string; permissionKeys: string[] } => Boolean(entry));
}

export const GET: RequestHandler = async (event) => {
  await requireCurrentRequestUser(event);

  const [roles, permissions, users] = await Promise.all([
    listAccessRoles(),
    listAccessPermissions(),
    listAccessUsers()
  ]);

  const roleById = new Map(roles.map((role) => [role.id, role]));
  const permissionById = new Map(permissions.map((permission) => [permission.id, permission]));

  const usersWithRoles = await Promise.all(
    users.map(async (user) => {
      const roleIds = await listRoleIdsForUser(user.id);

      return {
        logtoUserId: user.logtoUserId,
        email: user.email,
        displayName: user.displayName,
        roleKeys: roleIds.map((roleId) => roleById.get(roleId)?.key).filter((key): key is string => Boolean(key))
      };
    })
  );

  const rolePermissions = await Promise.all(
    roles.map(async (role) => {
      const permissionIds = await listPermissionIdsForRole(role.id);

      return {
        roleKey: role.key,
        permissionKeys: permissionIds
          .map((permissionId) => permissionById.get(permissionId)?.key)
          .filter((key): key is string => Boolean(key))
      };
    })
  );

  const payload: TransferPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    roles: roles.map((role) => ({ key: role.key, name: role.name, description: role.description })),
    permissions: permissions.map((permission) => ({
      key: permission.key,
      name: permission.name,
      description: permission.description
    })),
    users: usersWithRoles,
    rolePermissions
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="security-export-${new Date().toISOString().slice(0, 10)}.json"`
    }
  });
};

export const POST: RequestHandler = async (event) => {
  await requireCurrentRequestUser(event);

  const formData = await event.request.formData();
  const redirectTo = safeRedirectTo(formData.get("redirectTo"));
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    throw redirect(303, statusRedirect(redirectTo, "0", "missing-file"));
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw redirect(303, statusRedirect(redirectTo, "0", "invalid-json"));
  }

  if (!parsed || typeof parsed !== "object") {
    throw redirect(303, statusRedirect(redirectTo, "0", "invalid-format"));
  }

  const roles = readRoleEntries((parsed as { roles?: unknown }).roles);
  const permissions = readPermissionEntries((parsed as { permissions?: unknown }).permissions);
  const users = readUserEntries((parsed as { users?: unknown }).users);
  const rolePermissions = readRolePermissionEntries((parsed as { rolePermissions?: unknown }).rolePermissions);

  const currentRoles = await listAccessRoles();
  const roleIdByKey = new Map(currentRoles.map((role) => [role.key, role.id]));

  for (const role of roles) {
    const existingRoleId = roleIdByKey.get(role.key);

    if (existingRoleId) {
      await updateAccessRole(existingRoleId, {
        key: role.key,
        name: role.name,
        description: role.description ?? undefined
      });
      continue;
    }

    const createdRole = await createAccessRole({
      key: role.key,
      name: role.name,
      description: role.description ?? undefined
    });
    roleIdByKey.set(createdRole.key, createdRole.id);
  }

  const currentPermissions = await listAccessPermissions();
  const permissionIdByKey = new Map(currentPermissions.map((permission) => [permission.key, permission.id]));

  for (const permission of permissions) {
    const existingPermissionId = permissionIdByKey.get(permission.key);

    if (existingPermissionId) {
      await updateAccessPermission(existingPermissionId, {
        key: permission.key,
        name: permission.name,
        description: permission.description ?? undefined
      });
      continue;
    }

    const createdPermission = await createAccessPermission({
      key: permission.key,
      name: permission.name,
      description: permission.description ?? undefined
    });
    permissionIdByKey.set(createdPermission.key, createdPermission.id);
  }

  for (const user of users) {
    const persistedUser = await upsertAccessUser({
      logtoUserId: user.logtoUserId,
      email: user.email,
      displayName: user.displayName
    });

    const roleIds = user.roleKeys
      .map((roleKey) => roleIdByKey.get(roleKey))
      .filter((roleId): roleId is string => Boolean(roleId));

    await setUserRoles(persistedUser.id, roleIds);
  }

  for (const assignment of rolePermissions) {
    const roleId = roleIdByKey.get(assignment.roleKey);

    if (!roleId) {
      continue;
    }

    const permissionIds = assignment.permissionKeys
      .map((permissionKey) => permissionIdByKey.get(permissionKey))
      .filter((permissionId): permissionId is string => Boolean(permissionId));

    await setRolePermissions(roleId, permissionIds);
  }

  throw redirect(303, statusRedirect(redirectTo, "1"));
};