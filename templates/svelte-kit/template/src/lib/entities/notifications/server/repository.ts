import { and, desc, eq, isNotNull, isNull, or } from "drizzle-orm";
import { getDb } from "$lib/server/db";
import { appNotifications } from "$lib/entities/notifications/model/schema";
import type { NotificationType, PublishNotificationInput } from "$lib/entities/notifications/model/types";

const ALLOWED_TYPES: NotificationType[] = ["info", "success", "warning", "error"];

function normalizeType(type: string | null | undefined): NotificationType {
  if (type && ALLOWED_TYPES.includes(type as NotificationType)) {
    return type as NotificationType;
  }

  return "info";
}

function mapNotificationRecord(record: typeof appNotifications.$inferSelect) {
  return {
    id: record.id,
    recipientScope: (record.recipientScope === "user" ? "user" : "global") as "global" | "user",
    recipientUserId: record.recipientUserId,
    type: normalizeType(record.type),
    title: record.title,
    message: record.message,
    actionHref: record.actionHref,
    readAt: record.readAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export function getNotificationsStoreErrorMessage(
  error: unknown,
  fallback = "The requested notifications change could not be completed."
) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export async function publishNotification(input: PublishNotificationInput) {
  const db = getDb();
  const recipientScope = input.recipientScope === "user" ? "user" : "global";

  const [record] = await db
    .insert(appNotifications)
    .values({
      recipientScope,
      recipientUserId: recipientScope === "user" ? input.recipientUserId ?? null : null,
      type: normalizeType(input.type),
      title: input.title.trim(),
      message: input.message.trim(),
      actionHref: input.actionHref?.trim() || null
    })
    .returning();

  return mapNotificationRecord(record);
}

export async function listNotificationsForUser(input: {
  userId: string;
  filter?: "all" | "unread" | "read";
  limit?: number;
}) {
  const db = getDb();
  const limit = Math.max(1, Math.min(input.limit ?? 30, 100));
  const filter = input.filter ?? "all";

  const visibility = or(
    and(eq(appNotifications.recipientScope, "global"), isNull(appNotifications.recipientUserId)),
    and(eq(appNotifications.recipientScope, "user"), eq(appNotifications.recipientUserId, input.userId))
  );

  const readFilter =
    filter === "unread"
      ? isNull(appNotifications.readAt)
      : filter === "read"
        ? isNotNull(appNotifications.readAt)
        : undefined;

  const whereClause = readFilter ? and(visibility, readFilter) : visibility;

  const rows = await db
    .select()
    .from(appNotifications)
    .where(whereClause)
    .orderBy(desc(appNotifications.createdAt))
    .limit(limit);

  return rows.map(mapNotificationRecord);
}

export async function getUnreadNotificationsCountForUser(userId: string) {
  const db = getDb();
  const rows = await db
    .select({ id: appNotifications.id })
    .from(appNotifications)
    .where(
      and(
        or(
          and(eq(appNotifications.recipientScope, "global"), isNull(appNotifications.recipientUserId)),
          and(eq(appNotifications.recipientScope, "user"), eq(appNotifications.recipientUserId, userId))
        ),
        isNull(appNotifications.readAt)
      )
    );

  return rows.length;
}

export async function markNotificationReadForUser(notificationId: string, userId: string) {
  const db = getDb();
  const [record] = await db
    .update(appNotifications)
    .set({ readAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(appNotifications.id, notificationId),
        or(
          and(eq(appNotifications.recipientScope, "global"), isNull(appNotifications.recipientUserId)),
          and(eq(appNotifications.recipientScope, "user"), eq(appNotifications.recipientUserId, userId))
        )
      )
    )
    .returning();

  return record ? mapNotificationRecord(record) : null;
}

export async function markAllNotificationsReadForUser(userId: string) {
  const db = getDb();
  const result = await db
    .update(appNotifications)
    .set({ readAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        or(
          and(eq(appNotifications.recipientScope, "global"), isNull(appNotifications.recipientUserId)),
          and(eq(appNotifications.recipientScope, "user"), eq(appNotifications.recipientUserId, userId))
        ),
        isNull(appNotifications.readAt)
      )
    )
    .returning({ id: appNotifications.id });

  return result.length;
}

export async function deleteNotificationForUser(notificationId: string, userId: string) {
  const db = getDb();
  const [record] = await db
    .delete(appNotifications)
    .where(
      and(
        eq(appNotifications.id, notificationId),
        or(
          and(eq(appNotifications.recipientScope, "global"), isNull(appNotifications.recipientUserId)),
          and(eq(appNotifications.recipientScope, "user"), eq(appNotifications.recipientUserId, userId))
        )
      )
    )
    .returning({ id: appNotifications.id });

  return record ?? null;
}
