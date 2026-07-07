import { json, redirect } from "@sveltejs/kit";
import {
  deleteNotificationForUser,
  getNotificationsStoreErrorMessage,
  getUnreadNotificationsCountForUser,
  listNotificationsForUser,
  markAllNotificationsReadForUser,
  markNotificationReadForUser
} from "$lib/entities/notifications";
import { requireCurrentRequestUser } from "$lib/features/authorization-rbac/server/permissions";

function readTrimmedString(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function resolveRedirectTo(raw: string) {
  if (!raw.startsWith("/")) {
    return "/?notifications=1";
  }

  return raw;
}

function wantsJson(request: Request) {
  return request.headers.get("accept")?.includes("application/json") ?? false;
}

async function buildJsonPayload(userId: string) {
  const [notifications, unreadNotificationsCount] = await Promise.all([
    listNotificationsForUser({ userId, filter: "all", limit: 30 }),
    getUnreadNotificationsCountForUser(userId)
  ]);

  return { notifications, unreadNotificationsCount };
}

export const POST = async (event) => {
  const currentUser = await requireCurrentRequestUser(event);
  const formData = await event.request.formData();
  const acceptsJson = wantsJson(event.request);
  const intent = readTrimmedString(formData, "intent");
  const notificationId = readTrimmedString(formData, "notificationId");
  const redirectTo = resolveRedirectTo(readTrimmedString(formData, "redirectTo") || "/?notifications=1");

  if (intent === "markRead" && notificationId) {
    try {
      await markNotificationReadForUser(notificationId, currentUser.id);
    } catch (error) {
      const message = getNotificationsStoreErrorMessage(error);

      if (acceptsJson) {
        return json({ ok: false, message }, { status: 500 });
      }

      throw redirect(303, `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}notificationsError=${encodeURIComponent(message)}`);
    }

    if (acceptsJson) {
      return json({ ok: true, ...(await buildJsonPayload(currentUser.id)) });
    }

    throw redirect(303, redirectTo);
  }

  if (intent === "markAllRead") {
    try {
      await markAllNotificationsReadForUser(currentUser.id);
    } catch (error) {
      const message = getNotificationsStoreErrorMessage(error);

      if (acceptsJson) {
        return json({ ok: false, message }, { status: 500 });
      }

      throw redirect(303, `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}notificationsError=${encodeURIComponent(message)}`);
    }

    if (acceptsJson) {
      return json({ ok: true, ...(await buildJsonPayload(currentUser.id)) });
    }

    throw redirect(303, redirectTo);
  }

  if (intent === "delete" && notificationId) {
    try {
      await deleteNotificationForUser(notificationId, currentUser.id);
    } catch (error) {
      const message = getNotificationsStoreErrorMessage(error);

      if (acceptsJson) {
        return json({ ok: false, message }, { status: 500 });
      }

      throw redirect(303, `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}notificationsError=${encodeURIComponent(message)}`);
    }

    if (acceptsJson) {
      return json({ ok: true, ...(await buildJsonPayload(currentUser.id)) });
    }

    throw redirect(303, redirectTo);
  }

  if (acceptsJson) {
    return json({ ok: false, message: "Invalid notifications action." }, { status: 400 });
  }

  throw redirect(303, redirectTo);
};
