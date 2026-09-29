# VAANI Complete Overhaul Design

## Goal and constraints

Deliver the coordinated product upgrade described in the supplied overhaul brief, with a complete Advanced Grammar Academy and the other existing-site workstreams improved together. Keep the static-site architecture, the current feature branch, original learning data, and existing browser-stored progress. Do not commit, push, merge, deploy, change live Supabase policies, or run a production migration. A backend/policy design may be prepared locally, but live trust guarantees must not be claimed until deployment and verification.

No paid services or new runtime dependencies are required. Optional network-backed features must fail clearly and leave local study features usable.

## Existing interfaces to preserve

- All existing grammar IDs in `GRAMMAR`, old `grammar`, `journey`, and `topic` routes, `lastListView`, bookmarks, notes, topic completion, topic progress, and `quizScores` keys.
- Existing PYQ files, IDs, answer indexes, exam/year/session provenance, and prior paper navigation.
- Account code behavior, per-account saved state, legacy progress migration, local backup/restore, Book Reading routes, and the regression coverage for same-browser account switching.
- Existing Vocabulary, Comparisons, tests, writing coach, notifications, 3D, Book Reading, and local Arena functionality.

## Curriculum and learning architecture

Keep legacy `GRAMMAR` records as the compatibility surface and add a structured curriculum data layer keyed by stable topic/lesson IDs. The Academy layer supplies learning stage, prerequisite links, detailed lesson sections, examples/counterexamples, misconception notes, diagrams, conceptual exercises, authored assessment items, and exam-skill tags. It does not copy or relabel official PYQs. Map any topic split or alias to a legacy ID so existing saved progress remains meaningful.

Curriculum stages progress from foundations to intermediate, advanced, and mastery. Content covers parts of speech and phrase/clause structure; nouns, pronouns, verbs, determiners, modifiers, agreement, tense/aspect and sequence; non-finite clauses, gerunds/infinitives and reduced relatives; voice, modality, conditionals, inversion and subjunctive constructions; reported speech, parallelism, punctuation, transformations, editing, and mixed exam tasks. Each substantial lesson contains a conceptual explanation, at least three checked examples including a counterexample, common errors, a guided exercise, and increasing assessment difficulty. Assessment explanations address why the correct choice fits and why plausible distractors fail.

Retain the current quiz contract `{q, opts, ans, exp}` as a compatibility adapter while the rich schema supplies structured original questions. Keep grammar mistakes in the existing Leitner queue (`reviewQueue`) with `kind: 'grammar'`; store per-lesson mastery separately under a new account-scoped State field. A keyboard-accessible sentence analyzer exposes token, phrase, clause, head, and function labels in both visual and linear text forms. Adaptive revision selects due mistakes and weak concepts deterministically; mixed challenges combine tags without pretending to be official questions.

## Exam alignment and provenance

Use UPSC NDA wording (grammar and usage, vocabulary, comprehension, cohesion in extended text), UPSC CDS wording (understanding and workmanlike use of words), and the IAF AFCAT listed objective formats (error detection, completion, cloze, rearrangement, substitution, and related vocabulary formats) as scope anchors. Mark new material as authored practice. Use official PYQ labels only for questions already traceable to source papers and preserve their source IDs and answer keys.

## Existing study sections

- **PYQ:** Preserve every source question and its answer. Improve exam/year/session selection, filter clarity, progress, answer feedback, bookmarks and weak/incorrect review. Keep three/four-part error questions and no-error handling intact.
- **Vocabulary:** Preserve the curated bank and Book Reading capture. Improve discovery, search, filters, confused-word comparisons, recall practice and revision links without duplicating the existing review queue.
- **Profile and progress:** Make account-specific progress, recent activity, skill signals, backup/restore, and logout/account status clear. Treat six-digit local codes as profile selectors, not authentication. Existing data remains readable.
- **Arena and leaderboard:** Preserve local match creation, code parsing, seeded question consistency, timer, reconnect/review/result flow, and local history. Never accept a browser-supplied score as verified. Disable or clearly downgrade unsafe direct-to-table Supabase writes and mark legacy public-board results as unverified. Prepare an authenticated server-validation and RLS proposal only; require verified user identity, server-side match/answer validation, replay/duplicate protection, bounded inputs, and ownership-aware policies before shared scores can be called trusted. Live policies, migrations, credentials, or deployments require later approval and verification.

## Stability, accessibility, and visual system

Retain the current visual language while making Grammar, PYQ, Vocabulary, Profile, Leaderboard, and Arena flows consistent. Keep mobile navigation/back behavior and fixed controls usable from 320 px upward, prevent horizontal overflow, avoid repeated DOM work that causes flicker, guard asynchronous updates against stale views, and clear timers/listeners when screens are replaced. Interactive controls work by keyboard, use labels and live feedback, have visible focus and adequate touch targets, and offer non-animated equivalents. CSS motion honors `prefers-reduced-motion`; diagrams also have readable text descriptions.

## Verification and acceptance

Add deterministic structural/content-quality checks for curriculum IDs, prerequisites, stage ordering, minimum lesson and exercise coverage, assessment answer validity, explanation presence, duplicates, provenance labels, and PYQ integrity. Add browser regressions for old routes/progress, new Academy interactions, keyboard use, reduced motion, mobile widths (320/360/390/414), tablet/desktop, account/migration isolation, PYQ formats, and local Arena lifecycle. Run syntax checks, the full quality checker, existing browser suite, new regressions, responsive/overflow checks, and a final scope/diff review. Fix regressions rather than weakening assertions.

## Security/deployment boundary

The repository currently embeds a public Supabase project key and a direct browser REST adapter for Arena scores; the browser supplies identity and score fields. A public key is not a secret, but a public client must not be treated as proof of score integrity. Local code will remove the unsafe trust assumption and retain an offline path. Any policy migration/server endpoint remains unapplied. Report exactly what is code-complete, what still needs Supabase configuration/deployment, and which tests could not run.
