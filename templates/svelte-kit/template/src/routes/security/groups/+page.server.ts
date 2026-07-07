import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
  createAccessGroup,
  getAccessStoreErrorMessage,
  listAccessGroups,
  listAccessRoles,
  listAccessUsers,
  listRoleIdsForGroup,
  listUserIdsForGroup,
  setGroupRoles,
  setGroupUsers,
  updateAccessGroup
} from "$lib/entities/access-control";
import { requireCurrentRequestUser } from "$lib/features/authorization-rbac/server/permissions";

function readTrimmedString(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function getNotice(searchParams: URLSearchParams) {
  if (searchParams.get("created") === "1") {
    return "The new group was created successfully.";
  }

  if (searchParams.get("updatedUsers") === "1") {
    return "Group members were updated successfully.";
  }

  if (searchParams.get("updatedRoles") === "1") {
    return "Group roles were updated successfully.";
  }

  return null;
}

export const load: PageServerLoad = async (event) => {
  await requireCurrentRequestUser(event);

  try {
    const groups = await listAccessGroups();
    const groupUserIdsByGroupId: Record<string, string[]> = {};
    const groupRoleIdsByGroupId: Record<string, string[]> = {};

    for (const group of groups) {
      groupUserIdsByGroupId[group.id] = await listUserIdsForGroup(group.id);
      groupRoleIdsByGroupId[group.id] = await listRoleIdsForGroup(group.id);
    }

    return {
      groups,
      users: await listAccessUsers(),
      roles: await listAccessRoles(),
      groupUserIdsByGroupId,
      groupRoleIdsByGroupId,
      notice: getNotice(event.url.searchParams)
    };
  } catch (error) {
    return {
      groups: [],
      users: [],
      roles: [],
      groupUserIdsByGroupId: {},
      groupRoleIdsByGroupId: {},
      notice: null,
      errorMessage: getAccessStoreErrorMessage(error)
    };
  }
};

export const actions: Actions = {
  create: async (event) => {
    await requireCurrentRequestUser(event);

    const formData = await event.request.formData();
    const name = readTrimmedString(formData, "name");
    const description = readTrimmedString(formData, "description");
    const errors: Record<string, string> = {};

    if (!name) {
      errors.name = "Group name is required.";
    }

    if (Object.keys(errors).length > 0) {
      return fail(400, {
        intent: "create",
        errors,
        values: { name, description }
      });
    }

    try {
      await createAccessGroup({ name, description });
    } catch (error) {
      return fail(500, {
        intent: "create",
        message: getAccessStoreErrorMessage(error),
        values: { name, description }
      });
    }

    throw redirect(303, "/security/groups?created=1");
  },
  updateUsers: async (event) => {
    await requireCurrentRequestUser(event);

    const formData = await event.request.formData();
    const groupId = readTrimmedString(formData, "groupId");
    const userIds = formData
      .getAll("userIds")
      .map((value) => String(value).trim())
      .filter(Boolean);

    if (!groupId) {
      return fail(400, {
        intent: "updateUsers",
        message: "Group id is required.",
        values: { userIds }
      });
    }

    try {
      await setGroupUsers(groupId, userIds);
    } catch (error) {
      return fail(500, {
        intent: "updateUsers",
        message: getAccessStoreErrorMessage(error),
        values: { userIds }
      });
    }

    throw redirect(303, "/security/groups?updatedUsers=1");
  },
  updateRoles: async (event) => {
    await requireCurrentRequestUser(event);

    const formData = await event.request.formData();
    const groupId = readTrimmedString(formData, "groupId");
    const roleIds = formData
      .getAll("roleIds")
      .map((value) => String(value).trim())
      .filter(Boolean);

    if (!groupId) {
      return fail(400, {
        intent: "updateRoles",
        message: "Group id is required.",
        values: { roleIds }
      });
    }

    try {
      await setGroupRoles(groupId, roleIds);
    } catch (error) {
      return fail(500, {
        intent: "updateRoles",
        message: getAccessStoreErrorMessage(error),
        values: { roleIds }
      });
    }

    throw redirect(303, "/security/groups?updatedRoles=1");
  }
};
