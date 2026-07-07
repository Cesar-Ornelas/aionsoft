import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
  deleteAccessUser,
  getAccessStoreErrorMessage,
  listAccessRoles,
  listAccessUsers,
  listRoleIdsForUser,
  setUserRoles,
  upsertAccessUser
} from "$lib/entities/access-control";
import { publishNotification } from "$lib/entities/notifications";
import { requireCurrentRequestUser } from "$lib/features/authorization-rbac/server/permissions";
import { getPublicErrorMessage, updateLogtoUserCredentials } from "$lib/features/auth-logto/server/management";

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

  if (searchParams.get("updatedUser") === "1") {
    return "User credentials were updated successfully.";
  }

  if (searchParams.get("deleted") === "1") {
    return "User removed successfully.";
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
    const currentUser = await requireCurrentRequestUser(event);

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

      await publishNotification({
        recipientScope: "global",
        type: "success",
        title: "User created",
        message: `A new user (${logtoUserId}) was added to access control.`,
        actionHref: "/security"
      });

      await publishNotification({
        recipientScope: "user",
        recipientUserId: currentUser.id,
        type: "success",
        title: "Security updated",
        message: `You created user ${logtoUserId}.`,
        actionHref: "/security"
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
    const currentUser = await requireCurrentRequestUser(event);

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

      await publishNotification({
        recipientScope: "user",
        recipientUserId: currentUser.id,
        type: "info",
        title: "User roles updated",
        message: "Role assignments were updated successfully.",
        actionHref: "/security"
      });
    } catch (error) {
      return fail(500, {
        intent: "updateRoles",
        message: getAccessStoreErrorMessage(error),
        values: { roleIds }
      });
    }

    throw redirect(303, "/security?updatedRoles=1");
  },
  updateUser: async (event) => {
    const currentUser = await requireCurrentRequestUser(event);

    const formData = await event.request.formData();
    const userId = readTrimmedString(formData, "userId");
    const email = readTrimmedString(formData, "email").toLowerCase();
    const password = readTrimmedString(formData, "password");

    if (!userId) {
      return fail(400, {
        intent: "updateUser",
        message: "User id is required.",
        values: { userId, email }
      });
    }

    if (!email && !password) {
      return fail(400, {
        intent: "updateUser",
        message: "Provide an email or password to update.",
        values: { userId, email }
      });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fail(400, {
        intent: "updateUser",
        message: "Enter a valid email address.",
        values: { userId, email }
      });
    }

    try {
      const users = await listAccessUsers();
      const selectedUser = users.find((user) => user.id === userId);

      if (!selectedUser) {
        return fail(404, {
          intent: "updateUser",
          message: "The selected user could not be found.",
          values: { userId, email }
        });
      }

      await updateLogtoUserCredentials({
        logtoUserId: selectedUser.logtoUserId,
        email: email || undefined,
        password: password || undefined
      });

      await upsertAccessUser({
        logtoUserId: selectedUser.logtoUserId,
        displayName: selectedUser.displayName,
        email: email || selectedUser.email
      });

      await publishNotification({
        recipientScope: "user",
        recipientUserId: currentUser.id,
        type: "info",
        title: "User credentials updated",
        message: `Credentials were updated for ${selectedUser.logtoUserId}.`,
        actionHref: "/security"
      });
    } catch (error) {
      return fail(500, {
        intent: "updateUser",
        message: getPublicErrorMessage(error),
        values: { userId, email }
      });
    }

    throw redirect(303, "/security?updatedUser=1");
  },
  delete: async (event) => {
    const currentUser = await requireCurrentRequestUser(event);

    const formData = await event.request.formData();
    const userId = readTrimmedString(formData, "userId");
    const confirmValue = readTrimmedString(formData, "confirmValue");

    if (!userId) {
      return fail(400, {
        intent: "delete",
        message: "User id is required.",
        values: { userId, confirmValue }
      });
    }

    try {
      const users = await listAccessUsers();
      const selectedUser = users.find((user) => user.id === userId);

      if (!selectedUser) {
        return fail(404, {
          intent: "delete",
          message: "The selected user could not be found.",
          values: { userId, confirmValue }
        });
      }

      if (confirmValue !== selectedUser.logtoUserId) {
        return fail(400, {
          intent: "delete",
          errors: {
            confirmValue: "Type the exact Logto user ID to confirm deletion."
          },
          values: { userId, confirmValue }
        });
      }

      await deleteAccessUser(userId);

      await publishNotification({
        recipientScope: "global",
        type: "warning",
        title: "User removed",
        message: `User ${selectedUser.logtoUserId} was removed from access control.`,
        actionHref: "/security"
      });

      await publishNotification({
        recipientScope: "user",
        recipientUserId: currentUser.id,
        type: "warning",
        title: "Security updated",
        message: `You removed user ${selectedUser.logtoUserId}.`,
        actionHref: "/security"
      });
    } catch (error) {
      return fail(500, {
        intent: "delete",
        message: getAccessStoreErrorMessage(error),
        values: { userId, confirmValue }
      });
    }

    throw redirect(303, "/security?deleted=1");
  }
};

