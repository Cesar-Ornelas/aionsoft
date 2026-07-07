import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
  getAccessStoreErrorMessage,
  listAccessRoles,
  listAccessUsers,
  listRoleIdsForUser,
  setUserRoles,
  upsertAccessUser
} from "$lib/entities/access-control";
import { requireCurrentRequestUser } from "$lib/features/authorization-rbac/server/permissions";

function readTrimmedString(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function getNotice(searchParams: URLSearchParams) {
  if (searchParams.get("created") === "1") {
    return "The new user was created successfully.";
  }

  if (searchParams.get("updatedRoles") === "1") {
    return "User roles were updated successfully.";
  }

  return null;
}

export const load: PageServerLoad = async (event) => {
  await requireCurrentRequestUser(event);

  try {
    const users = await listAccessUsers();
    const userRoleIdsByUserId: Record<string, string[]> = {};

    for (const user of users) {
      userRoleIdsByUserId[user.id] = await listRoleIdsForUser(user.id);
    }

    return {
      users,
      roles: await listAccessRoles(),
      userRoleIdsByUserId,
      notice: getNotice(event.url.searchParams)
    };
  } catch (error) {
    return {
      users: [],
      roles: [],
      userRoleIdsByUserId: {},
      notice: null,
      errorMessage: getAccessStoreErrorMessage(error)
    };
  }
};

export const actions: Actions = {
  create: async (event) => {
    await requireCurrentRequestUser(event);

    const formData = await event.request.formData();
    const logtoUserId = readTrimmedString(formData, "logtoUserId");
    const displayName = readTrimmedString(formData, "displayName");
    const email = readTrimmedString(formData, "email").toLowerCase();
    const errors: Record<string, string> = {};

    if (!logtoUserId) {
      errors.logtoUserId = "Logto user id is required.";
    }

    if (Object.keys(errors).length > 0) {
      return fail(400, {
        intent: "create",
        errors,
        values: { logtoUserId, displayName, email }
      });
    }

    try {
      await upsertAccessUser({
        logtoUserId,
        displayName: displayName || null,
        email: email || null
      });
    } catch (error) {
      return fail(500, {
        intent: "create",
        message: getAccessStoreErrorMessage(error),
        values: { logtoUserId, displayName, email }
      });
    }

    throw redirect(303, "/security?created=1");
  },
  updateRoles: async (event) => {
    await requireCurrentRequestUser(event);

    const formData = await event.request.formData();
    const userId = readTrimmedString(formData, "userId");
    const roleIds = formData
      .getAll("roleIds")
      .map((value) => String(value).trim())
      .filter(Boolean);

    if (!userId) {
      return fail(400, {
        intent: "updateRoles",
        message: "User id is required.",
        values: { roleIds }
      });
    }

    try {
      await setUserRoles(userId, roleIds);
    } catch (error) {
      return fail(500, {
        intent: "updateRoles",
        message: getAccessStoreErrorMessage(error),
        values: { roleIds }
      });
    }

    throw redirect(303, "/security?updatedRoles=1");
  }
};
