import { eq } from "drizzle-orm";
import { getDb } from "$lib/shared/server/db/client";
import { appSettings } from "$lib/entities/app-settings/model/schema";
import type { AppSetting } from "$lib/entities/app-settings/model/types";

function mapRow(row: typeof appSettings.$inferSelect): AppSetting {
  return {
    key: row.key,
    value: row.value,
    updatedAt: row.updatedAt
  };
}

export async function getAppSetting(key: string): Promise<AppSetting | null> {
  const db = getDb();
  const rows = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);

  if (rows.length === 0) {
    return null;
  }

  return mapRow(rows[0]);
}

export async function listAppSettings(limit = 20): Promise<AppSetting[]> {
  const db = getDb();
  const rows = await db.select().from(appSettings).limit(limit);
  return rows.map(mapRow);
}
