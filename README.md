# VAANI — file structure (after the lightening pass)

`index.html` used to be a single 1.5 MB / 8,936-line file containing everything
(markup, CSS, all app logic, and every word/lesson/question). That's why adding
a new PYQ paper was so hard — there was no small, safe place to put it.

The site now works the exact same way, but the same content is split across
files that are each easy to open and edit:

```
index.html          the app shell + logic only (320 KB, was 1.5 MB)
styles.css           all CSS, unchanged, just moved out of <style>
assets/
  gate-bg.jpg         entry-screen background photo (was inline base64)
  gate-jets.webp      entry-screen jets decoration (was inline base64)
data/
  grammar.js          the GRAMMAR lessons array
  vocab.js             the VOCAB array
  pyq/
    2009-I.js  2009-II.js
    2010-I.js  2010-II.js
    2011-I.js  2011-II.js
    2012-I.js
    2017-I.js  2017-II.js
    2018-I.js  2018-II.js
```

Nothing about how the app behaves has changed. Every feature — grammar
lessons, vocab, PYQ practice, tests, games, leaderboard — works exactly as
before. This was verified by running the full data-loading + registry code
end-to-end (all 34 grammar topics, 44 vocab words, and all 11 PYQ papers /
550 questions load and register correctly).

## How to add a new PYQ paper (this is the part that was broken before)

1. Copy any file in `data/pyq/` as a starting template, e.g. `2018-II.js`.
2. Rename it to match the new paper, e.g. `2019-I.js`.
3. Replace the questions inside with the new paper's questions. Keep the same
   shape — every question needs `y, s, n, sec, q, o, ans` at minimum (`exp`,
   `diff`, `rule`, `shortcut`, `tags` etc. are optional but nice to keep).
   Update the `var PYQ_2018_II = [...]` line at the top to
   `var PYQ_2019_I = [...]` (year/session must match the filename and the
   `y`/`s` values on the questions).
4. Open `index.html`, find the block of `<script src="data/pyq/...">` tags
   near the top of the `<body>`, and add one line:
   ```html
   <script src="data/pyq/2019-I.js"></script>
   ```
5. That's it. You never touch the rest of `index.html`. The app's
   `_pyqAutoDiscover()` function scans for any `PYQ_<year>_<session>` variable
   and registers it automatically — no other code changes, no manual sorting,
   no editing a master list.

Adding/editing grammar topics or vocab words works the same way: just edit
`data/grammar.js` or `data/vocab.js` directly — they're now small, focused
files instead of being buried inside an 8,900-line monolith.

## Latest changes (tagline cleanup + 3D jet, v3 — no dependencies)

- Removed the flavor-text taglines that just described the app ("built for
  cadets who read the fine print", "Master every rule...", "Every rank you
  climb here...", etc.) from the gate screen, dashboard hero, Grammar page,
  and PYQ pages. Functional labels and dynamic stats were left alone.
- The old footer tagline spot now has a bigger, pure-CSS 3D brass fighter
  jet. It's built from two crossed clip-path silhouettes (a classic
  lightweight "3D" technique) that spin together, plus a subtle bob and an
  engine-glow shimmer — all done with CSS `@keyframes`, no JavaScript, no
  external library, no separate file. It works fully offline and respects
  the site's existing reduced-motion setting automatically.
  (An earlier version used Three.js from a CDN in a separate `js/` file —
  that's been removed. If you still have a `js/jet-model.js` file or the
  old `<script src="https://cdnjs...">` line in your repo, delete them;
  they're unused now.)
- Also found and extracted a third leftover base64 image (the dashboard
  hero photo) into `assets/hero-photo.jpg` — same bloat problem as the
  gate images, just missed the first pass.

## Latest changes (Book Reading section — Veer Bhogya Vasundhara merged in)

VAANI now has a full "📖 Book Reading" section — your other site, Veer
Bhogya Vasundhara, ported in as a native part of VAANI rather than a
separate site or an iframe/link-out. What that involved:

- **One account for everything.** The 6-digit code system that used to
  live in VBV now lives in VAANI's own gate (create a name → get a code,
  or log in with an existing code). That one account now covers *both*
  your VAANI progress (grammar/vocab/PYQ) and your Book Reading data
  (books, vocab register, levels, spoken English) — logging in once
  restores both. VBV no longer has its own separate login.
- **Honest wording on the code's limits.** Since both sites are plain
  static files (no server), the code lets you switch between saved
  profiles / recover access *on the same browser*. It does not sync an
  account across different devices unless this is running inside
  Claude.ai itself, where shared storage is real. The old VBV wording
  overstated this ("any browser, from anywhere") — the new gate text
  says only what's actually true for a GitHub Pages deployment.
- **Fully isolated styling.** Every one of VBV's CSS rules now lives in
  `styles-vbv.css`, scoped under a single `.vbv-scope` wrapper class, so
  none of it can leak out and affect the rest of VAANI (and vice versa).
  VBV keeps its own fonts (Fraunces/Work Sans/Yatra One) *inside* its
  section; VAANI keeps its own (Oswald/Inter/Cinzel) everywhere else —
  neither bleeds into the other.
- **No shared-name bugs.** Both apps independently used names like
  `toast`, `GRAMMAR`, `btn`, `chip`, `card`-style classes, and even the
  exact same `nav.mainnav` class for their top nav. Every one of these
  was found and separated (VBV's versions renamed with a `vbv-` prefix)
  so a click or a style in one app can never accidentally trigger or
  restyle something in the other. This was checked programmatically, not
  just by eye — full details below if you want them.
- **Your tab-background photos are untouched** — they're the same
  extraction/lightening treatment as VAANI's own images (real `.jpg`
  files instead of inline base64), just relocated to `assets/vbv/`. All
  8 are there: mud, chetwode_refl, parade_ncc, gate, chetwode_day,
  heli_parade, officers_march, heli_full.

### New files
```
js/library.js          VBV's entire app (minus its old gate), namespaced
styles-vbv.css          VBV's styling, scoped under .vbv-scope
data/vbv/images.js       paths to the 8 background photos
data/vbv/quotes.js       the gate quote-ticker content (2193 quotes)
data/vbv/offline-dict.js offline word lookups (329 words)
assets/vbv/*.jpg         the 8 background photos themselves
```

### Modified files
```
index.html   new gate (create/login-with-code), new "Book Reading" nav
             entry + section, new script tags for the files above
styles.css   new CSS for the gate's extra stages (code input/display,
             panel-switch animation, sparkle effect)
```

### How this was verified
Rather than just eyeballing it, every one of these was checked against
the actual merged code before calling it done:
- Every top-level function/variable name in both apps compared — zero
  collisions.
- Every CSS class used anywhere in VBV's markup and rendered HTML
  compared against VAANI's own global CSS classes — zero collisions
  (14 were found and fixed: `btn`, `chip`, `badge`, `brand`, and others).
- Every element `id` in the final merged document checked for
  duplicates — none found.
- CSS custom properties (`--gold`, `--radius`, etc.) that both apps
  happened to name the same — confirmed properly scoped so neither
  overrides the other.
- The full account flow was run end-to-end in a simulated environment:
  create an account, save data from both apps, wipe local state, log
  back in with the same code, confirm both apps' data came back
  correctly, confirm a wrong code is correctly rejected.

## Deploying

Upload the whole folder (`index.html`, `styles.css`, `assets/`, `data/`) to
your static host, keeping the folder structure intact. Nothing else changes
about how you host or open the site.
