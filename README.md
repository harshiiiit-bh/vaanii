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

## Deploying

Upload the whole folder (`index.html`, `styles.css`, `assets/`, `data/`) to
your static host, keeping the folder structure intact. Nothing else changes
about how you host or open the site.
