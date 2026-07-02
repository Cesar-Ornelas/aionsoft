import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const LIB_ROOT = path.join(ROOT, "src", "lib");
const LAYERS = ["shared", "entities", "features", "widgets", "pages", "app"];
const LAYER_RANK = {
  shared: 0,
  entities: 1,
  features: 2,
  widgets: 3,
  pages: 4,
  app: 5
};

const IMPORT_RE = /(?:import|export)\s[^"'`]*from\s*["'`]([^"'`]+)["'`]|import\(\s*["'`]([^"'`]+)["'`]\s*\)/g;

async function walkFiles(dir) {
  const entries = await readdir(dir);
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const entryStats = await stat(fullPath);

    if (entryStats.isDirectory()) {
      const nestedFiles = await walkFiles(fullPath);
      files.push(...nestedFiles);
      continue;
    }

    if (fullPath.endsWith(".ts") || fullPath.endsWith(".js") || fullPath.endsWith(".svelte")) {
      files.push(fullPath);
    }
  }

  return files;
}

function layerFromLibPath(libRelativePath) {
  const first = libRelativePath.split(path.sep)[0];
  return LAYERS.includes(first) ? first : null;
}

function resolveLayer(sourceFile, specifier) {
  if (specifier.startsWith("$lib/")) {
    const rel = specifier.slice("$lib/".length);
    return {
      layer: layerFromLibPath(rel),
      rawRelative: rel,
      kind: "alias"
    };
  }

  if (specifier.startsWith(".")) {
    const full = path.resolve(path.dirname(sourceFile), specifier);
    const relToLib = path.relative(LIB_ROOT, full);

    if (relToLib.startsWith("..")) {
      return null;
    }

    return {
      layer: layerFromLibPath(relToLib),
      rawRelative: relToLib,
      kind: "relative"
    };
  }

  return null;
}

function isPublicApiImport(targetLayer, targetRawRelative) {
  if (!["entities", "features", "widgets"].includes(targetLayer)) {
    return true;
  }

  const parts = targetRawRelative.split(/[\\/]/).filter(Boolean);
  return parts.length <= 2;
}

function checkDirection(sourceLayer, targetLayer) {
  return LAYER_RANK[sourceLayer] >= LAYER_RANK[targetLayer];
}

async function main() {
  const files = await walkFiles(LIB_ROOT);
  const violations = [];

  for (const filePath of files) {
    const relToLib = path.relative(LIB_ROOT, filePath);
    const sourceLayer = layerFromLibPath(relToLib);

    if (!sourceLayer) {
      continue;
    }

    const content = await readFile(filePath, "utf8");

    for (const match of content.matchAll(IMPORT_RE)) {
      const specifier = match[1] || match[2];
      if (!specifier) continue;

      const target = resolveLayer(filePath, specifier);
      if (!target || !target.layer) continue;

      if (!checkDirection(sourceLayer, target.layer)) {
        violations.push(`${path.relative(ROOT, filePath)} -> ${specifier} (invalid dependency: ${sourceLayer} cannot import ${target.layer})`);
        continue;
      }

      const isCrossLayer = sourceLayer !== target.layer;
      if (isCrossLayer && !isPublicApiImport(target.layer, target.rawRelative)) {
        violations.push(`${path.relative(ROOT, filePath)} -> ${specifier} (cross-layer imports must use target slice public API)`);
      }
    }
  }

  if (violations.length > 0) {
    console.error("FSD boundary violations detected:\n");
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exit(1);
  }

  console.log("FSD boundary check passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
