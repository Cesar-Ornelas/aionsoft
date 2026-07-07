import { error, redirect, type RequestEvent } from "@sveltejs/kit";
import type { CurrentAppUser, PermissionKey } from "$lib/entities/access-control";
import { resolveCurrentRequestUser } from "$lib/features/authorization-rbac/server/current-request-user";

export function hasPermission(permissionKeys: PermissionKey[], requiredPermission: PermissionKey) {
  return permissionKeys.includes(requiredPermission);
}

export function hasAnyPermission(permissionKeys: PermissionKey[], requiredPermissions: PermissionKey[]) {
  return requiredPermissions.some((permission) => permissionKeys.includes(permission));
}

export function requirePermission(permissionKeys: PermissionKey[], requiredPermission: PermissionKey) {
  if (!hasPermission(permissionKeys, requiredPermission)) {
    throw error(403, `Missing required permission: ${requiredPermission}`);
  }
}

export async function requireCurrentRequestUser(event: RequestEvent): Promise<CurrentAppUser> {
  if (!event.locals.user) {
    const returnTo = `${event.url.pathname}${event.url.search}`;
    throw redirect(302, `/auth/sign-in?returnTo=${encodeURIComponent(returnTo || "/")}`);
  }

  const currentAppUser = await resolveCurrentRequestUser(event);

  if (!currentAppUser) {
    throw error(403, "The authenticated identity is not linked to a local app user.");
  }

  return currentAppUser;
}

export async function requireUserPermission(event: RequestEvent, requiredPermission: PermissionKey) {
  const currentAppUser = await requireCurrentRequestUser(event);
  requirePermission(currentAppUser.permissionKeys, requiredPermission);
  return currentAppUser;
}

export async function requireAnyUserPermission(event: RequestEvent, requiredPermissions: PermissionKey[]) {
  const currentAppUser = await requireCurrentRequestUser(event);

  if (!hasAnyPermission(currentAppUser.permissionKeys, requiredPermissions)) {
    throw error(403, `Missing one of required permissions: ${requiredPermissions.join(", ")}`);
  }

  return currentAppUser;
}
