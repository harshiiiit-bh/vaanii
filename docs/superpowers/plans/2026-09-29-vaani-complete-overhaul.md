# VAANI Complete Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing VAANI site across learning, PYQ, profile, vocabulary, Arena, responsiveness, accessibility, stability, and security while retaining user data and existing routes.

**Architecture:** Keep the static HTML/CSS/classic-script site and its current global interfaces. Add structured Grammar Academy data and an adapter to legacy `GRAMMAR` objects, extend the existing account-scoped revision and progress models, and strengthen current browser/data checks. Keep Arena usable locally while removing trust from direct browser score writes; prepare server/policy work only as a draft, never apply it to production.

**Tech Stack:** HTML, CSS, browser JavaScript, Node.js scripts, Playwright already used by the repository CI, Supabase Edge Function/SQL proposal only where appropriate.

**Spec:** `docs/superpowers/specs/2026-09-29-vaani-complete-overhaul-design.md`

## Execution Status

- The current branch already contains the refreshed PYQ, Vocabulary, Profile, Book Reading, responsive navigation, and local Arena experiences; those remain covered by the repository quality/browser checks.
- Implemented in this pass: the 41-lesson, four-stage Grammar Academy compatibility layer; same-browser account isolation and migration hardening; account-scoped PYQ bookmarks and grammar mastery; and removal of direct anonymous browser-to-Supabase Arena score writes.
- Final verification on 2026-09-29: syntax checks across 71 JavaScript files, `scripts/check-quality.mjs`, `scripts/test-grammar-academy.mjs`, same-browser account isolation/migration tests, and the complete Playwright suite passed. Playwright used a loopback HTTP server; outbound reads were enabled for the real Academy image hosts, and the strict four-photo load assertion passed.
- Browser coverage passed for mobile frame visibility/overflow, Profile and Leaderboard interactions, PYQ setup/bookmark/answer flows, Vocabulary search/detail/filters, Grammar Academy lessons and mixed practice, 2,845 PYQ render checks, 1,009 3D route cycles, and the 320–1600 px responsive matrix.
- The default browser sandbox denies external image requests; the Academy image failure seen there was environmental (`ERR_NETWORK_ACCESS_DENIED`). The same unmodified image assertion passes when the requested suite can reach the source URLs.
- Remaining deployment work: an authenticated server-side Arena score validator and production Supabase schema/policy work. Shared Arena scoring is deliberately disabled; no production database or policy changes are part of this implementation.
- Remaining review limitation: automated content checks validate coverage, answer metadata, explanations, duplicates, mappings, and progression; a separate expert editorial review is still appropriate before presenting the Academy as a formally certified exam resource.

## Global Constraints

- Work only on `upgrade/vaani-complete-overhaul`; do not commit, push, merge, or deploy.
- Preserve existing account progress, topic IDs, routes, PYQ source data, answer keys, bookmarks, and local backups.
- Do not add paid services or unnecessary dependencies.
- Do not apply production Supabase migrations or policies; never represent unauthenticated browser data as a verified score.
- Keep online features optional and retain useful offline behavior.
- Keep all new UI keyboard-accessible, responsive from 320 px, and reduced-motion aware.

## Review Focus

- Legacy saved topic/quiz/bookmark state maps to current UI unchanged — assert seeded existing-account browser state before and after navigation.
- New lesson assessment metadata has a missing or malformed answer/explanation — validate every authored item and all distractors.
- Slow/out-of-order async operations update a replaced screen — assert stale results do not mutate current UI and timers stop on navigation.
- Supabase/online service errors or forged client fields appear as trusted data — assert fallback and unverified states, and no direct score-write adapter is enabled.
- Narrow/keyboard/reduced-motion users cannot complete a flow — test keyboard paths, 320/360/390/414 px, tablet/desktop, focus, and motion preferences.

---

### Task 1: Baseline audit and deterministic regression harness

**Files:**
- Modify: `scripts/check-quality.mjs`
- Modify: `scripts/smoke-dashboard.mjs`
- Create: `scripts/test-grammar-academy.mjs`
- Create: `scripts/smoke-account-isolation.mjs`
- Create: `scripts/smoke-account-migration.mjs`

