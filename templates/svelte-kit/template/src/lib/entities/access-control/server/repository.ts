import { and, asc, eq } from "drizzle-orm";
import { getDb } from "$lib/server/db";
import {
  appGroupRoles,
  appGroups,
  appPermissions,
  appRolePermissions,
  appRoles,
  appUserGroups,
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

export function getAccessStoreErrorMessage(
  error: unknown,
  fallback = "The requested access change could not be completed."
) {
  if (error && typeof error === "object" && "code" in error && error.code === "23505") {
    return "An item with the same key already exists.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function isMissingTableError(error: unknown) {
  return Boolean(
    error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "42P01"
  );
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

export async function listAccessGroups() {
  const db = getDb();

  return db
    .select({
      id: appGroups.id,
      key: appGroups.key,
      name: appGroups.name,
      description: appGroups.description,
      createdAt: appGroups.createdAt,
      updatedAt: appGroups.updatedAt
    })
    .from(appGroups)
    .orderBy(asc(appGroups.name));
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

export async function getAccessGroupByKey(groupKey: string) {
  const db = getDb();
  const [record] = await db
    .select({
      id: appGroups.id,
      key: appGroups.key,
      name: appGroups.name,
      description: appGroups.description,
      createdAt: appGroups.createdAt,
      updatedAt: appGroups.updatedAt
    })
    .from(appGroups)
    .where(eq(appGroups.key, groupKey))
    .limit(1);

  return record ?? null;
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

export async function createAccessGroup(input: { key?: string; name?: string; description?: string }) {
  const db = getDb();
  const groupKey = normalizeKey(input.key || input.name, "group");
  const groupName = String(input.name || input.key || "Group").trim();

  const [record] = await db
    .insert(appGroups)
    .values({
      key: groupKey,
      name: groupName,
      description: input.description || null
    })
    .returning({
      id: appGroups.id,
      key: appGroups.key,
      name: appGroups.name,
      description: appGroups.description,
      createdAt: appGroups.createdAt,
      updatedAt: appGroups.updatedAt
    });

  return record;
}

export async function updateAccessRole(
  roleId: string,
  input: { key?: string; name?: string; description?: string }
) {
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

export async function updateAccessGroup(
  groupId: string,
  input: { key?: string; name?: string; description?: string }
) {
  const db = getDb();
  const groupKey = normalizeKey(input.key || input.name, "group");
  const groupName = String(input.name || input.key || "Group").trim();

  const [record] = await db
    .update(appGroups)
    .set({
      key: groupKey,
      name: groupName,
      description: input.description || null,
      updatedAt: new Date()
    })
    .where(eq(appGroups.id, groupId))
    .returning({
      id: appGroups.id,
      key: appGroups.key,
      name: appGroups.name,
      description: appGroups.description,
      createdAt: appGroups.createdAt,
      updatedAt: appGroups.updatedAt
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

export async function updateAccessPermission(
  permissionId: string,
  input: { key?: string; name?: string; description?: string }
) {
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

export async function deleteAccessUser(userId: string) {
  const db = getDb();
  const [deleted] = await db.delete(appUsers).where(eq(appUsers.id, userId)).returning({ id: appUsers.id });
  return deleted ?? null;
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

export async function setGroupUsers(groupId: string, userIds: string[]) {
  const db = getDb();
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];

  await db.delete(appUserGroups).where(eq(appUserGroups.groupId, groupId));

  if (uniqueUserIds.length === 0) {
    return;
  }

  await db
    .insert(appUserGroups)
    .values(uniqueUserIds.map((userId) => ({ userId, groupId })))
    .onConflictDoNothing();
}

export async function setGroupRoles(groupId: string, roleIds: string[]) {
  const db = getDb();
  const uniqueRoleIds = [...new Set(roleIds.filter(Boolean))];

  await db.delete(appGroupRoles).where(eq(appGroupRoles.groupId, groupId));

  if (uniqueRoleIds.length === 0) {
    return;
  }

  await db
    .insert(appGroupRoles)
    .values(uniqueRoleIds.map((roleId) => ({ groupId, roleId })))
    .onConflictDoNothing();
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

export async function listGroupIdsForUser(userId: string) {
  const db = getDb();
  let rows: Array<{ groupId: string }> = [];

  try {
    rows = await db
      .select({ groupId: appUserGroups.groupId })
      .from(appUserGroups)
      .where(eq(appUserGroups.userId, userId));
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw error;
    }
  }

  return rows.map((row) => row.groupId);
}

export async function listGroupKeysForUser(userId: string) {
  const db = getDb();
  let rows: Array<{ key: string }> = [];

  try {
    rows = await db
      .select({ key: appGroups.key })
      .from(appUserGroups)
      .innerJoin(appGroups, eq(appGroups.id, appUserGroups.groupId))
      .where(eq(appUserGroups.userId, userId));
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw error;
    }
  }

  return [...new Set(rows.map((row) => row.key))];
}

export async function listUserIdsForGroup(groupId: string) {
  const db = getDb();
  const rows = await db
    .select({ userId: appUserGroups.userId })
    .from(appUserGroups)
    .where(eq(appUserGroups.groupId, groupId));

  return rows.map((row) => row.userId);
}

export async function listRoleIdsForGroup(groupId: string) {
  const db = getDb();
  const rows = await db
    .select({ roleId: appGroupRoles.roleId })
    .from(appGroupRoles)
    .where(eq(appGroupRoles.groupId, groupId));

  return rows.map((row) => row.roleId);
}

export async function listPermissionIdsForRole(roleId: string) {
  const db = getDb();
  const rows = await db
    .select({ permissionId: appRolePermissions.permissionId })
    .from(appRolePermissions)
    .where(eq(appRolePermissions.roleId, roleId));

  return rows.map((row) => row.permissionId);
}

export async function listPermissionKeysForLogtoUser(logtoUserId: string) {
  const db = getDb();
  const directPermissionRows = await db
    .select({ key: appPermissions.key })
    .from(appUsers)
    .innerJoin(appUserRoles, eq(appUserRoles.userId, appUsers.id))
    .innerJoin(appRolePermissions, eq(appRolePermissions.roleId, appUserRoles.roleId))
    .innerJoin(appPermissions, eq(appPermissions.id, appRolePermissions.permissionId))
    .where(eq(appUsers.logtoUserId, logtoUserId));

  let groupPermissionRows: Array<{ key: string }> = [];

  try {
    groupPermissionRows = await db
      .select({ key: appPermissions.key })
      .from(appUsers)
      .innerJoin(appUserGroups, eq(appUserGroups.userId, appUsers.id))
      .innerJoin(appGroupRoles, eq(appGroupRoles.groupId, appUserGroups.groupId))
      .innerJoin(appRolePermissions, eq(appRolePermissions.roleId, appGroupRoles.roleId))
      .innerJoin(appPermissions, eq(appPermissions.id, appRolePermissions.permissionId))
      .where(eq(appUsers.logtoUserId, logtoUserId));
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw error;
    }
  }

  return [...new Set([...directPermissionRows, ...groupPermissionRows].map((row) => row.key))];
}

export async function getCurrentAppUserByLogtoUserId(logtoUserId: string): Promise<CurrentAppUser | null> {
  const user = await getAccessUserByLogtoUserId(logtoUserId);

  if (!user) {
    return null;
  }

  const roleIds = await listRoleIdsForUser(user.id);
  const groupIds = await listGroupIdsForUser(user.id);
  const groupKeys = await listGroupKeysForUser(user.id);
  const permissionKeys = await listPermissionKeysForLogtoUser(logtoUserId);
  return {
    id: user.id,
    logtoUserId: user.logtoUserId,
    roleIds,
    groupIds,
    groupKeys,
    permissionKeys
  };
}
