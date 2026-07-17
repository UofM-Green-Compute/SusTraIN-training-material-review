import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { watch } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeManifest, SOURCE_DIRS } from "./generate-manifest.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..", "..");

const PORT = Number(process.env.PORT || 8000);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

function sanitizePath(urlPath) {
  const pathname = decodeURIComponent(urlPath.split("?")[0]);
  const requested = pathname === "/" ? "/page_rendering_code/index.html" : pathname;
  const resolved = path.resolve(workspaceRoot, `.${requested}`);

  if (!resolved.startsWith(workspaceRoot)) {
    return null;
  }

  return resolved;
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

async function requestHandler(req, res) {
  try {
    const pathname = decodeURIComponent((req.url || "/").split("?")[0]);
    if (pathname === "/" || pathname === "/index.html") {
      res.writeHead(302, { Location: "/page_rendering_code/index.html" });
      res.end();
      return;
    }

    if (pathname === "/page_rendering_code" || pathname === "/page_rendering_code/") {
      res.writeHead(302, { Location: "/page_rendering_code/index.html" });
      res.end();
      return;
    }

    const resolvedPath = sanitizePath(req.url || "/");
    if (!resolvedPath) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }

    const contents = await readFile(resolvedPath);
    res.writeHead(200, {
      "Content-Type": getMimeType(resolvedPath),
      "Cache-Control": "no-store",
    });
    res.end(contents);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

let queued = false;
let active = false;

async function queueManifestRebuild(reason) {
  if (active) {
    queued = true;
    return;
  }

  active = true;
  try {
    await writeManifest();
    console.log(`Manifest updated (${reason})`);
  } catch (error) {
    console.error("Failed to update manifest:", error);
  } finally {
    active = false;
    if (queued) {
      queued = false;
      // Collapse bursts of file events into one additional rebuild.
      queueManifestRebuild("batched changes");
    }
  }
}

function startWatchers() {
  for (const source of SOURCE_DIRS) {
    const watchPath = path.join(workspaceRoot, source.dir);
    watch(watchPath, { persistent: true }, (eventType, filename) => {
      if (!filename || !String(filename).toLowerCase().endsWith(".json")) {
        return;
      }

      queueManifestRebuild(`${source.dir}/${filename} ${eventType}`);
    });
  }
}

async function main() {
  await queueManifestRebuild("startup");

  const server = createServer(requestHandler);
  server.listen(PORT, () => {
    console.log(`Dev server running at http://localhost:${PORT}`);
  });

  startWatchers();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
