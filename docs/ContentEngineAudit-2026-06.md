# Content Engine Audit & Redesign — 2026-06-22

> Scope: the full content-generation stack — lessons, exercises, daily puzzle, archive,
> hints/tips, visualizations, adaptive sequencing, repetition prevention, and **lesson↔exercise
> mapping**. This is the canonical report for the "content feels repetitive / lessons land in the
> wrong context" complaint and the redesign that follows.

## TL;DR

The engine is **far more capable than the symptoms suggest**. The intelligence layer is real and
already shipped: an 8-priority adaptive orchestrator, a multi-signature fingerprint + diversity
engine, a 150+ node knowledge graph with prerequisites and misconceptions, rich 5-part concept
lessons, an answer-leak guard, and a self-auditing content-health monitor.

The defect the user feels is **not** missing intelligence. It is a **mapping-layer break confined to
two surfaces — the Archive and the Daily Puzzle** — where the lesson, hint, and visual attached to a
generated problem are re-derived by **fuzzy title-keyword matching** instead of from the problem's
own concept. When a generated title doesn't match a keyword case, both matchers silently fall back to
an **unrelated** concept (often a *milestone* lesson). Concretely, today:

- A **Euler-totient** archive problem (3★) is taught with the **Binomial Theorem** lesson.
- A **chessboard-doubling** problem (4★) is taught with the **Order of Operations (PEMDAS)** lesson.
- A **2×2 determinant** problem (≤2★) is taught with the **One-Step Linear Equations** lesson.
- A **telescoping-series** problem is taught with the **Limits at Infinity** lesson.

That is the trust-killer. The standard play loop (`/api/math/problems`) does **not** have this bug —
it is already concept-anchored.

The redesign is therefore **not a rewrite**. It is: (1) make the generator emit a canonical concept
identity for every problem, (2) resolve lesson + hint + visual from that single identity, (3) lock it
with a coherence test. Plus targeted hardening of the genuinely thin spots.

---

## 1. What already exists (do not rebuild)

| Mission ask | Already implemented in | Verdict |
|---|---|---|
| **Content DNA / unique fingerprint** | `mathEngine/exerciseMemory.js` — `computeSignatures()` emits `conceptSig`, `structureSig` (numbers blanked to `#`), `contextSig` (story words), `answerSig`, and a combined `signature` | ✅ strong; missing only the richer pedagogical tags (Bloom/method/representation) |
| **Similarity detection** | `exerciseMemory.scoreDiversity()` — weighted, recency-decayed novelty score across signature/structure/context/answer/concept | ✅ strong |
| **Content diversity engine** | `exerciseMemory.pickFreshExercise()` — generate-N-keep-freshest, with per-batch dedupe | ✅ wired into `/problems`, archive, daily |
| **Knowledge graph** | `mathEngine/knowledgeGraph.js` — 150+ nodes with `prereqs`, `misconceptions` (with executable distractor `rule`s), `baseElo` | ✅ exists; lacks explicit `dependents`, `representations`, `visualModel`, `objectives` on the node (they live in `conceptLessons.js` instead) |
| **Adaptive sequencing** | `mathEngine/problemOrchestrator.js` — `selectNextConcept()` priority chain: misconception → retention → prereq gap → mastery → dimension → transfer → exploration → challenge | ✅ strong |
| **Mastery / frustration / recency signals** | `masteryEngine.js` (accuracy/fluency/retention/independence), `retentionEngine.js`, `misconceptionEngine.js`, `learnerModel.js`, `exerciseMemory.getConceptRecency()` | ✅ strong |
| **Quality filters (answer-leak)** | `mathEngine/lessonSafety.js` — strips lesson examples that match the served problem's answer or structure; strips answer keys from visual specs | ✅ good |
| **Self-auditing content health** | `mathEngine/contentAudit.js` — fuses pedagogical feedback + exposure memory into a weak/repetitive report | ✅ exists |
| **Concept-first lessons** | `mathEngine/conceptLessons.js` — 150+ rich lessons: `intuitionHook`, `whatItIs`, `whyItWorks`, `whenToUse`, `representations[]`, `commonMistakes[]`, `connections[]`, worked `examples[]` | ✅ excellent |

