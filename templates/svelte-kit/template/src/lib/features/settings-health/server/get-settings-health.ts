import { getAppSetting } from "$lib/entities/app-settings";
import type { SettingsHealth } from "$lib/features/settings-health/model/types";

export async function getSettingsHealth(): Promise<SettingsHealth> {
  try {
    const brandName = await getAppSetting("brand.name");

    return {
      status: "connected",
      hasBrandName: Boolean(brandName?.value),
      reason: brandName ? "Database is connected and brand.name exists." : "Database is connected. brand.name is not set yet."
    };
  } catch {
    return {
      status: "unavailable",
      hasBrandName: false,
      reason: "Database unavailable. Set DATABASE_URL and run migrations to enable entity-backed settings."
    };
  }
}
