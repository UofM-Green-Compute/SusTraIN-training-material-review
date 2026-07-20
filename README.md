# SusTraIN-training-material-review
Repository for markdown files on green compute training. 


## Adding new Repository items, and required format

JSON: See the dedicated ReadMe in the repository folder, for a detailed description of the required format for each repository item and how to edit or add new repository items.

## What this repo now includes

- SusTraIN Training Materials folder: `training_materials/`
- A static website entry point at `page_rendering_code/index.html`
- Client-side search logic in `page_rendering_code/app.js`
- UI styling in `page_rendering_code/styles.css`
- Vendored browser dependencies in `page_rendering_code/assets/vendor/` (for GitHub Pages)
- A manifest file at `training_materials/content-manifest.yml`
- A manifest generator script at `page_rendering_code/scripts/generate-manifest.mjs`


The website reads files listed in `training_materials/content-manifest.yml` and lets users search and filter content.

## Automatic file discovery

When deployed on GitHub Pages, the app automatically discovers all `.json` files under:

- `training_materials/ai_impact`
- `training_materials/circular_economy`
- `training_materials/energy_efficiency`
- `training_materials/intro`
- `training_materials/lifecycle_assessment`
- `training_materials/metrics_tools`

This is done by a workflow at `.github/workflows/update-manifest.yml`.

This means newly added JSON files are picked up automatically after you push changes.
The workflow regenerates `training_materials/content-manifest.yml` and commits it automatically if needed.

## Local development fallback

When running locally (not on `*.github.io`), the app falls back to `training_materials/content-manifest.yml`.

To refresh `training_materials/content-manifest.yml` manually, run:

```bash
node page_rendering_code/scripts/generate-manifest.mjs
```

Or use the local dev server with automatic manifest updates whenever JSON files are added/removed/edited:

```bash
cd page_rendering_code
npm run dev
```

This serves the site at `http://localhost:8000` and watches:

- `training_materials/*/*.json`


## Run locally

Use:

```bash
cd page_rendering_code
npm run dev
```

Then open `http://localhost:8000`.

You can still use any other static server if you prefer.

## Publish on GitHub Pages

1. Push this repository to GitHub.
2. In repo settings, open **Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Choose branch `main` and folder `/ (root)`.
5. Save.

Your public searchable site will be available at your GitHub Pages URL.
