import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
  createAccessRole,
  getAccessStoreErrorMessage,
  listAccessPermissions,
  listPermissionIdsForRole,
  listAccessRoles,
  setRolePermissions
} from "$lib/entities/access-control";
import { publishNotification } from "$lib/entities/notifications";
import { requireCurrentRequestUser } from "$lib/features/authorization-rbac/server/permissions";

function readTrimmedString(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function getNotice(searchParams: URLSearchParams) {
  if (searchParams.get("created") === "1") {
    return "The new role was created successfully.";
  }

  if (searchParams.get("updatedPermissions") === "1") {
    return "Role permissions were updated successfully.";
  }

  return null;
}

export const load: PageServerLoad = async (event) => {
  await requireCurrentRequestUser(event);

  try {
    const roles = await listAccessRoles();
    const rolePermissionIdsByRoleId: Record<string, string[]> = {};

    for (const role of roles) {
      rolePermissionIdsByRoleId[role.id] = await listPermissionIdsForRole(role.id);
    }

    return {
      roles,
      permissions: await listAccessPermissions(),
      rolePermissionIdsByRoleId,
      notice: getNotice(event.url.searchParams)
    };
  } catch (error) {
    return {
      roles: [],
      permissions: [],
      rolePermissionIdsByRoleId: {},
      notice: null,
      errorMessage: getAccessStoreErrorMessage(error)
    };
  }
};

export const actions: Actions = {
  create: async (event) => {
    const currentUser = await requireCurrentRequestUser(event);

    const formData = await event.request.formData();
    const name = readTrimmedString(formData, "name");
    const description = readTrimmedString(formData, "description");
    const errors: Record<string, string> = {};

    if (!name) {
      errors.name = "Role name is required.";
    }

    if (Object.keys(errors).length > 0) {
      return fail(400, {
        intent: "create",
        errors,
        values: { name, description }
      });
    }

    try {
      const role = await createAccessRole({ name, description });

      await publishNotification({
        recipientScope: "global",
        type: "success",
        title: "Role created",
        message: `Role ${role.key} was created.`,
        actionHref: "/security/roles"
      });

      await publishNotification({
        recipientScope: "user",
        recipientUserId: currentUser.id,
        type: "success",
        title: "Role created",
        message: `You created role ${role.key}.`,
        actionHref: "/security/roles"
      });
    } catch (error) {
      return fail(500, {
        intent: "create",
        message: getAccessStoreErrorMessage(error),
        values: { name, description }
      });
    }

    throw redirect(303, "/security/roles?created=1");
  },
  updatePermissions: async (event) => {
    const currentUser = await requireCurrentRequestUser(event);

    const formData = await event.request.formData();
    const roleId = readTrimmedString(formData, "roleId");
    const permissionIds = formData
      .getAll("permissionIds")
      .map((value) => String(value).trim())
      .filter(Boolean);

    if (!roleId) {
      return fail(400, {
        intent: "updatePermissions",
        message: "Role id is required.",
        values: { permissionIds }
      });
    }

    try {
      await setRolePermissions(roleId, permissionIds);

      await publishNotification({
        recipientScope: "user",
        recipientUserId: currentUser.id,
        type: "info",
        title: "Role permissions updated",
        message: "Permissions were updated for a role.",
        actionHref: "/security/roles"
      });
    } catch (error) {
      return fail(500, {
        intent: "updatePermissions",
        message: getAccessStoreErrorMessage(error),
        values: { permissionIds }
      });
    }

    throw redirect(303, "/security/roles?updatedPermissions=1");
  }
};
