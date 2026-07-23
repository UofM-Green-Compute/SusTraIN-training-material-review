# SusTraIN-training-material-review
Repository for markdown files on green compute training. 
See the link to the GitHub pages in the `About` section, to view the SusTraIN training materials.


## Adding new Repository items, and required format

JSON: See the dedicated ReadMe in the repository folder, for a detailed description of the required format for each repository item and how to edit or add new repository items.

## What this repo now includes

- SusTraIN Training Materials folder: `training_materials/`
- Static website entry point at `page_rendering_code/index.html` and `index.html`
- Client-side search logic in `page_rendering_code/app.js`
- UI styling in `page_rendering_code/styles.css`
- Vendored browser dependencies in `page_rendering_code/assets/vendor/` (for GitHub Pages)
- A manifest file at `training_materials/content-manifest.yml`
- A manifest generator script at `page_rendering_code/scripts/generate-manifest.mjs`
- A frontmatter file at `training_materials/content-frontmatter.yml`
- A frontmatter generator script at `page_rendering_code/scripts/generate-frontmatter.mjs`


The website reads files listed in `training_materials/content-manifest.yml` and lets users search and filter content.
The loader also accepts `training_materials/content-manifest.yaml` automatically.

Manifest format:

```yaml
files:
	- path: "../training_materials/Intro/example.json"
		group: "Intro"
```

Frontmatter format:

```json
{
	"files": [
		{
			"path": "../training_materials/Intro/example.json",
			"group": "Intro",
			"item": {
				"name": "Frugal AI PSL-Week course materials",
				"url": "https://github.com/Deyht/frugal_ai",
        		"description": "Frugal AI PSL-Week course materials: slides and hands-on practical work on ...",
			}

		}
	]
```

## Automatic file discovery

When deployed on GitHub Pages, the app automatically discovers all `.yaml` and `.yml` files under the `training_materials` directory.

This is done by a workflow at:

	- .github/workflows/update-manifest.yml
	- .github/workflows/update-manifest.yml

This means newly added YAML files are picked up automatically after you push changes.
The workflow regenerates `training_materials/content-manifest.yml` and `training_materials/content-frontmatter.yml` and commits them automatically if needed.

## Local development fallback

When running locally (not on `*.github.io`), the app falls back to `training_materials/content-manifest.yml` and
`training_materials/content-frontmatter.yml`.

To refresh those 2 files manually, run:

```bash
node page_rendering_code/scripts/generate-manifest.mjs
node page_rendering_code/scripts/generate-frontmatter.mjs
```

Or use the local dev server with automatic manifest updates whenever YAML files are added/removed/edited:

```bash
cd page_rendering_code
npm run dev
```

This serves the site at `http://localhost:8000` and watches:

- `training_materials/*/*.yaml`
- `training_materials/*/*.yml`


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
