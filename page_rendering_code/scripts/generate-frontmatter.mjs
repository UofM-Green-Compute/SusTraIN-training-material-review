import { readdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml";


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

function toJson(frontmatter) {
  return JSON.stringify(frontmatter, null, 2) + "\n";
}

async function getYaml(yamlPath) {
  try {
    // yamlPath is relative like ../training_materials/AI_impact/file.yaml
    // Need to resolve from workspaceRoot, stripping the ../ part
    const cleanPath = yamlPath.replace(/^\.\.\//, "");
    const absolutePath = path.join(workspaceRoot, cleanPath);
    const yamlContent = await readFile(absolutePath, "utf8");
    const yamlData = yaml.load(yamlContent);
    return yamlData;
  } catch (error) {
      console.error(`Error reading/parsing ${yamlPath}:`, error.message);
      return null;
  }
}

export async function buildFrontmatter() {
  const sourceDirs = await getSourceDirs();
  const files = [];

  for (const source of sourceDirs) {
    const yamlPaths = await listYamlFiles(source.dir);
    for (const yamlPath of yamlPaths) {
      const item = await getYaml(yamlPath);
      try{
        files.push(item);
      } catch (error) {
          console.error(`Error adding ${yamlPath}:`, error.message);
          return null;
      }
    }
  }

  return { files };
}

export async function writeFrontmatter() {
  const frontmatter = await buildFrontmatter();
  const outPath = path.join(workspaceRoot, TRAINING_ROOT, "content-frontmatter.json");
  const payload = toJson(frontmatter.files);

  await writeFile(outPath, payload, "utf8");
  console.log(`Wrote ${frontmatter.files.length} entries to ${TRAINING_ROOT}/content-frontmatter.json`);
  return frontmatter;
}

async function main() {
  await writeFrontmatter();
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === __filename) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
