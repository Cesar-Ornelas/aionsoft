import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
  createAccessPermission,
  getAccessStoreErrorMessage,
  listAccessPermissions,
  updateAccessPermission
} from "$lib/entities/access-control";
import { requireCurrentRequestUser } from "$lib/features/authorization-rbac/server/permissions";

function readTrimmedString(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function getNotice(searchParams: URLSearchParams) {
  if (searchParams.get("created") === "1") {
    return "The new permission was created successfully.";
  }

  if (searchParams.get("updatedDescription") === "1") {
    return "Permission description was updated successfully.";
  }

  return null;
}

export const load: PageServerLoad = async (event) => {
  await requireCurrentRequestUser(event);

  try {
    return {
      permissions: await listAccessPermissions(),
      notice: getNotice(event.url.searchParams)
    };
  } catch (error) {
    return {
      permissions: [],
      notice: null,
      errorMessage: getAccessStoreErrorMessage(error)
    };
  }
};

export const actions: Actions = {
  create: async (event) => {
    await requireCurrentRequestUser(event);

    const formData = await event.request.formData();
    const key = readTrimmedString(formData, "key");
    const description = readTrimmedString(formData, "description");
    const errors: Record<string, string> = {};

    if (!key) {
      errors.key = "Permission key is required.";
    }

    if (Object.keys(errors).length > 0) {
      return fail(400, {
        intent: "create",
        errors,
        values: { key, description }
      });
    }

    try {
      await createAccessPermission({ key, description });
    } catch (error) {
      return fail(500, {
        intent: "create",
        message: getAccessStoreErrorMessage(error),
        values: { key, description }
      });
    }

    throw redirect(303, "/security/permissions?created=1");
  },
  updateDescription: async (event) => {
    await requireCurrentRequestUser(event);

    const formData = await event.request.formData();
    const permissionId = readTrimmedString(formData, "permissionId");
    const description = readTrimmedString(formData, "description");

    if (!permissionId) {
      return fail(400, {
        intent: "updateDescription",
        message: "Permission id is required.",
        values: { description }
      });
    }

    const permissions = await listAccessPermissions();
    const target = permissions.find((permission) => permission.id === permissionId);

    if (!target) {
      return fail(404, {
        intent: "updateDescription",
        message: "Permission was not found.",
        values: { description }
      });
    }

    try {
      await updateAccessPermission(permissionId, {
        key: target.key,
        name: target.name,
        description
      });
    } catch (error) {
      return fail(500, {
        intent: "updateDescription",
        message: getAccessStoreErrorMessage(error),
        values: { description }
      });
    }

    throw redirect(303, "/security/permissions?updatedDescription=1");
  }
};
