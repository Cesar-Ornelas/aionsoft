#!/usr/bin/env node

import { cp, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const helpText = `
create-aionsoft-svelte-kit

Usage:
  create-aionsoft-svelte-kit <target-directory> [--name <project-name>] [--force]

Options:
  --name   Package/project name written into template files.
  --force  Allow writing into a non-empty target directory.
  --help   Show this message.
`;

function parseArgs(argv) {
  const result = {
    target: "",
    name: "",
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

    if (arg.startsWith("--name=")) {
      result.name = arg.slice("--name=".length);
      continue;
    }

    positional.push(arg);
  }

  if (positional.length > 0) {
    result.target = positional[0];
  }

  return result;
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

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(helpText.trim());
    return;
  }

  if (!args.target) {
    console.error("Missing target directory. Use --help for usage.");
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

  console.log(`Created SvelteKit template in ${targetDirectory}`);
  console.log("Next steps:");
  console.log(`  cd ${args.target}`);
  console.log("  bun install");
  console.log("  bun run dev");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
