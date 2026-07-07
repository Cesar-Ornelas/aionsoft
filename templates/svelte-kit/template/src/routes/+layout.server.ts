import { env } from "$env/dynamic/private";
import { getUnreadNotificationsCountForUser, listNotificationsForUser } from "$lib/entities/notifications";

function readClaim(record: unknown, key: string) {
  if (!record || typeof record !== "object") {
    return "";
  }

  const value = (record as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
}

export const load = (async ({ locals }: { locals: App.Locals }) => {
  const profileName = readClaim(locals.user, "name");
  const profileEmail = readClaim(locals.user, "email");
  const profileAvatar = readClaim(locals.user, "picture");
  const fallbackName = locals.currentAppUser?.logtoUserId || "App User";
  const notificationsFilter = "all" as const;

  const notifications = locals.currentAppUser
    ? await listNotificationsForUser({
        userId: locals.currentAppUser.id,
        filter: notificationsFilter,
        limit: 30
      })
    : [];

  const unreadNotificationsCount = locals.currentAppUser
    ? await getUnreadNotificationsCountForUser(locals.currentAppUser.id)
    : 0;

  return {
    user: {
      name: profileName || fallbackName,
      email: profileEmail,
      avatar: profileAvatar || "https://github.com/shadcn.png"
    },
    hasLogtoManagement: Boolean(env.LOGTO_M2M_APP_ID?.trim()),
    notifications,
    notificationsFilter,
    unreadNotificationsCount
  };
}) satisfies ({ locals }: { locals: App.Locals }) => Promise<{
  user: { name: string; email: string; avatar: string };
  hasLogtoManagement: boolean;
  notifications: Array<{
    id: string;
    recipientScope: "global" | "user";
    recipientUserId: string | null;
    type: "info" | "success" | "warning" | "error";
    title: string;
    message: string;
    actionHref: string | null;
    readAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  notificationsFilter: "all";
  unreadNotificationsCount: number;
}>;