# VAANI

**VAANI** is a browser-based English-learning workspace for competitive-exam preparation. It brings lessons, vocabulary, question practice and reading progress together in one responsive website.

**Live site:** https://harshiiiit-bh.github.io/vaanii/

## What’s inside

- **Grammar:** guided lessons, examples, topic progress, quizzes and revision.
- **Vocabulary:** searchable word bank, daily learning sets, meanings and usage.
- **Comparisons:** a searchable library of commonly confused English pairs with explanations and practice.
- **Previous Year Questions:** paper-wise NDA/CDS practice, timed sessions and review.
- **Arena:** create or join timed matches and view match results.
- **Book Reading:** manage a reading queue, log pages and time, save highlights and capture vocabulary in a shared register.
- **The Academy:** explore an image-led overview of NDA, IMA, AFA and INA, with credited photographs.
- **Dashboard, Profile and Service Record:** review learning activity, progress and earned milestones.

## Run locally

VAANI supports both **full-stack dynamic mode** (via Node.js & Express in `server.js`) and **static hosting mode** (such as GitHub Pages).

### Option A — Full-Stack Dynamic Server (Recommended)

1. Install dependencies and start the Express server on port `3000`:

   ```bash
   npm install
   npm start
   ```

2. Open http://localhost:3000/ in your browser.
3. Optional: copy `.env.example` to `.env` to customize `PORT`, `VAANI_ALLOWED_ORIGINS`, or external Supabase/Cloudflare endpoints.

### Option B — Static HTTP Server

1. Serve the repository root with any static HTTP server:

   ```bash
   python3 -m http.server 8000
   ```

   On Windows, `py -m http.server 8000` may be used instead.
2. Open http://localhost:8000/ in your browser.

Serving the files over HTTP is recommended over opening `index.html` directly, because browser storage and some web APIs behave differently for local files.

## Deploy with GitHub Pages

1. Open the repository’s **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select the `main` branch and the `/ (root)` folder, then save.
4. Open the published URL shown in the Pages settings.
5. If connecting the GitHub Pages frontend (`https://harshiiiit-bh.github.io/vaanii/`) to a separately hosted Node.js/Express backend, set `window.VAANI_API_BASE` or `<meta name="vaani-api-base" content="https://your-backend-host">` so `/api/*` requests route to the Express origin while offline fallback remains active.

The site uses relative paths. Keep `index.html`, its local assets, scripts and data folders in their existing locations when deploying.

## Deploy to Vercel (static frontend)

Vercel publishes the static frontend from the generated `public/` directory. Run `npm run build` to validate the repository and copy the site pages, styles, assets, JavaScript and learning data into that directory. The Vercel configuration uses this build and output directory. The Express server is a separate backend; when it is hosted independently, configure `VAANI_API_BASE` in the frontend to point to that backend.

## Data and privacy

- VAANI saves learning progress in browser storage and synchronizes with the Express `/api/accounts/:code` endpoint when a backend is available.
- Book Reading uses the same six-digit profile code as the main site. On GitHub Pages without a backend URL configured, the code separates profiles **in the current browser only**; it is not a password and does not provide cross-device cloud sync.
- Use **Book Reading → Settings → Download Backup** before clearing browser data or moving to another browser. Restore a Book Reading backup from the same Settings panel.
- Server-side state snapshots can be created, checksum-verified, and restored with `npm run backup` and `npm run backup:drill` (`scripts/backup-recovery.mjs`).
- Optional online dictionary, writing-check and Arena services may be unavailable. Curated learning content and supported offline features remain available.
- Never commit database passwords, Supabase service-role keys or other private credentials. If Arena’s optional Supabase sync is configured, use only a publishable/anon key in the browser and enforce appropriate Row Level Security policies in Supabase.

## Content files

- `data/grammar.js` and `data/grammar-basics.js`: grammar topics and plain-language lesson starters.
- `data/vocab.js`: curated vocabulary entries.
- `data/comparisons-extra.js`: additional confusable-word pairs.
- `data/pyq/`: paper data and `manifest.js`, which lists the paper files loaded by the site.
- `data/vbv/`: Book Reading images, offline dictionary data and quotes.

Keep data in the format used by neighbouring entries. PYQ questions should be transcribed and checked against the source paper; authored practice must not be labelled as an official PYQ.

## Project map

- `index.html` — page structure, navigation and script loading.
- `server.js` — Node.js/Express backend server, content registry, progression engine, health/readiness probes (`/health`, `/api/health/ready`, `/api/metrics`), and persistent store.
- `js/app.js` — main VAANI interface and learning logic.
- `js/vaani-dynamic-engine.js` — reactive state bus, Officer Vaani 8-pose SVG rig, PYQ Explorer, Vocab Mastery filters, Cohort Leaderboard, and multi-origin API sync.
- `js/library.js` — Book Reading, its register, profile storage and Academy gallery.
- `js/vaani-arena.js` — Arena match flow and optional leaderboard adapter.
- `styles.css`, `styles-vbv.css`, and `vaani-*.css` — shared and module-specific styling.
- `scripts/check-quality.mjs` — data, markup and integration checks.
- `scripts/backup-recovery.mjs` — SHA-256 checksum-verified backup and disaster recovery utility.
- `.github/workflows/quality.yml` — automated checks on pull requests and pushes to `main`.

## Check changes

Use Node.js 20 or newer. From the repository root, run:

```bash
find . -type f -name '*.js' -not -path './.git/*' -not -path './node_modules/*' -print0 | xargs -0 -r -n1 node --check
node scripts/check-quality.mjs
node scripts/test-backend-master.mjs
node scripts/test-infrastructure-master.mjs
```

The first command checks JavaScript syntax. The second checks page IDs, local file references and the project’s learning-data and integration rules. The backend and infrastructure test suites verify all Express API endpoints, CORS, security boundaries, backup/restore drills, and 23 end-to-end user journeys. GitHub Actions also runs a Playwright Chromium smoke test across the dashboard, Book Reading, Academy images, mobile layout and account flows.

When adding a feature, preserve existing account data, keep controls keyboard-accessible, and test the affected page at desktop and mobile widths.

