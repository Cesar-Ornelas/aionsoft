import { env } from "$env/dynamic/private";

const TOKEN_EXPIRY_BUFFER_MS = 60 * 1000;

let cachedToken: string | undefined;
let cachedTokenExpiresAt = 0;

export class LogtoManagementError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status = 500, details: unknown = null) {
    super(message);
    this.name = "LogtoManagementError";
    this.status = status;
    this.details = details;
  }
}

function getRequiredEnv(name: string) {
  const value = env[name]?.trim();

  if (!value) {
    throw new LogtoManagementError(`Missing required auth env var: ${name}`, 500);
  }

  return value;
}

function getLogtoEndpoint() {
  return getRequiredEnv("LOGTO_ENDPOINT").replace(/\/$/, "");
}

function getManagementResource() {
  return env.LOGTO_MANAGEMENT_RESOURCE?.trim() || "https://default.logto.app/api";
}

function getManagementBaseUrl() {
  return `${getLogtoEndpoint()}/api`;
}

function getDefaultOrganizationName() {
  return env.LOGTO_DEFAULT_ORGANIZATION_NAME?.trim() || "Default Organization";
}

function getDefaultOrganizationDescription() {
  return env.LOGTO_DEFAULT_ORGANIZATION_DESCRIPTION?.trim() || "Initial organization created during first-run setup.";
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (typeof payload === "string" && payload) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const typedPayload = payload as { message?: string; error?: string; error_description?: string };
    return typedPayload.message || typedPayload.error_description || typedPayload.error || fallback;
  }

  return fallback;
}

function parseListResponse(payload: unknown, keys: string[] = []) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    for (const key of keys) {
      const maybeList = (payload as Record<string, unknown>)[key];
      if (Array.isArray(maybeList)) {
        return maybeList;
      }
    }
  }

  return [];
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function getManagementAccessToken() {
  if (cachedToken && Date.now() < cachedTokenExpiresAt - TOKEN_EXPIRY_BUFFER_MS) {
    return cachedToken;
  }

  const tokenResponse = await fetch(`${getLogtoEndpoint()}/oidc/token`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: getRequiredEnv("LOGTO_M2M_APP_ID"),
      client_secret: getRequiredEnv("LOGTO_M2M_APP_SECRET"),
      resource: getManagementResource(),
      scope: "all"
    })
  });

  const tokenPayload = (await parseResponseBody(tokenResponse)) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!tokenResponse.ok || !tokenPayload?.access_token) {
    throw new LogtoManagementError(
      getErrorMessage(tokenPayload, "Unable to authenticate with the Logto Management API."),
      tokenResponse.status || 500,
      tokenPayload
    );
  }

  cachedToken = tokenPayload.access_token;
  cachedTokenExpiresAt = Date.now() + Number(tokenPayload.expires_in || 3600) * 1000;

  return cachedToken;
}

async function managementRequest(path: string, init: RequestInit = {}) {
  const accessToken = await getManagementAccessToken();
  const headers = new Headers(init.headers || {});
  const hasJsonBody = init.body && !(init.body instanceof URLSearchParams);

  headers.set("authorization", `Bearer ${accessToken}`);

  if (hasJsonBody && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(`${getManagementBaseUrl()}${path}`, {
    ...init,
    headers
  });

  const payload = await parseResponseBody(response);

  if (!response.ok) {
    throw new LogtoManagementError(
      getErrorMessage(payload, `Logto request failed for ${path}`),
      response.status,
      payload
    );
  }

  return payload;
}

type LogtoOrganization = {
  id: string;
  name: string;
};

type LogtoUser = {
  id: string;
  username?: string;
  primaryEmail?: string;
  name?: string;
};

export async function ensureDefaultOrganization() {
  const organizations = parseListResponse(await managementRequest("/organizations"), ["organizations"]) as LogtoOrganization[];

  if (organizations.length > 0) {
    return organizations[0];
  }

  return (await managementRequest("/organizations", {
    method: "POST",
    body: JSON.stringify({
      name: getDefaultOrganizationName(),
      description: getDefaultOrganizationDescription()
    })
  })) as LogtoOrganization;
}

export async function createBootstrapUser(input: { username: string; email: string; password: string }) {
  return (await managementRequest("/users", {
    method: "POST",
    body: JSON.stringify({
      username: input.username,
      name: input.username,
      primaryEmail: input.email,
      password: input.password
    })
  })) as LogtoUser;
}

export async function updateLogtoUserCredentials(input: {
  logtoUserId: string;
  email?: string | null;
  password?: string | null;
}) {
  const payload: Record<string, string> = {};

  if (input.email && input.email.trim()) {
    payload.primaryEmail = input.email.trim();
  }

  if (input.password && input.password.trim()) {
    payload.password = input.password.trim();
  }

  if (Object.keys(payload).length === 0) {
    throw new LogtoManagementError("Provide an email or password to update.", 400);
  }

  return (await managementRequest(`/users/${encodeURIComponent(input.logtoUserId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  })) as LogtoUser;
}

export async function addUsersToOrganization(organizationId: string, userIds: string[]) {
  await managementRequest(`/organizations/${organizationId}/users`, {
    method: "POST",
    body: JSON.stringify({ userIds })
  });
}

export function getPublicErrorMessage(error: unknown) {
  if (error instanceof LogtoManagementError) {
    return error.message;
  }

  return "The setup request could not be completed.";
}