**Interfaces:**
- Tests consume existing global data/render APIs in browser and `GRAMMAR`, `GRAMMAR_BASICS`, and PYQ source data in Node.
- Produces deterministic baseline reports for old route/data compatibility, grammar content schema, mobile overflow, keyboard accessibility, and Arena lifecycle.

- [ ] Add regression assertions for all existing grammar topic IDs, legacy saved scores/completion/bookmarks, account migration, paper IDs and answers, local Arena code/seed/timer/result behavior.
- [ ] Run each targeted regression and verify a deliberately missing requirement is caught before relying on it.
- [ ] Keep new test scripts dependency-free except for the existing Playwright import in the browser suite.

### Task 2: Structured Advanced Grammar Academy content

**Files:**
- Create: `data/grammar-academy.js`
- Modify: `data/grammar.js`
- Modify: `data/grammar-basics.js`
- Modify: `index.html`
- Modify: `scripts/check-quality.mjs`
- Test: `scripts/test-grammar-academy.mjs`

**Interfaces:**
- Produces `window`/classic-script global `GRAMMAR_ACADEMY` with stable topic/lesson IDs and stages `foundation`, `intermediate`, `advanced`, `mastery`.
- Legacy `GRAMMAR` keeps all existing IDs, titles, quiz records, PYQ links, and public fields. Adapter resolution does not rename saved keys.

- [ ] Add failing content checks for old-ID coverage, new advanced concept coverage, prerequisite validity/cycles, lesson minimums, unique exercise IDs, valid answer indexes, full explanations, provenance, and duplicate prompts.
- [ ] Author and independently audit rich lessons on all requested topics and deepen existing topics, with carefully checked examples, counterexamples, exceptions, errors, conceptual exercises, tiered original assessments, and distractor explanations.
- [ ] Add exam-skill metadata without claiming authored material is official PYQ; keep sourced PYQ data byte/content stable.
- [ ] Load data before the app and adapt legacy topic details to the structured lessons.
- [ ] Run curriculum/data checks and existing PYQ answer/provenance audits.

### Task 3: Academy learning interactions and diagrams

**Files:**
- Create: `js/vaani-grammar-academy.js`
- Modify: `js/app.js`
- Modify: `index.html`
- Modify: `vaani-grammar-ux.css`
- Modify: `scripts/smoke-dashboard.mjs`

**Interfaces:**
- `VaaniGrammarAcademy.resolve(topicId)`, `.analyzeSentence(input)`, `.getAdaptiveItems(state)`, and `.gradeExercise(item, response)` provide pure/testable curriculum operations.
- Existing `openTopic(id)`, `switchView('grammar'|'journey'|'topic')`, notes, bookmark, quiz, and PYQ links remain callable.

- [ ] Test clause/phrase/token analysis and invalid input, multi-clause examples, display text alternatives, and stable IDs.
- [ ] Render progressive lesson stages, lesson navigation/prerequisites, visual grammar diagrams with text equivalents, conceptual interactions, mixed challenge, and increasingly hard assessments.
- [ ] Connect grammar mistakes to existing `reviewQueue` with `kind:'grammar'` and add account-scoped lesson mastery without replacing old topic scores.
- [ ] Test keyboard-only completion, focus return, 320–414 px layouts, and reduced motion.

### Task 4: PYQ archive and practice improvements

**Files:**
- Modify: `js/app.js`
- Modify: `index.html`
- Modify: `vaani-pyq-polish.css`
- Modify: `scripts/check-quality.mjs`
- Modify: `scripts/smoke-dashboard.mjs`

**Interfaces:**
- Existing `PYQ_ALL`, `PV`, question IDs, answer records, `pvStartSession`, `pvFinishSession`, and `pyqLearnConcept` stay compatible.

- [ ] Test exam/year/session/topic filters, question progress, feedback, bookmarks, incorrect/due revision, exam resume, and existing three-/four-part/no-error presentation.
- [ ] Improve archive discovery, session feedback, and mobile paper cards without changing official source question text or answer keys.
- [ ] Label new practice as authored; link grammar concepts by validated topic/lesson IDs.
- [ ] Run full source-bank and browser presentation audits.

### Task 5: Vocabulary discovery and profile progress center

