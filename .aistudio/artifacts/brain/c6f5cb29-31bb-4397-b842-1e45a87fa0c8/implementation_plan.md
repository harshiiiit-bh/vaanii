# VAANI — Ultimate Frontend Transformation & Officer Vaani Redesign

Elevate VAANI into an immersive, military-academy-inspired English command ecosystem featuring a redesigned, athletic 8-pose **Officer Vaani** character system, a refined Command Centre dashboard, anti-duplicate XP protection in PYQ drills, real-time Vocabulary Mastery tracking, and a verified Global & Service-Force Cadet Cohort Leaderboard.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and visual decisions incorporate your confirmed preferences and preserve all existing learning content, account progress, and automated quality gates:

- **Confirmed Decision 1 — Officer Vaani 8-Pose Character System**: Render Officer Vaani using a **high-detail shaded SVG pose rig combined with portrait art** representing a physically fit, athletic young Indian defence training officer across 8 distinct expressions and poses (`Default Welcome`, `Teaching & Explaining`, `Thinking`, `Motivational`, `Congratulatory`, `Serious Examination Mode`, `Achievement Celebration`, and `Helpful Guidance`).
- **Confirmed Decision 2 — Dashboard Command Centre Hero**: Structure the Dashboard around an integrated **Command Hero with Officer Vaani's live briefing, interactive pose/directive selector, and tabular KPI telemetry** (`Total XP`, `Day Streak`, `Topics Cleared`, `Avg Accuracy`), followed by immediate action pathways (`Continue Learning`, `Browse All Topics`, `Today's Focus`, and `Recent Activity`).
- **Confirmed Decision 3 — Global & Service-Force Cohort Leaderboard**: Display **live server-synchronized Cadet rankings alongside clearly badged Academy Benchmark reference records** (`LIVE CADET` vs `ACADEMY BENCHMARK`), ensuring complete transparency without presenting fabricated data as live users.

---

## 1. Overview & Core Concept

- **What It Does**: Upgrades VAANI's visual design system, character companion, Dashboard, PYQ Explorer, Vocabulary Vault, and Cohort Leaderboard into a cohesive, high-precision defence academy training platform while preserving all 35+ grammar topics, 40+ Advanced Grammar Academy lessons, 89 Wren & Martin companion chapters, 51 PYQ papers, and 90-day vocabulary modules.
- **Target Audience / Persona**: NDA, CDS, and AFCAT defence aspirants who thrive on structured discipline, clear tactical feedback, and measurable skill progression.
- **Key Value**: Replaces flat or disconnected visual patterns with a unified command-centre hierarchy, an inspiring and recognizable training officer mascot, distraction-free practice workflows, and trustworthy server-backed progress synchronization.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Dashboard Command Briefing & Pose Switcher**:
   - Upon entering the Command Centre, cadets are greeted by the upgraded **Officer Vaani** in the Hero Command Stage alongside a live tactical briefing and interactive pose/mode selector (`Welcome`, `Briefing`, `Exam Focus`, `Morale`).
   - High-contrast tabular KPI cards display `Total XP`, `Day Streak`, `Topics Cleared`, and `Avg Accuracy`, paired with one-click navigation tiles (`Academy`, `PYQ`, `Arena`, `Vocabulary`, `Profile`).
2. **Contextual Officer Vaani Presence Across Modules**:
   - Officer Vaani appears purposefully across key training touchpoints—Dashboard hero, Grammar Academy introduction, PYQ Command Vault header, Vocabulary Vault guidance, Empty States, Test Completion after-action reports, and Achievement Celebrations—automatically adapting his pose and expression to the cadet's context.
3. **Advanced PYQ Question Bank Explorer & Filtered Drill**:
   - Cadets filter questions by status (`All Questions`, `Correct`, `Incorrect`, `Bookmarked`, `Unattempted`), Exam (`NDA`, `CDS`, `AFCAT`), Year, Topic, and Keyword Search simultaneously.
   - Paginated question cards provide clear numbering, inline option selection, instant explanation reveal, bookmark toggles, Previous/Next navigation, and one-time XP micro-feedback (preventing duplicate XP farming on already-solved questions).
   - Clicking **Launch Filtered Drill** opens a full timed/untimed drill session populated with the exact filtered question set.
4. **Vocabulary Mastery System**:
   - Cadets filter the Vocabulary Bank by `All`, `Mastered`, `Unmastered`, and `Bookmarked` alongside live search and part-of-speech filters.
   - Each word card displays real saved mastery status (`Mastered` vs `In Training`) with an interactive **Toggle Mastered** control on both grid cards and the Word Detail view, plus a Weak/Unmastered Spotlight strip for quick revision.
5. **Global & Service-Force Cadet Cohort Standings**:
   - Cadets filter standings by `All Forces`, `Army`, `Navy`, and `Air Force`, sort by `XP`, `Streak`, or `Accuracy`, search by cadet name or code, and trigger one-click server score synchronization with rate-limit/duplicate protection.

### Visual Identity & Theme

- **Aesthetic Direction**: Premium Indian Defence Academy Command Centre (`National Defence Academy` / `Indian Military Academy` ceremonial precision).
- **Color Palette & Mood (60-30-10 Discipline)**:
  - **60% Dominant Canvas**: Deep Command Navy (`#0b1520` dark mode) and Crisp Parchment Stone (`#f6f4ee` light mode).
  - **30% Structural Surfaces**: Tactical Slate Panels (`#13202d` dark / `#ffffff` light) with subtle hairline borders (`rgba(201, 162, 75, 0.24)`).
  - **10% Accent Budget**: Ceremonial Burnished Brass/Gold (`#c9a24b`), Olive Service Green (`#49d186` nominal/mastered), and Crimson Alert (`#e2575a`).
