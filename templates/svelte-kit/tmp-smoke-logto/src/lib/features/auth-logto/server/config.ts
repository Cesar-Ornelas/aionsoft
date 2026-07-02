import { env } from "$env/dynamic/private";

const REQUIRED_ENV_NAMES = [
  "LOGTO_ENDPOINT",
  "LOGTO_APP_ID",
  "LOGTO_APP_SECRET",
  "LOGTO_COOKIE_ENCRYPTION_KEY"
] as const;

function getRequiredEnv(name: string) {
  const value = env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required auth env var: ${name}`);
  }

  return value;
}

function normalizeReturnTo(returnTo: string | null) {
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return "/";
  }

  return returnTo;
}

export function getLogtoConfig() {
  for (const name of REQUIRED_ENV_NAMES) {
    getRequiredEnv(name);
  }

  return {
    endpoint: getRequiredEnv("LOGTO_ENDPOINT"),
    appId: getRequiredEnv("LOGTO_APP_ID"),
    appSecret: getRequiredEnv("LOGTO_APP_SECRET")
  };
}

export function getLogtoCookieConfig() {
  return {
    encryptionKey: getRequiredEnv("LOGTO_COOKIE_ENCRYPTION_KEY")
  };
}

export function getReturnTo(searchParams: URLSearchParams) {
  return normalizeReturnTo(searchParams.get("returnTo"));
}

export function buildCallbackUrl(url: URL) {
  return new URL("/callback", url.origin).toString();
}

export function buildPostSignInUrl(url: URL, returnTo: string) {
  return new URL(normalizeReturnTo(returnTo), url.origin).toString();
}

export function buildPostSignOutUrl(url: URL) {
  return new URL("/", url.origin).toString();
}
