#!/usr/bin/env node

import { cp, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SUPPORTED_FEATURES = new Set(["logto"]);

const helpText = `
create-aionsoft-svelte-kit

Usage:
  create-aionsoft-svelte-kit <target-directory> [--name <project-name>] [--features <feature-list>] [--force]

Options:
  --name   Package/project name written into template files.
  --features  Comma-separated optional features to scaffold (supported: logto).
  --force  Allow writing into a non-empty target directory.
  --help   Show this message.
`;

function parseArgs(argv) {
  const result = {
    target: "",
    name: "",
    features: [],
    force: false,
    help: false
  };

  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--help" || arg === "-h") {
      result.help = true;
      continue;
    }

    if (arg === "--force") {
      result.force = true;
      continue;
    }

    if (arg === "--name") {
      result.name = argv[i + 1] || "";
      i += 1;
      continue;
    }

    if (arg === "--features") {
      result.features.push(...parseFeatureList(argv[i + 1] || ""));
      i += 1;
      continue;
    }

    if (arg.startsWith("--name=")) {
      result.name = arg.slice("--name=".length);
      continue;
    }

    if (arg.startsWith("--features=")) {
      result.features.push(...parseFeatureList(arg.slice("--features=".length)));
      continue;
    }

    positional.push(arg);
  }

  if (positional.length > 0) {
    result.target = positional[0];
  }

  return result;
}