- **Typography & Hierarchy**:
  - **Display & Section Headers**: `Cinzel` and `Oswald` for authoritative academy headings with balanced text wrapping.
  - **Body Prose & Explanations**: Clean, high-legibility sans body typography with generous line height (`1.55–1.65`) and 4.5:1+ WCAG AA contrast across light, dark, and sepia modes.
  - **Telemetry & Numerals**: `JetBrains Mono` with `font-variant-numeric: tabular-nums` on all XP counters, accuracy percentages, ranks, and timers.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Multi-Pose Shaded SVG Character Rig + Portrait Art for Officer Vaani**
  - *Chosen Approach*: Upgrade Officer Vaani's vector artwork and interactive character rig into a multi-layered, anatomically proportioned, 3D-shaded SVG character system supporting 8 distinct poses and facial expressions, paired with portrait rendering and full backward compatibility with the existing mentor dock.
  - *Why*: Delivers crisp resolution at any screen size (from 42px header launcher to full hero stage), instant zero-latency pose transitions, and zero GPU/network bottlenecks on mobile devices.
- **Decision 2: Strict One-Time XP Award Ledger for PYQ Inline & Filtered Drills**
  - *Chosen Approach*: Track solved question IDs in the persistent Cadet state so answering a question correctly awards XP and triggers the micro-feedback toast only on the first verified correct submission, while subsequent attempts allow practice without inflating XP.
  - *Why*: Protects leaderboard integrity and ensures XP reflects genuine learning progress.
- **Decision 3: Transparent Cohort Standings (`LIVE CADET` vs `ACADEMY BENCHMARK`)**
  - *Chosen Approach*: Synchronize authenticated Cadet accounts with the backend API and label every leaderboard row explicitly as either a verified `LIVE CADET` or a reference `ACADEMY BENCHMARK` tier target, plus a toggle to view **Live Cadets Only**.
  - *Why*: Honors strict anti-fabrication standards while giving cadets meaningful service-force rank targets even when studying solo or offline.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        VAANI COMMAND INTERFACE (SPA)                       │
├──────────────────────┬───────────────────────────┬─────────────────────────┤
│  OFFICER VAANI RIG   │   LEARNING & DRILL VIEWS  │   REACTIVE STATE BUS    │
│  (8-Pose Shaded SVG) │                           │  (vaani:state-changed)  │
│  ┌────────────────┐  │  ┌─────────────────────┐  │  ┌───────────────────┐  │
│  │ 1. Welcome     │  │  │ Command Dashboard   │  │  │ Cadet State & XP  │  │
│  │ 2. Teaching    │  │  │ (Hero + KPIs + Map) │  │  │ Anti-Dup Ledger   │  │
│  │ 3. Thinking    │  │  ├─────────────────────┤  │  ├───────────────────┤  │
│  │ 4. Motivational│  │  │ PYQ Explorer & Drill│  │  │ Vocab Mastery Set │  │
│  │ 5. Congrats    │  │  │ (All/Correct/Wrong/ │  │  │ & Bookmarks       │  │
│  │ 6. Exam Mode   │  │  │  Bookmarked + Drill)│  │  ├───────────────────┤  │
│  │ 7. Celebration │  │  ├─────────────────────┤  │  │ Deep URL Router   │  │
│  │ 8. Guidance    │  │  │ Vocab Mastery Vault │  │  │ (?v=...&id=...)   │  │
│  └───────┬────────┘  │  │ & Cohort Leaderboard│  │  └─────────┬─────────┘  │
└──────────┼───────────┴──┴──────────┬──────────┴──┴────────────┼────────────┘
           │                         │                          │
           ▼                         ▼                          ▼
┌────────────────────────────────────────────────────────────────────────────┐
│            BACKEND SYNC & LEADERBOARD API (Express + Local Store)          │
│   GET/PUT /api/accounts/:code  ·  GET /api/leaderboard/global  ·  /api/arena│
└────────────────────────────────────────────────────────────────────────────┘
```

### Interactive Component & State Mapping

- **Officer Vaani 8-Pose Controller (`VaaniOfficerRig`)**:
  - Maps application state and route context to 8 canonical poses (`welcome`, `teaching`, `thinking`, `motivational`, `congratulatory`, `exam`, `celebration`, `guidance`) and legacy pose classes (`vc-p0` through `vc-p11`).
  - Renders inline Officer Vaani guidance banners in the Dashboard Hero, Academy Header, PYQ Explorer, Vocabulary Vault, Empty States, and Test Result Summaries.
- **PYQ Explorer & Anti-Farming Drill Engine (`PyqExplorer`)**:
  - Supports `All Questions`, `Correct`, `Incorrect`, `Bookmarked`, and `Unattempted` status tabs alongside Exam, Year, Topic, and Keyword Search filters.
  - Inline option selection highlights the chosen option, reveals the explanation immediately, updates accuracy telemetry, and checks `State.pyqSolved[qId]` before awarding XP so repeat submissions never duplicate XP.
- **Vocabulary Mastery Controller**:
  - Connects `State.wordsLearned` and `State.bookmarks` to live filter pills (`All`, `Mastered`, `Unmastered`, `Bookmarked`), inline card mastery toggles, weak-word revision counters, and immediate visual confirmation.
- **Cohort Standings & Sync Guard (`CohortBoard`)**:
  - Connects to `/api/leaderboard/global` with force filters (`All Forces`, `Army`, `Navy`, `Air Force`), sort selectors (`XP`, `Streak`, `Accuracy`), search input, a `Live Cadets Only` filter toggle, and a debounced **Sync My Score** button that prevents duplicate in-flight requests and unauthorized score mutations.
