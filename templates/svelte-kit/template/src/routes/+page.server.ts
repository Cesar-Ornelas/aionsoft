import { fail, redirect } from "@sveltejs/kit";
import { publishNotification } from "$lib/entities/notifications";
import { requireCurrentRequestUser } from "$lib/features/authorization-rbac/server/permissions";
import type { Actions, PageServerLoad } from "./$types";
import { getSettingsHealth } from "$lib/features/settings-health/server";

export const load: PageServerLoad = async () => {
  return {
    health: await getSettingsHealth()
  };
};

function readTrimmedString(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function getTypeMetadata(type: string) {
  if (type === "success") {
    return {
      type: "success" as const,
      title: "Success notification",
      message: "This is a sample success notification for testing."
    };
  }

  if (type === "warning") {
    return {
      type: "warning" as const,
      title: "Warning notification",
      message: "This is a sample warning notification for testing."
    };
  }

  if (type === "error") {
    return {
      type: "error" as const,
      title: "Error notification",
      message: "This is a sample error notification for testing."
    };
  }

  return {
    type: "info" as const,
    title: "Info notification",
    message: "This is a sample info notification for testing."
  };
}

export const actions: Actions = {
  triggerNotification: async (event) => {
    const currentUser = await requireCurrentRequestUser(event);
    const formData = await event.request.formData();
    const inputType = readTrimmedString(formData, "type").toLowerCase();
    const metadata = getTypeMetadata(inputType);

    try {
      await publishNotification({
        recipientScope: "user",
        recipientUserId: currentUser.id,
        type: metadata.type,
        title: metadata.title,
        message: metadata.message,
        actionHref: "/"
      });
    } catch {
      return fail(500, {
        intent: "triggerNotification",
        message: "Unable to publish the test notification."
      });
    }

    throw redirect(303, "/?notifications=1");
  }
};