**Implication:** the bulk of the mission's "build X" items already exist at production quality. The
honest engineering response is to **fix the mapping break and harden the thin spots**, not to
re-implement the orchestrator/fingerprinter/graph.

---

## 2. The core defect — concept identity is lost, then guessed (HIGH)

### 2.1 How a problem loses its identity

`generateArchiveProblem(category, stars)` (`mathGenerator.js:600-968`) builds a problem with a fixed
`title` string per branch (e.g. `"Euler Totient of Prime Product"`, `"Wheat and Chessboard
Geometric Progression"`) but **no canonical concept id**. The returned object is
`{ title, story, question, correct_answer, options, explanation, category, stars, source }`.

### 2.2 How identity is then *guessed* — twice, independently

Both the Archive (`routes/archive.js`) and the Daily Puzzle (`routes/dailyPuzzle.js`) take that
title and run it through **two separate fuzzy matchers**:

1. **Lesson** — `getLessonForArchive(title, category, stars)` (`mathEngine/lessons.js:394-904`):
   ~42 `if (title.includes("keyword"))` cases, then a fallback:
   ```js
   const fakeLevel = stars >= 4 ? 45 : stars >= 3 ? 30 : stars >= 2 ? 18 : 9;
   return getLessonAndExamples(category, fakeLevel);
   ```
2. **Hint/tip** — `tipService.getArchiveTemplateType(title, category)` (`services/tipService.js:8-37`):
   a *different* set of `title.includes(...)` cases, then a category default.

These two matchers are **independent** and can disagree with each other *and* with the problem.

### 2.3 The silent mismatches (verified against the actual generator titles)

| Generated title (mathGenerator.js) | Lesson keyword hit? | Lesson actually served | Correct? |
|---|---|---|---|
| `Euler Totient of Prime Product` (3★) | none → fallback `level 30` | **Binomial Theorem** (milestone) | ❌ |
| `Combinatorial Subset Selection` (≤2★) | none → fallback `level 9` | generic combinatorics | ❌ |
| `Reverse Power Rule Integration` (≤2★) | none → fallback `level 9` | Power Rule of **Derivatives** | ❌ (integration ≠ differentiation) |
| `Telescoping Series Evaluation` | none → fallback `level 45` | **Limits at Infinity** | ❌ |
| `Convergent Geometric Series` | none → fallback `level 45` | **Limits at Infinity** | ❌ |
| `Matrix Determinant Calculation` (≤2★) | `"determinant"` needs `"3x3"` → miss → `level 9` | **One-Step Linear Equations** | ❌ |
| `The Boy-or-Girl Paradox` | none → fallback `level 45` | Probability Sample Space | ⚠️ loose |
| `Sum of the First Even Numbers` | none → fallback `level 9` | **Integer Multiplication** | ❌ |
| `Consecutive Integers Puzzle` (3★) | none → fallback `level 30` | **Binomial Theorem** | ❌ |
| `Wheat and Chessboard …` (4★) | none → fallback `level 45` | **Operator Precedence (PEMDAS)** | ❌ |
| `Doubling on a Single Square` (4★) | none → fallback `level 45` | **Operator Precedence (PEMDAS)** | ❌ |
| `Fermat's Little Theorem …` (≤2★) | `"fermat's last"` ≠ `"fermat's little"` → miss → `level 9` | arithmetic-band lesson | ❌ |

Roughly **half** of the generator's archive titles miss their keyword and inherit an unrelated
lesson. This is the user's "lessons in incorrect contexts," exactly.

### 2.4 Why it's invisible to the test suite

`test/lessonCoverage.test.js` and `test/advancedLessonCoverage.test.js` only exercise the
**concept-anchored** path (`getLessonAndExamples(category, level)`). **Nothing tests
`getLessonForArchive` title-matching coherence** — so the break shipped silently.

---

## 3. Secondary findings

### 3.1 Archive & Daily attach **no visualization** (MEDIUM)
`routes/archive.js` and `routes/dailyPuzzle.js` never call `Orchestrator.enrichProblem`, so they
never call `buildVisualSpecJson`. The mission wants every archive exercise to be able to generate a
visual *from its own concept node*. Today it generates none. (The standard `/problems` path does.)

