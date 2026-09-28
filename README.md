# VAANI

**VAANI** is a browser-based English-learning workspace for competitive-exam preparation. It brings lessons, vocabulary, question practice and reading progress together in one responsive website.

**Live site:** https://harshiiiit-bh.github.io/vaani/

## What’s inside

- **Grammar:** guided lessons, examples, topic progress, quizzes and revision.
- **Vocabulary:** searchable word bank, daily learning sets, meanings and usage.
- **Comparisons:** a searchable library of commonly confused English pairs with explanations and practice.
- **Previous Year Questions:** paper-wise NDA/CDS practice, timed sessions and review.
- **Arena:** create or join timed matches and view match results.
- **Book Reading:** manage a reading queue, log pages and time, save highlights, capture vocabulary, take level tests and practise spoken English.
- **Dashboard, Profile and Service Record:** review learning activity, progress and earned milestones.

## Run locally

VAANI is a static site. It has no package installation or build step.

1. Clone or download this repository.
2. Serve the repository root with a local web server. For example, with Python:

   \`\`\`bash
   python3 -m http.server 8000
   \`\`\`

   On Windows, \`py -m http.server 8000\` may be used instead.
3. Open http://localhost:8000/ in your browser.

Serving the files over HTTP is recommended over opening \`index.html\` directly, because browser storage and some web APIs behave differently for local files.

## Deploy with GitHub Pages

1. Open the repository’s **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select the \`main\` branch and the \`/ (root)\` folder, then save.
4. Open the published URL shown in the Pages settings.

The site uses relative paths. Keep \`index.html\`, its local assets, scripts and data folders in their existing locations when deploying.

## Data and privacy

- VAANI saves learning progress in browser storage.
- Book Reading uses the same six-digit profile code as the main site. On GitHub Pages, the code separates profiles **in the current browser only**; it is not a password and does not provide cross-device cloud sync.
- Use **Book Reading → Settings → Download Backup** before clearing browser data or moving to another browser. Restore a Book Reading backup from the same Settings panel.
- Optional online dictionary, writing-check and Arena services may be unavailable. Curated learning content and supported offline features remain available.
- Never commit database passwords, Supabase service-role keys or other private credentials. If Arena’s optional Supabase sync is configured, use only a publishable/anon key in the browser and enforce appropriate Row Level Security policies in Supabase.

## Content files

- \`data/grammar.js\` and \`data/grammar-basics.js\`: grammar topics and plain-language lesson starters.
- \`data/vocab.js\`: curated vocabulary entries.
- \`data/comparisons-extra.js\`: additional confusable-word pairs.
- \`data/pyq/\`: paper data and \`manifest.js\`, which lists the paper files loaded by the site.
- \`data/vbv/\`: Book Reading images, offline dictionary data and quotes.

Keep data in the format used by neighbouring entries. PYQ questions should be transcribed and checked against the source paper; authored practice must not be labelled as an official PYQ.

## Project map

- \`index.html\` — page structure, navigation and script loading.
- \`js/app.js\` — main VAANI interface and learning logic.
- \`js/library.js\` — Book Reading, its register and profile storage.
- \`js/vaani-arena.js\` — Arena match flow and optional leaderboard adapter.
- \`styles.css\`, \`styles-vbv.css\`, and \`vaani-*.css\` — shared and module-specific styling.
- \`scripts/check-quality.mjs\` — data, markup and integration checks.
- \`.github/workflows/quality.yml\` — automated checks on pull requests and pushes to \`main\`.

## Check changes

Use Node.js 20 or newer. From the repository root, run:

\`\`\`bash
find . -type f -name '*.js' -not -path './.git/*' -not -path './node_modules/*' -print0 | xargs -0 -r -n1 node --check
node scripts/check-quality.mjs
\`\`\`

The first command checks JavaScript syntax. The second checks page IDs, local file references and the project’s learning-data and integration rules.

When adding a feature, preserve existing account data, keep controls keyboard-accessible, and test the affected page at desktop and mobile widths.
