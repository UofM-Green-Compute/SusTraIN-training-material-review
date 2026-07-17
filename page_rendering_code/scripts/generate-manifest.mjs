import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(__dirname, "..", "..");

export const SOURCE_DIRS = [
  { dir: "training_materials/AI_impact", group: "AI_impact" },
  { dir: "training_materials/Circular_economy", group: "Circular_economy" },
  { dir: "training_materials/Energy_efficiency", group: "Energy_efficiency" },
  { dir: "training_materials/Intro", group: "Intro" },
  { dir: "training_materials/Lifecycle_assessment", group: "Lifecycle_assessment" },
  { dir: "training_materials/Metrics_tools", group: "Metrics_tools" },
];

async function listJsonFiles(dirName) {
  const absoluteDir = path.join(workspaceRoot, dirName);
  const entries = await readdir(absoluteDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
    .map((entry) => `../${dirName}/${entry.name}`)
    .sort((a, b) => a.localeCompare(b));
}

export async function buildManifest() {
  const files = [];

  for (const source of SOURCE_DIRS) {
    const jsonPaths = await listJsonFiles(source.dir);
    files.push(...jsonPaths.map((jsonPath) => ({ path: jsonPath, group: source.group })));
  }

  return { files };
}

export async function writeManifest() {
  const manifest = await buildManifest();
  const outPath = path.join(appRoot, "content-manifest.json");
  const payload = `${JSON.stringify(manifest, null, 2)}\n`;

  await writeFile(outPath, payload, "utf8");
  console.log(`Wrote ${manifest.files.length} entries to content-manifest.json`);
  return manifest;
}

async function main() {
  await writeManifest();
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === __filename) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