**Files:**
- Modify: `js/app.js`
- Modify: `js/library.js`
- Modify: `index.html`
- Modify: `vaani-vocab.css`
- Modify: `vaani-profile.css`
- Modify: `scripts/smoke-dashboard.mjs`

**Interfaces:**
- Existing `VOCAB`, `VOCAB_BY_ID`, daily-word data, Book Reading capture, `State`, `renderProfileSnapshot`, `saveState`, account import/export, and account IDs remain stable.

- [ ] Add test coverage for current search/filter/detail capture, account-specific activity, legacy import/export, and stale async dictionary results.
- [ ] Improve vocabulary search/discovery, confused-word comparisons, retrieval practice, review queue links, and small-screen navigation while preserving all source entries and Book Register actions.
- [ ] Improve profile’s account-specific progress/statistics/loading/error states and backup/restore clarity; do not describe local codes as authentication.
- [ ] Verify account switching, migration, backup/restore, and Book Reading integrations.

### Task 6: Arena journey and security boundary

**Files:**
- Modify: `js/vaani-arena.js`
- Modify: `index.html`
- Modify: `vaani-arena-briefing.css`
- Create: `supabase/functions/arena-score/index.ts` only if implementation can be authenticated and server-validated end-to-end
- Create: `docs/security/arena-supabase-proposal.md`
- Modify: `scripts/check-quality.mjs`
- Modify: `scripts/smoke-dashboard.mjs`

**Interfaces:**
- Preserve `VX.arena.encode/decode/questionsFor`, local adapter, local attempts, and the current screen transition API.
- Shared score writes require a verified user JWT and server-side validation; no service-role key enters browser files. Legacy rows display as unverified.

- [ ] Test malformed/expired codes, capacity, duplicate/replayed submissions, invalid question/answer pairs, timer cleanup, reconnect/resume, result ordering, and no-network behavior.
- [ ] Improve landing/create/join/waiting/briefing/run/review/result/history/leaderboard states and clear host/player permissions without client-only trust.
- [ ] Remove or disable direct anon REST score submission and keep local match play available.
- [ ] Prepare a reversible, additive policy/data proposal and authenticated server validation path. Do not apply it or claim production security; pause if any live migration or policy action becomes necessary.
- [ ] Run local Arena lifecycle and static security checks.

### Task 7: Cross-site stability, responsive/accessibility, and feature integration

**Files:**
- Modify: `js/app.js`
- Modify: `js/library.js`
- Modify: `js/vaani-arena.js`
- Modify: `js/vaani-3d-safe.js`
- Modify: relevant `vaani-*.css`
- Modify: `scripts/smoke-dashboard.mjs`

**Interfaces:**
- Keep existing routes, navigation history and module APIs; changes must be additive or adapter-based.

- [ ] Add regressions for navigation/back history, timer/listener cleanup, reduced-motion, 3D intersection lifecycle, async stale requests, console errors, missing assets, and horizontal overflow.
- [ ] Reproduce and fix actual issues observed in the full site/browser suite; do not delete functioning controls or mask errors.
- [ ] Check touch target, focus, aria names/live states, and overflow at 320/360/390/414 px, tablet, laptop, and wide desktop.
- [ ] Retain offline fallbacks and existing notification, writing coach, dictionary, comparisons, Books, and account flows.

### Task 8: Full verification and delivery review

**Files:**
- Modify: `README.md`
- Modify: `scripts/check-quality.mjs`
- Modify: `.github/workflows/quality.yml` only if new test commands need to join existing CI.

**Interfaces:**
- All static data, browser tests, and the existing check scripts remain directly runnable from the repository root.

- [ ] Run JavaScript syntax checks across all `.js` and `.mjs` files.
- [ ] Run `node scripts/check-quality.mjs`, `node scripts/test-grammar-academy.mjs`, `scripts/smoke-account-isolation.mjs`, `scripts/smoke-account-migration.mjs`, and existing `scripts/smoke-dashboard.mjs`.
- [ ] Run the full Chromium regression suite at requested viewport widths and with keyboard/reduced-motion settings when browser tooling is available.
- [ ] Fix regressions; report unavailable tools and external deployment prerequisites exactly.
- [ ] Review final diff/status for unrelated edits and list files, completed content, test results, outstanding bugs, and production security prerequisites.
