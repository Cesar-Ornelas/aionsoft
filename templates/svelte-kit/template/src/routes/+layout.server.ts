import { env } from "$env/dynamic/private";

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

  return {
    user: {
      name: profileName || fallbackName,
      email: profileEmail,
      avatar: profileAvatar || "https://github.com/shadcn.png"
    },
    hasLogtoManagement: Boolean(env.LOGTO_M2M_APP_ID?.trim())
  };
}) satisfies ({ locals }: { locals: App.Locals }) => Promise<{
  user: { name: string; email: string; avatar: string };
  hasLogtoManagement: boolean;
}>;