### 3.2 `conceptFromType` substring matching can mis-route (LOW–MEDIUM)
`problemOrchestrator.conceptFromType()` (`problemOrchestrator.js:182-189`) returns the **first**
`TYPE_TO_CONCEPT` key that is a *substring* of the type. Because `linear_system` is inserted before
`linear_system_substitution/elimination/solution_types`, those three types resolve to
`linear_system` — so Socratic/self-explain/worked-example routing targets the parent concept, not
the specific one. Fix: prefer an exact match before substring.

### 3.3 Visual selection is regex-on-question, not concept-driven (LOW)
`visualEngine.js` chooses a manipulative by pattern-matching the **question string** (e.g.
`buildFractionBar` fires on any `\frac{n}{d}`). It is conservative (returns `null` when unsure) and
answer-safe, but it is *coincidental* coupling: a concept that should never show a fraction bar can
trigger one if its question happens to contain a fraction. Lower priority because the standard path
also passes the real `conceptId`, but the builders don't all gate on it.

### 3.4 Content DNA lacks pedagogical dimensions (LOW, enhancement)
The fingerprint captures *form* (concept/structure/context/answer) but not the mission's richer
**method / representation / Bloom-level / misconception-targeted** tags. These are valuable for the
diversity rotation ("don't show two 'apply the formula' recall items in a row") but are an
enhancement on a working base, not a defect.

### 3.5 Archive generator is a single 360-line `if/else` (MAINTAINABILITY)
`generateArchiveProblemInstance` is one giant branch tree. Adding the `conceptKey` tag is the moment
to make each branch declare its identity; a later pass can table-drive it.

---

## 4. Redesign — concept-anchored content resolution

**Principle:** *the generator is the single source of truth for a problem's concept identity; lesson,
hint, and visual are resolved from that identity — never re-guessed from the rendered title.*

This satisfies the mission's LESSON MAPPING (`Exercise Concepts ⊆ Lesson Concepts`), DAILY PUZZLE
MAPPING, and ARCHIVE MAPPING ("same concept node — no neighbors, no parents") directly.

### Phase 1 — Identity at the source (the keystone) ✅ this change
1. Every branch of `generateArchiveProblemInstance` tags its output with a stable `conceptKey`.
2. A single resolver, `archiveContent.resolveForConcept(conceptKey)`, returns the curated lesson +
   the tip template key + the visual concept for that key. The curated theorem lessons move from
   *title-keyed* to *conceptKey-keyed*; keys that map onto rich graph concepts (totient, integral,
   determinant, combinations, …) resolve to the rich 5-part lesson.
3. `routes/archive.js` and `routes/dailyPuzzle.js` resolve lesson/hint/visual via `conceptKey`.
   `tipService` prefers `problem.conceptKey`. Title-matching is retained **only** as the fallback for
   DB-seeded `archive_exercises` rows (which carry curated titles).
4. **Coherence test** (`test/archiveCoherence.test.js`): for every category×star, generate a batch
   and assert each problem has a `conceptKey`, resolves to a concept-matched lesson (never the
   generic fallback or a milestone mismatch), resolves to a concept-matched tip, and survives the
   answer-leak guard.

### Phase 2 — Visuals on every surface
Wire `buildVisualSpecJson(problem, graphConceptOf(conceptKey), profile)` into archive/daily through
the existing `sanitizeVisualJson` guard. Gate the `visualEngine` builders on `conceptId` so a visual
only ever attaches when the *concept* (not a stray substring) calls for it (fixes 3.3).

### Phase 3 — Content DNA enrichment (the rotation upgrade)
Add `method`, `representation`, and `bloom` tags to generated problems and feed them into
`scoreDiversity` as additional low-weight dimensions, so consecutive items rotate *cognitive demand*
and *representation*, not just numbers and wording.

### Phase 4 — Knowledge-graph consolidation
Promote `representations` / `visualModel` / `objectives` / `dependents` onto the graph node (derived
from `conceptLessons.js`) so "the node knows its visuals and representations" is literally true, and
`conceptFromType` exact-match-first (fixes 3.2).

---

