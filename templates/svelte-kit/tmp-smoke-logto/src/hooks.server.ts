import { handleLogto } from "@logto/sveltekit";
import { getLogtoConfig, getLogtoCookieConfig } from "$lib/features/auth-logto/server/config";

export const handle = handleLogto(getLogtoConfig(), getLogtoCookieConfig());
