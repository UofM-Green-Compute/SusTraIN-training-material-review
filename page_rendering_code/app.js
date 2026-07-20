const CONTENT_MANIFEST_PATH = "../training_materials/content-manifest.yml";
const GITHUB_API = "https://api.github.com";
const CONTENT_ROOT = "training_materials";
const CONTENT_GROUPS = [
  "ai_impact",
  "circular_economy",
  "energy_efficiency",
  "intro",
  "lifecycle_assessment",
  "metrics_tools",
];

const state = {
  items: [],
  query: "",
  category: "all",
  viewMode: "cards",
};

const HIDDEN_DISPLAY_FIELDS = new Set([
  // Already in the top display fields
  "keywords",
  "learningresourcetype",
  "name",
  "description",

  // too long
  "abstract",
  "teaches",
  "author",
  "about",
  
  // extras not of interest to viewer
  "@id",
  "@context",
  "@type",
  "url",
  "identifier",
  "dct:conformsto",
  "license",
  "contributor",
  "audience",
  "competencyrequired",
  "mentions",
  "accessibilitysummary",
  "datepublished",
  "version",
  "recordedat",
  "timerequired",
  "datecreated",
  "datemodified",
  "inlanguage"
]);

const TABLE_BASE_COLUMNS = [
  "name",
  "category",
  "description",
  "keywords",
  "learningResourceType",
];

const searchInput = document.getElementById("searchInput");
const categorySelect = document.getElementById("categorySelect");
const viewButtons = Array.from(document.querySelectorAll(".view-option"));
const resultsMeta = document.getElementById("resultsMeta");
const resultsEl = document.getElementById("results");
const template = document.getElementById("resultTemplate");
let activeDataTable = null;

function syncViewToggleUI() {
  for (const button of viewButtons) {
    const isActive = button.dataset.view === state.viewMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  }
}

function destroyActiveDataTable() {
  if (activeDataTable && typeof activeDataTable.destroy === "function") {
    activeDataTable.destroy();
  }

  activeDataTable = null;
}

function asArray(jsonValue) {
  if (Array.isArray(jsonValue)) {
    return jsonValue;
  }

  if (jsonValue && typeof jsonValue === "object") {
    return [jsonValue];
  }

  return [];
}