## 5. Invariants this redesign must hold

- Server stays authoritative; no answer ever ships in a lesson/hint/visual (keep `lessonSafety`).
- The standard `/problems` path stays concept-anchored (it already is — don't regress it).
- `getLessonAndExamples(category, level)` contract is unchanged (locked by lesson-coverage tests).
- New coherence guarantee: **for any generated problem, `lessonConcept == hintConcept == problem
  concept`.** Enforced by `archiveCoherence.test.js`.
- `npm test` + `npm run lint` stay green.

---

## 6. Status

- [x] Audit complete (this document).
- [x] **Phase 1 — concept-anchored archive/daily resolution + coherence test (SHIPPED).**
  - Generator stamps every archive/daily problem with a canonical `conceptKey`
    (`mathGenerator.ARCHIVE_TITLE_TO_CONCEPT`, exact-title match).
  - `lessons.getLessonForConcept()` / `getLessonForArchiveProblem()` resolve the lesson from that key
    (rich graph lessons + reused curated theorem bodies + 5 newly-authored archive lessons:
    telescoping / geometric series / geometric progression / conditional probability / linear word).
  - `tipService` resolves the hint from the same key (`CONCEPT_KEY_TO_TIP`).
  - `routes/archive.js` + `routes/dailyPuzzle.js` use the conceptKey path; DB-seeded rows still fall
    back to the (now fallback-only) title matcher.
  - `test/archiveCoherence.test.js` locks: every generated problem has a conceptKey; lesson title
    matches the concept (never generic/mismatch); lesson survives the answer-leak guard; hint
    resolves to a concept tip. **1056 server tests + 0 lint.**
- [x] **§3.2 — `conceptFromType` exact-match-first (SHIPPED)** — parent keys no longer capture more
  specific types by substring.
- [x] **Phase 2 — concept-gated visual builders + daily-puzzle visuals (SHIPPED).**
  - `visualEngine.js`: builders now declare the concepts they serve; a **conservative concept gate**
    runs only the matching builder when the concept is a recognized visual concept (null/unknown keeps
    legacy try-all). Blocks the wrong-context visual (e.g. a stray `\frac` in a non-fraction problem
    grabbing a fraction bar). Locked by two new `visualEngine.test.js` cases.
  - `routes/dailyPuzzle.js`: attaches a concept-anchored, answer-stripped `interactiveVisualJson`
    built from the puzzle's own `conceptKey`; client `DailyPuzzle` DTO + `SoloGameScreen` render it via
    the existing `GameplayScreen` path. (Most advanced daily concepts yield none, by design; the ones
    that do — e.g. expected value — get a coherent manipulative.)
  - **Remaining in this area:** the Archive *play* screen receives its problem through navigation args
    (not a re-fetch), so rendering a visual there needs a nav-arg/holder change — deferred (low yield:
    only the dice/expected-value family among archive concepts has a manipulative).
- [x] **Phase 4 — knowledge-graph node consolidation (SHIPPED).** `knowledgeGraph.js` now exposes
  `getDependents()` / `getDescendants()` (reverse edges, built once from the forward prereq graph) and
  `describeConcept(id)` — the unified node view the mission asks for: prereqs + dependents +
  misconceptions + representations + `visualModel` (from `visualEngine.visualModelFor`) + learning
  objective (from `conceptLessons`). `visualEngine` gained `visualModelFor()`. Locked by
  `test/knowledgeGraph.test.js`, which also validates **graph integrity across all 150 nodes**
  (no dangling prereq edges, dependents are the exact inverse of prereqs, acyclic).
- [~] **Phase 3 — Content DNA pedagogical dimensions: ASSESSED & DEPRIORITIZED.** The diversity engine
  already rotates concept / structure / context / answer with recency weighting, which captures the
  achievable variety. Adding `method` / `representation` / `bloom` as new persisted diversity
  dimensions (a DB migration + per-concept tagging) would be **largely inert today**, because the
  generator emits only one representation per concept — the scorer would have nothing different to
  pick between. The higher-value future investment is *generating multiple representations per
  concept* (a content-authoring effort), after which these dimensions become meaningful. Recorded here
  rather than building machinery that can't yet change a selection.
