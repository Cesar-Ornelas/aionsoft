import { and, desc, eq, lte, gte } from "drizzle-orm";
import { getDb } from "$lib/server/db";
import { emitNotificationRealtimeEvent } from "$lib/entities/notifications/server/realtime";
import { systemAlerts } from "$lib/entities/system-alerts/model/schema";
import type { CreateSystemAlertInput, SystemAlertType } from "$lib/entities/system-alerts/model/types";

const ALLOWED_TYPES: SystemAlertType[] = ["info", "success", "warning", "error"];

function normalizeType(type: string | null | undefined): SystemAlertType {
  if (type && ALLOWED_TYPES.includes(type as SystemAlertType)) {
    return type as SystemAlertType;
  }

  return "warning";
}

function mapSystemAlert(record: typeof systemAlerts.$inferSelect) {
  return {
    id: record.id,
    title: record.title,
    message: record.message,
    type: normalizeType(record.type),
    startsAt: record.startsAt,
    endsAt: record.endsAt,
    isActive: record.isActive,
    createdByUserId: record.createdByUserId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart <= bEnd && bStart <= aEnd;
}

export function getSystemAlertsStoreErrorMessage(
  error: unknown,
  fallback = "The requested system alert change could not be completed."
) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

async function ensureNoActiveWindowOverlap(input: { startsAt: Date; endsAt: Date; excludeId?: string }) {
  const db = getDb();
  const activeAlerts = await db
    .select()
    .from(systemAlerts)
    .where(eq(systemAlerts.isActive, true))
    .orderBy(desc(systemAlerts.createdAt));

  const conflict = activeAlerts.find((alert) => {
    if (input.excludeId && alert.id === input.excludeId) {
      return false;
    }

    return intervalsOverlap(input.startsAt, input.endsAt, alert.startsAt, alert.endsAt);
  });

  if (conflict) {
    throw new Error("Another system alert is already scheduled for an overlapping active window.");
  }
}

export async function listSystemAlerts() {
  const db = getDb();
  const rows = await db.select().from(systemAlerts).orderBy(desc(systemAlerts.startsAt), desc(systemAlerts.createdAt));
  return rows.map(mapSystemAlert);
}

export async function getActiveSystemAlert(at = new Date()) {
  const db = getDb();
  const [record] = await db
    .select()
    .from(systemAlerts)
    .where(and(eq(systemAlerts.isActive, true), lte(systemAlerts.startsAt, at), gte(systemAlerts.endsAt, at)))
    .orderBy(desc(systemAlerts.startsAt), desc(systemAlerts.createdAt))
    .limit(1);

  return record ? mapSystemAlert(record) : null;
}

export async function createSystemAlert(input: CreateSystemAlertInput) {
  if (input.startsAt >= input.endsAt) {
    throw new Error("System alert end date must be after the start date.");
  }

  await ensureNoActiveWindowOverlap({ startsAt: input.startsAt, endsAt: input.endsAt });

  const db = getDb();
  const [record] = await db
    .insert(systemAlerts)
    .values({
      title: input.title.trim(),
      message: input.message.trim(),
      type: normalizeType(input.type),
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      createdByUserId: input.createdByUserId,
      isActive: true
    })
    .returning();

  const alert = mapSystemAlert(record);

  await emitNotificationRealtimeEvent({
    type: "created",
    recipientScope: "global",
    notificationId: null
  });

  return alert;
}

export async function deleteSystemAlert(alertId: string) {
  const db = getDb();
  const [record] = await db.delete(systemAlerts).where(eq(systemAlerts.id, alertId)).returning({ id: systemAlerts.id });

  if (!record) {
    return null;
  }

  await emitNotificationRealtimeEvent({
    type: "deleted",
    recipientScope: "global",
    notificationId: null
  });

  return record;
}
