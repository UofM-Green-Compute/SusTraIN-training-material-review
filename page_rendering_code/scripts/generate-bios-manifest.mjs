import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..", "..");
const biosRoot = path.join(workspaceRoot, "page_rendering_code", "assets", "bios");
const manifestPath = path.join(biosRoot, "bios-manifest.json");
const imageExtensions = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".webp"]);

function assetPath(folder, filename) {
  return `./page_rendering_code/assets/bios/${[folder, filename]
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

export async function buildBiosManifest() {
  const folders = await readdir(biosRoot, { withFileTypes: true });
  const profiles = [];

  for (const folder of folders.filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const folderPath = path.join(biosRoot, folder.name);
    const files = await readdir(folderPath, { withFileTypes: true });
    const infoFiles = files
      .filter((entry) => entry.isFile() && /-info\.json$/i.test(entry.name))
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const infoFile of infoFiles) {
      const profile = JSON.parse(await readFile(path.join(folderPath, infoFile.name), "utf8"));
      const imageFile = typeof profile.image === "string"
        ? profile.image
        : files.find((entry) => entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase()))?.name;

      profiles.push({
        name: String(profile.name || "").trim(),
        position: String(profile.position || "").trim(),
        institution: String(profile.institution || profile.Institution || "").trim(),
        orcid: String(profile.orcid || "").trim(),
        bio: String(profile.bio || profile.biography || "").trim(),
        image: imageFile ? assetPath(folder.name, imageFile) : "",
      });
    }
  }

  return profiles
    .filter((profile) => profile.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function writeBiosManifest() {
  const profiles = await buildBiosManifest();
  await writeFile(manifestPath, `${JSON.stringify(profiles, null, 2)}\n`, "utf8");
  console.log(`Wrote ${profiles.length} team profiles to page_rendering_code/assets/bios/bios-manifest.json`);
  return profiles;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === __filename) {
  writeBiosManifest().catch((error) => {
    console.error("Failed to generate bios manifest:", error);
    process.exitCode = 1;
  });
}