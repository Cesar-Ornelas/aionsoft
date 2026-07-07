import type { RequestEvent } from "@sveltejs/kit";
import { getCurrentAppUserByLogtoUserId } from "$lib/entities/access-control";
import type { CurrentAppUser } from "$lib/entities/access-control";

function getLogtoSubject(user: unknown) {
  if (!user || typeof user !== "object") {
    return null;
  }

  const maybeSubject = "sub" in user ? user.sub : null;
  return typeof maybeSubject === "string" && maybeSubject.trim() ? maybeSubject : null;
}

export async function resolveCurrentRequestUser(event: RequestEvent): Promise<CurrentAppUser | null> {
  if (event.locals.currentAppUser !== undefined) {
    return event.locals.currentAppUser;
  }

  const logtoUserId = getLogtoSubject(event.locals.user);

  if (!logtoUserId) {
    event.locals.currentAppUser = null;
    event.locals.sessionUserKey = null;
    return null;
  }

  const currentAppUser = await getCurrentAppUserByLogtoUserId(logtoUserId);
  event.locals.currentAppUser = currentAppUser;
  event.locals.sessionUserKey = logtoUserId;
  return currentAppUser;
}

export function getCurrentRequestUser(event: RequestEvent): CurrentAppUser | null {
  return event.locals.currentAppUser ?? null;
}