function parseFeatureList(input) {
  return input
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeFeatures(features) {
  return [...new Set(features.map((value) => value.trim().toLowerCase()).filter(Boolean))];
}

async function isDirectoryEmpty(directoryPath) {
  const entries = await readdir(directoryPath);
  return entries.length === 0;
}

async function walkFiles(directoryPath) {
  const entries = await readdir(directoryPath);
  const files = [];

  for (const entry of entries) {
    const absoluteEntryPath = path.join(directoryPath, entry);
    const entryStats = await stat(absoluteEntryPath);

    if (entryStats.isDirectory()) {
      const nested = await walkFiles(absoluteEntryPath);
      files.push(...nested);
      continue;
    }

    files.push(absoluteEntryPath);
  }

  return files;
}

async function replaceTokens(targetDirectory, replacements) {
  const files = await walkFiles(targetDirectory);

  for (const filePath of files) {
    const relative = path.relative(targetDirectory, filePath);
    if (relative.startsWith("static/") && !relative.endsWith(".txt") && !relative.endsWith(".svg")) {
      continue;
    }

    const original = await readFile(filePath, "utf8");
    let next = original;

    for (const [token, value] of Object.entries(replacements)) {
      next = next.split(token).join(value);
    }

    if (next !== original) {
      await writeFile(filePath, next, "utf8");
    }
  }
}

async function readJson(filePath) {
  const contents = await readFile(filePath, "utf8");
  return JSON.parse(contents);
}

async function writeJson(filePath, data) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function appendEnvSectionIfMissing(envPath, header, lines) {
  const current = await readFile(envPath, "utf8");
  if (current.includes(header)) {
    return;
  }

  const next = `${current.trimEnd()}\n\n${header}\n${lines.join("\n")}\n`;
  await writeFile(envPath, next, "utf8");
}

async function scaffoldLogtoFeature(targetDirectory) {
  const packageJsonPath = path.join(targetDirectory, "package.json");
  const envPath = path.join(targetDirectory, ".env.example");

  const packageJson = await readJson(packageJsonPath);
  if (!packageJson.devDependencies) {
    packageJson.devDependencies = {};
  }
  packageJson.devDependencies["@logto/sveltekit"] = packageJson.devDependencies["@logto/sveltekit"] || "^0.3.23";
  await writeJson(packageJsonPath, packageJson);

  await appendEnvSectionIfMissing(envPath, "# Logto authentication (optional when --features logto is enabled)", [
    "LOGTO_ENDPOINT=http://localhost:3001",
    "LOGTO_APP_ID=",
    "LOGTO_APP_SECRET=",
    "LOGTO_COOKIE_ENCRYPTION_KEY="
  ]);

  const authServerDir = path.join(targetDirectory, "src", "lib", "features", "auth-logto", "server");
  const authSignInDir = path.join(targetDirectory, "src", "routes", "auth", "sign-in");
  const authSignOutDir = path.join(targetDirectory, "src", "routes", "auth", "sign-out");

  await mkdir(authServerDir, { recursive: true });
  await mkdir(authSignInDir, { recursive: true });
  await mkdir(authSignOutDir, { recursive: true });

  await writeFile(
    path.join(authServerDir, "config.ts"),
    `import { env } from "$env/dynamic/private";

const REQUIRED_ENV_NAMES = [
  "LOGTO_ENDPOINT",
  "LOGTO_APP_ID",
  "LOGTO_APP_SECRET",
  "LOGTO_COOKIE_ENCRYPTION_KEY"
] as const;

function getRequiredEnv(name: string) {
  const value = env[name]?.trim();

  if (!value) {
    throw new Error(\`Missing required auth env var: \${name}\`);
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
`,
    "utf8"
  );

  await writeFile(
    path.join(targetDirectory, "src", "hooks.server.ts"),
    `import { handleLogto } from "@logto/sveltekit";
import { getLogtoConfig, getLogtoCookieConfig } from "$lib/features/auth-logto/server/config";

export const handle = handleLogto(getLogtoConfig(), getLogtoCookieConfig());
`,
    "utf8"
  );

  await writeFile(
    path.join(authSignInDir, "+server.ts"),
    `import type { RequestHandler } from "@sveltejs/kit";
import { redirect } from "@sveltejs/kit";
import { buildCallbackUrl, buildPostSignInUrl, getReturnTo } from "$lib/features/auth-logto/server/config";

export const GET: RequestHandler = async ({ locals, url }) => {
  const scopedLocals = locals as {
    user?: unknown;
    logtoClient: {
      signIn: (options: { redirectUri: string; postRedirectUri: string }) => Promise<void>;
    };
  };

  const returnTo = getReturnTo(url.searchParams);

  if (scopedLocals.user) {
    throw redirect(302, returnTo);
  }

  await scopedLocals.logtoClient.signIn({
    redirectUri: buildCallbackUrl(url),
    postRedirectUri: buildPostSignInUrl(url, returnTo)
  });

  return new Response(null, { status: 204 });
};
`,
    "utf8"
  );

  await writeFile(
    path.join(authSignOutDir, "+server.ts"),
    `import type { RequestHandler } from "@sveltejs/kit";
import { buildPostSignOutUrl } from "$lib/features/auth-logto/server/config";

const signOut: RequestHandler = async ({ locals, url }) => {
  const scopedLocals = locals as {
    logtoClient: {
      signOut: (redirectUri: string) => Promise<void>;
    };
  };

  await scopedLocals.logtoClient.signOut(buildPostSignOutUrl(url));
  return new Response(null, { status: 204 });
};

export const GET = signOut;
export const POST = signOut;
`,
    "utf8"
  );
}

async function applyFeatures(targetDirectory, features) {
  if (features.includes("logto")) {
    await scaffoldLogtoFeature(targetDirectory);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const features = normalizeFeatures(args.features);

  if (args.help) {
    console.log(helpText.trim());
    return;
  }

  if (!args.target) {
    console.error("Missing target directory. Use --help for usage.");
    process.exitCode = 1;
    return;
  }

  const unsupported = features.filter((feature) => !SUPPORTED_FEATURES.has(feature));
  if (unsupported.length > 0) {
    console.error(`Unsupported feature(s): ${unsupported.join(", ")}. Supported features: ${[...SUPPORTED_FEATURES].join(", ")}`);
    process.exitCode = 1;
    return;
  }

  const cwd = process.cwd();
  const targetDirectory = path.resolve(cwd, args.target);

  await mkdir(targetDirectory, { recursive: true });

  const empty = await isDirectoryEmpty(targetDirectory);
  if (!empty && !args.force) {
    console.error("Target directory is not empty. Re-run with --force to continue.");
    process.exitCode = 1;
    return;
  }

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const templateDirectory = path.resolve(scriptDir, "../template");

  await cp(templateDirectory, targetDirectory, { recursive: true, force: true });

  const projectName = args.name || path.basename(targetDirectory);
  const currentYear = String(new Date().getFullYear());

  await replaceTokens(targetDirectory, {
    "__PROJECT_NAME__": projectName,
    "__YEAR__": currentYear
  });

  await applyFeatures(targetDirectory, features);

  console.log(`Created SvelteKit template in ${targetDirectory}`);
  if (features.length > 0) {
    console.log(`Enabled features: ${features.join(", ")}`);
  }
  console.log("Next steps:");
  console.log(`  cd ${args.target}`);
  console.log("  bun install");
  console.log("  bun run dev");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
