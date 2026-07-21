import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..", "..");
const TRAINING_ROOT = "training_materials";
const IGNORED_SOURCE_DIRS = new Set(["_archive", "_drafts"]);

export async function getSourceDirs() {
  const absoluteTrainingRoot = path.join(workspaceRoot, TRAINING_ROOT);
  const entries = await readdir(absoluteTrainingRoot, { withFileTypes: true });

  return entries
    .filter(
      (entry) =>
        entry.isDirectory() &&
        !entry.name.startsWith(".") &&
        !IGNORED_SOURCE_DIRS.has(entry.name.toLowerCase()),
    )
    .map((entry) => ({
      dir: `${TRAINING_ROOT}/${entry.name}`,
      group: entry.name,
    }))
    .sort((a, b) => a.dir.localeCompare(b.dir));
}

async function listYamlFiles(dirName) {
  const absoluteDir = path.join(workspaceRoot, dirName);
  const entries = await readdir(absoluteDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && /\.(ya?ml)$/i.test(entry.name))
    .map((entry) => `../${dirName}/${entry.name}`)
    .sort((a, b) => a.localeCompare(b));
}

function yamlScalar(value) {
  return JSON.stringify(String(value));
}

function toYaml(manifest) {
  const lines = ["files:"];

  for (const file of manifest.files) {
    lines.push(`  - path: ${yamlScalar(file.path)}`);
    lines.push(`    group: ${yamlScalar(file.group)}`);
  }

  return `${lines.join("\n")}\n`;
}

export async function buildManifest() {
  const sourceDirs = await getSourceDirs();
  const files = [];

  for (const source of sourceDirs) {
    const yamlPaths = await listYamlFiles(source.dir);
    files.push(...yamlPaths.map((yamlPath) => ({ path: yamlPath, group: source.group })));
  }

  return { files };
}

export async function writeManifest() {
  const manifest = await buildManifest();
  const outPath = path.join(workspaceRoot, TRAINING_ROOT, "content-manifest.yml");
  const payload = toYaml(manifest);

  await writeFile(outPath, payload, "utf8");
  console.log(`Wrote ${manifest.files.length} entries to ${TRAINING_ROOT}/content-manifest.yml`);
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