function normalizeGroupName(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeItem(raw, sourcePath, sourceGroup) {
  const title =
    raw.title || raw.name || raw.label || raw.id || sourcePath.split("/").pop();
  const description = raw.description || raw.summary || raw.notes || "";
  const keywords = Array.isArray(raw.keywords)
    ? raw.keywords
    : typeof raw.keywords === "string"
      ? [raw.keywords]
      : [];
  const learningResourceType = Array.isArray(raw.learningResourceType)
    ? raw.learningResourceType
    : typeof raw.learningResourceType === "string"
      ? [raw.learningResourceType]
      : [];


  return {
    title: String(title),
    description: String(description),
    category: normalizeGroupName(sourceGroup),
    keywords,
    learningResourceType,
    rawFields: Object.entries(raw),
    sourcePath,
    url: typeof raw.url === "string" ? raw.url : "",
    searchFields: [title, description, learningResourceType, sourceGroup, keywords, ...Object.values(raw)]
      .map(formatFieldValue)
      .map((value) => value.toLowerCase()),
  };
}

function formatFieldValue(value) {
  if (value === null) {
    return "null";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function normalizeKeywords(value) {
  if (Array.isArray(value)) {
    return value.map((tag) => String(tag).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}

function tableColumnClassName(column) {
  return `col-${String(column)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}`;
}

function createKeywordPillContainer(value) {
  const keywords = normalizeKeywords(value);
  const container = document.createElement("span");
  container.className = "keywords";

  for (const keyword of keywords) {
    const pill = document.createElement("span");
    pill.className = "keyword-pill";
    pill.textContent = keyword;
    container.appendChild(pill);
  }

  return container;
}

function createResourceTypePillContainer(value) {
  const resourceTypes = normalizeKeywords(value);
  const container = document.createElement("span");
  container.className = "resource-types";

  for (const resourceType of resourceTypes) {
    const pill = document.createElement("span");
    pill.className = "resource-type-pill";
    pill.textContent = resourceType;
    container.appendChild(pill);
  }

  return container;
}

async function loadOneFile(item) {
  const response = await fetch(item.path, { cache: "no-cache" });

  if (!response.ok) {
    throw new Error(`Failed to load ${item.path}`);
  }

  const text = (await response.text()).trim();
  if (!text) {
    return [];
  }

  const parsed = JSON.parse(text);
  return asArray(parsed)
    .filter((record) => record && record.publish !== false)
    .map((record) => normalizeItem(record, item.path, item.group));
}

function normalizeManifest(manifest) {
  const rawFiles = Array.isArray(manifest) ? manifest : manifest?.files;

  if (!Array.isArray(rawFiles)) {
    throw new Error("Manifest must be an array or an object with a files array.");
  }

  return rawFiles
    .filter((entry) => entry && typeof entry.path === "string" && typeof entry.group === "string")
    .map((entry) => ({ path: entry.path, group: normalizeGroupName(entry.group) }));
}

function parseManifestYaml(text) {
  const files = [];
  const lines = text.split(/\r?\n/);
  let current = null;

  for (const line of lines) {
    if (!line.trim() || line.trim() === "---") {
      continue;
    }

    if (line.trim() === "files:") {
      continue;
    }

    const itemMatch = line.match(/^\s+-\s+path:\s+(.+)$/);
    if (itemMatch) {
      current = { path: JSON.parse(itemMatch[1]), group: "" };
      files.push(current);
      continue;
    }

    const groupMatch = line.match(/^\s+group:\s+(.+)$/);
    if (groupMatch && current) {
      current.group = JSON.parse(groupMatch[1]);
    }
  }

  return { files };
}

async function loadManifest() {
  const response = await fetch(CONTENT_MANIFEST_PATH, { cache: "no-cache" });

  if (!response.ok) {
    throw new Error(`Failed to load ${CONTENT_MANIFEST_PATH}`);
  }

  const text = (await response.text()).trim();
  if (!text) {
    throw new Error(`${CONTENT_MANIFEST_PATH} is empty.`);
  }

  const parsed = text.startsWith("{") ? JSON.parse(text) : parseManifestYaml(text);
  const files = normalizeManifest(parsed);

  if (!files.length) {
    throw new Error(`${CONTENT_MANIFEST_PATH} has no valid file entries.`);
  }

  return files;
}

function guessGitHubRepoFromLocation() {
  const { hostname, pathname } = window.location;

  if (!hostname.endsWith(".github.io")) {
    return null;
  }

  const owner = hostname.split(".")[0];
  const segments = pathname.split("/").filter(Boolean);

  // Project pages: owner.github.io/repo-name/
  // User/org pages: owner.github.io/
  const repo = segments.length > 0 ? segments[0] : `${owner}.github.io`;
  return { owner, repo };
}

function toGroupForPath(path) {
  const segments = String(path).split("/").filter(Boolean);
  if (!segments.length) {
    return null;
  }

  const maybeGroup = normalizeGroupName(
    segments[0] === CONTENT_ROOT ? segments[1] : segments[0],
  );
  return CONTENT_GROUPS.includes(maybeGroup) ? maybeGroup : null;
}

async function discoverContentFilesFromGitHub() {
  const repoInfo = guessGitHubRepoFromLocation();
  if (!repoInfo) {
    return [];
  }

  const { owner, repo } = repoInfo;
  const treeUrl = `${GITHUB_API}/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`;
  const response = await fetch(treeUrl, { cache: "no-cache" });

  if (!response.ok) {
    throw new Error(`Failed to discover files from GitHub API (${response.status}).`);
  }

  const payload = await response.json();
  const tree = Array.isArray(payload.tree) ? payload.tree : [];

  return tree
    .filter((entry) => entry && entry.type === "blob" && typeof entry.path === "string")
    .filter((entry) => entry.path.toLowerCase().endsWith(".json"))
    .map((entry) => ({
      path: entry.path,
      group: toGroupForPath(entry.path),
    }))
    .filter((entry) => entry.group !== null)
    .sort((a, b) => a.path.localeCompare(b.path));
}

async function discoverContentFiles() {
  try {
    const githubFiles = await discoverContentFilesFromGitHub();
    if (githubFiles.length) {
      return githubFiles;
    }
  } catch (error) {
    console.warn("GitHub discovery failed, falling back to manifest:", error);
  }

  return loadManifest();
}

async function loadAllContent(contentFiles) {
  const settled = await Promise.allSettled(contentFiles.map((item) => loadOneFile(item)));

  const loadedItems = [];
  const errors = [];

  for (const result of settled) {
    if (result.status === "fulfilled") {
      loadedItems.push(...result.value);
    } else {
      errors.push(result.reason?.message || "Unknown content loading issue");
    }
  }

  return { loadedItems, errors };
}

function filterItems() {
  const terms = state.query
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  return state.items.filter((item) => {
    const categoryOk = state.category === "all" || item.category === state.category;
    const queryOk =
      !terms.length ||
      terms.every((term) => item.searchFields.some((fieldValue) => fieldValue.includes(term)));
    return categoryOk && queryOk;
  });
}

function updateMeta(filteredCount) {
  const total = state.items.length;
  resultsMeta.textContent = `${filteredCount} result${filteredCount === 1 ? "" : "s"} shown of ${total} total.`;
}

function renderEmpty(message) {
  resultsEl.innerHTML = `<li class="empty-state">${message}</li>`;
}

function renderResults(items) {
  destroyActiveDataTable();
  resultsEl.innerHTML = "";

  if (!items.length) {
    renderEmpty("No matches found. Try a broader keyword or another category.");
    return;
  }

  const grouped = new Map();
  for (const item of items) {
    const folder = item.category || toGroupForPath(item.sourcePath) || "other";
    if (!grouped.has(folder)) {
      grouped.set(folder, []);
    }
    grouped.get(folder).push(item);
  }

  const orderedGroups = [...grouped.entries()].sort(([a], [b]) => {
    const indexA = CONTENT_GROUPS.indexOf(a);
    const indexB = CONTENT_GROUPS.indexOf(b);

    if (indexA === -1 && indexB === -1) {
      return a.localeCompare(b);
    }

    if (indexA === -1) {
      return 1;
    }

    if (indexB === -1) {
      return -1;
    }

    return indexA - indexB;
  });

  for (const [folder, folderItems] of orderedGroups) {
    const heading = document.createElement("h3");
    heading.className = "group-title";
    heading.textContent = `${folder} (${folderItems.length})`;

    const groupNode = document.createElement("li");
    groupNode.className = "result-group";

    const groupGrid = document.createElement("ul");
    groupGrid.className = "group-grid";

    for (const item of folderItems) {
      const rawObject = Object.fromEntries(item.rawFields);
      const node = template.content.firstElementChild.cloneNode(true);
      node.querySelector(".pill").textContent = item.category;

      const cardTop = node.querySelector(".card-top");
      const topLink = document.createElement("a");
      topLink.className = "source-link card-name-link";
      topLink.href = item.sourcePath;
      topLink.target = "_blank";
      topLink.rel = "noopener noreferrer";
      topLink.textContent = rawObject.name || item.title;
      cardTop.prepend(topLink);

      const titleNode = node.querySelector(".title");
      titleNode.remove();

      node.querySelector(".description").textContent = item.description || "No description provided.";

      const keywordsNode = node.querySelector(".keywords");
      keywordsNode.textContent = "";
      if (item.keywords.length) {
        keywordsNode.appendChild(createKeywordPillContainer(item.keywords));
      }

      if (item.learningResourceType.length) {
        const resourceTypesNode = document.createElement("p");
        resourceTypesNode.className = "resource-types";
        resourceTypesNode.appendChild(
          createResourceTypePillContainer(item.learningResourceType),
        );
        node.insertBefore(resourceTypesNode, node.querySelector(".field-list"));
      }

      const fieldList = document.createElement("dl");
      fieldList.className = "field-list";

      for (const [key, value] of item.rawFields) {
        if (HIDDEN_DISPLAY_FIELDS.has(key.toLowerCase())) {
          continue;
        }

        const row = document.createElement("div");
        row.className = "field-row";

        const keyNode = document.createElement("dt");
        keyNode.className = "field-key";
        keyNode.textContent = key;

        const valueNode = document.createElement("dd");
        valueNode.className = "field-value";
        valueNode.textContent = formatFieldValue(value);

        row.appendChild(keyNode);
        row.appendChild(valueNode);
        fieldList.appendChild(row);
      }

      node.appendChild(fieldList);

      groupGrid.appendChild(node);
    }

    groupNode.appendChild(heading);
    groupNode.appendChild(groupGrid);
    resultsEl.appendChild(groupNode);
  }
}

function renderTableResults(items) {
  destroyActiveDataTable();
  resultsEl.innerHTML = "";

  if (!items.length) {
    renderEmpty("No matches found. Try a broader keyword or another category.");
    return;
  }

  const columns = [...TABLE_BASE_COLUMNS];
  const seen = new Set(columns.map((column) => String(column).toLowerCase()));

  for (const item of items) {
    for (const [key] of item.rawFields) {
      if (HIDDEN_DISPLAY_FIELDS.has(key.toLowerCase())) {
        continue;
      }

      const normalizedKey = key.toLowerCase();
      if (!seen.has(normalizedKey)) {
        seen.add(normalizedKey);
        columns.push(key);
      }
    }
  }

  const container = document.createElement("li");
  container.className = "result-group";

  const tableWrap = document.createElement("div");
  tableWrap.className = "table-wrap";

  const table = document.createElement("table");
  table.className = "results-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");

  for (const column of columns) {
    const th = document.createElement("th");
    th.classList.add(tableColumnClassName(column));
    th.textContent =
      column.toLowerCase() === "learningresourcetype" ? "resourceType" : column;
    headRow.appendChild(th);
  }

  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  for (const item of items) {
    const rawObject = Object.fromEntries(item.rawFields);
    const row = document.createElement("tr");

    for (const column of columns) {
      const td = document.createElement("td");
      td.classList.add(tableColumnClassName(column));
      let value;

      if (column === "name") {
        value = rawObject.name || item.title;
      } else if (column === "category") {
        value = item.category;
      } else if (column.toLowerCase() === "description") {
        value = item.description;
      } else if (column.toLowerCase() === "keywords") {
        value = item.keywords;
      } else if (column.toLowerCase() === "learningresourcetype") {
        value = item.learningResourceType;
      } else {
        value = rawObject[column];
      }

      if (column === "name") {
        const nameLink = document.createElement("a");
        nameLink.href = item.sourcePath;
        nameLink.target = "_blank";
        nameLink.rel = "noopener noreferrer";
        nameLink.className = "source-link";
        nameLink.textContent = value === undefined ? "" : formatFieldValue(value);
        td.appendChild(nameLink);
      } else if (column.toLowerCase() === "keywords") {
        td.appendChild(createKeywordPillContainer(value));
      } else if (column.toLowerCase() === "learningresourcetype" || column.toLowerCase() === "resourcetypes") {
        td.appendChild(createResourceTypePillContainer(value));
      } else {
        td.textContent = value === undefined ? "" : formatFieldValue(value);
      }
      row.appendChild(td);
    }

    tbody.appendChild(row);
  }

  table.appendChild(tbody);
  tableWrap.appendChild(table);
  container.appendChild(tableWrap);
  resultsEl.appendChild(container);

  let pageLength = 10;
  let lengthMenu = [5, 10, 25, 50, 100];



  if (window.jQuery?.fn && typeof window.jQuery.fn.DataTable === "function") {
    activeDataTable = window.jQuery(table).DataTable({
      pageLength: pageLength,
      lengthMenu: lengthMenu,
      order: [],
    });
  } else if (typeof window.DataTable === "function") {
    activeDataTable = new window.DataTable(table, {
      pageLength: pageLength,
      lengthMenu: lengthMenu,
      order: [],
    });
  } else {
    console.warn("DataTables library is not available. Rendering plain table.");
  }
}

function renderByView(items) {
  if (state.viewMode === "table") {
    renderTableResults(items);
    return;
  }

  renderResults(items);
}

function applyFiltersAndRender() {
  const filtered = filterItems();
  updateMeta(filtered.length);
  renderByView(filtered);
  syncViewToggleUI();
}

function wireEvents() {
  searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    applyFiltersAndRender();
  });

  categorySelect.addEventListener("change", (event) => {
    state.category = event.target.value;
    applyFiltersAndRender();
  });

  for (const button of viewButtons) {
    button.addEventListener("click", () => {
      state.viewMode = button.dataset.view;
      applyFiltersAndRender();
    });
  }
}

async function init() {
  wireEvents();

  try {
    const contentFiles = await discoverContentFiles();
    const { loadedItems, errors } = await loadAllContent(contentFiles);
    state.items = loadedItems;
    applyFiltersAndRender();

    if (errors.length) {
      console.warn("Some content files failed to load:", errors);
    }

    if (!state.items.length) {
      renderEmpty("No content found yet. Add JSON records to start publishing searchable entries.");
      updateMeta(0);
    }
  } catch (error) {
    console.error(error);
    const fromFileProtocol = window.location.protocol === "file:";
    renderEmpty(
      fromFileProtocol
        ? "Failed to load content from file://. Start a local web server (for example: npm run dev) and open http://localhost:8000."
        : "Failed to load content. Check the manifest and JSON format, then try again.",
    );
    resultsMeta.textContent = "0 results shown of 0 total.";
  }
}

init();
