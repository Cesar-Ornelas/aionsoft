import type { PageServerLoad } from "./$types";
import { getSettingsHealth } from "$lib/features/settings-health/server";

export const load: PageServerLoad = async () => {
  return {
    health: await getSettingsHealth()
  };
};
