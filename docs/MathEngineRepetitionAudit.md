# Math Engine Repetition Audit & Anti-Repetition Overhaul

**Date:** 2026-06-04 (updated 2026-06-05) · **Status:** Phase 1 audit complete; the
substantive engine work for **Phases 1–15 is shipped, wired, and tested** (98 tests pass,
0 lint errors). Only the long-tail of bare-drill template expansion remains (§4). This
document is canonical for the "every level feels repeated" investigation.

---

## 1. Root-cause analysis (Phase 1)

Every generation path was traced. Repetition came from **structural** causes, not bad luck —
the engine had no concept of "what has this learner already seen", so it could only vary
numbers, never structure, context, or framing.

| ID | Source | Where | Type of duplication | Severity |
|----|--------|-------|---------------------|----------|
| **R1** | **One template function per `(category, level)`.** Every visit to a level re-runs the same function; only the random numbers change. Most levels had 1–3 hardcoded `formulations`. | `mathEngine/templates.js` | Template / structural | High |
| **R2** | **Archive = 18 hardcoded problems** (6 categories × 3 star tiers). Same title/story/structure every call. Several have **constant answers**: Basel `π²/6`, Monty Hall `2/3`, Gauss `5050`, chessboard `255`, die EV `3.5`, Fermat archive `1`. | `mathGenerator.js` `generateArchiveProblemInstance` | Exact / context / lesson | **Critical** |
| **R3** | **Daily puzzle cycled those 18 rows** by `dayIndex % pool`. Tiny pool, identical for all users, repeats on a fixed calendar cycle. | `routes/dailyPuzzle.js` | Exact / context | **Critical** |
| **R4** | **No exposure memory.** No table tracked served content anywhere, so de-duplication was impossible in principle. | (schema gap) | (enables all others) | **Critical — keystone** |
| **R5** | **Lessons leak answers.** Archive lessons contain worked examples mirroring the exercise (the CRT lesson solves `x≡1 mod 3, x≡2 mod 5 → 7`; the CRT exercise *is* that system). | `mathEngine/lessons.js` `getLessonForArchive` | Lesson / answer leak | High |
| **R6** | **Ingested templates chosen by `idx % length`** — deterministic, not novelty-aware; 50% coin-flip vs. static. | `mathGenerator.js` | Pattern | Medium |
| **R7** | **Concept selection has no diversity signal.** The orchestrator is otherwise good (mastery/misconception/retention-driven, *not* XP/level), but nothing stops it re-serving the same concept in the same form repeatedly. | `mathEngine/problemOrchestrator.js` | Concept / pattern | Medium |
| **R8** | **Visuals could embed the answer.** Visual specs are free-form JSON; nothing prevented an `answer`/`solution` key reaching the client. | `mathEngine/visualEngine.js` | Visual answer leak | Medium |

**Positive finding:** The personalization layer the mission asks for in Phase 6 is *already
substantially built* — `problemOrchestrator.selectNextConcept` drives off mastery
probability, misconceptions, retention/overdue reviews, prerequisite gaps and learning
style, not level/XP/rank. The gap was diversity/freshness, not the difficulty model.

---

## 2. What was built this pass (keystone)

The keystone is **R4**: without memory, nothing else can stop repetition. Built and wired
end-to-end, tested (`npm test` → 77 pass), lint clean (0 errors).

### 2.1 Exercise Memory System — `mathEngine/exerciseMemory.js` (Phases 2, 3, 14)
Fingerprints every served problem along **orthogonal dimensions** so near-duplicates collide,
not just exact ones:

- `conceptSig` — concept/template family
- `structureSig` — the question skeleton with **all numbers blanked to `#`** (catches template duplicates: `3x+7=19` and `5x+2=42` map to the same skeleton)
- `contextSig` — non-numeric "story words" (catches reused framings)
- `answerSig` — normalized answer per concept (catches fixed-answer reuse like always-`1`)
- `signature` — `concept + structure`, the primary near-duplicate key

`scoreDiversity()` returns a **recency-weighted novelty score in [0,1]** across those
dimensions (weights: signature .45 / structure .25 / context .15 / answer .05 / concept .10).
A repeat from 2 problems ago is punished far harder than one from 40 ago. Concept repetition
saturates (a learner *does* drill one concept — only monotony is penalized).

`pickFreshExercise()` generates several candidates, scores each against (a) the learner's
persisted memory and (b) what was already chosen earlier in the same page, and keeps the
freshest above threshold — so **low-diversity content is regenerated, not served.**

### 2.2 Persistence — migration v10 `exercise_exposure`
One row per `(user_id, signature)` with `seen_count` + `last_seen` for recency weighting,
bounded by `pruneExposures()`. Recorded automatically inside `pickFreshExercise`.

### 2.3 Lesson & visual answer-leak guard — `mathEngine/lessonSafety.js` (Phases 8, 9, 10, 12)
- `sanitizeLesson(lesson, problems)` drops any worked example whose **answer matches** the
  served exercise, or whose **question shares the exercise's structural skeleton** (a
  restatement). Returns a clean clone + a leak report; untouched lessons pass by reference.
- `sanitizeVisualSpec` / `sanitizeVisualJson` strip any `answer`/`solution`/`correctAnswer`
  key from a visual spec at any depth (visuals reveal *structure*, never the answer).

### 2.4 Wiring into live paths
- **`routes/math.js` `/api/math/problems`** — each problem slot now goes through
  `pickFreshExercise`; lessons are sanitized against the served answers; visuals sanitized;
  a `diversityScore` is attached per problem; memory pruned after.
- **`routes/dailyPuzzle.js`** — replaced the fixed 18-row cycle with a **deterministic
  daily concept rotation** (`themeForDay`: category rotates daily, difficulty cycles weekly)
  whose concrete variant is then **freshened per learner** and lesson-sanitized (Phase 8).
- **`routes/archive.js`** — the procedurally generated supplement is now de-duplicated within
  the page and against the learner's recent memory, and every row's lesson is sanitized.

### 2.5 Template representation expansion — `mathEngine/templates.js` (Phases 4, 5, 7)
The diversity engine can only spread variety the generator can *produce*. Exemplar concept
families were expanded to **multiple representations of one concept** (the documented pattern
to extend to the rest):
Each gets 4 representations (idx-rotated; the underlying numbers/answer are held constant so
correctness is guaranteed). Shipped slots:
**16 slots** now have 4 representations each:
- **Division (L8):** symbolic / equal-sharing / grouping / rate (speed)
- **Order of operations (L9):** symbolic / shopping total / error-detection / reordered
- **Two-step linear (L13):** symbolic / word / reverse-reasoning / error-detection
- **Variable-both-sides (L14):** symbolic / two-plan comparison / balance / error-detection
- **Linear system (L16):** symbolic / sum-and-difference / ages / coins
- **Determinant (L18):** notation / transformation scaling / system-uniqueness / cross-product
- **Advanced pigeonhole (L22):** cards / gloves / coupons / keys
- **Combinations (L25):** binomial notation / committee / handshake / network-cabling
- **Sample space 2ⁿ (L27):** coins / binary strings / yes-no survey / on-off switches
- **Circular permutations (L28):** round table / bracelet / turn-cycle / charm ring
- **Polynomial derivative (L32):** derivative / velocity / tangent slope / marginal cost
- **GCD (L41):** symbolic / gift boxes / square tiling / blinking lights
- **Modular addition (L43):** symbolic / clock / wrapping counter / cyclic position
- **Percentages (mental L2):** symbolic / discount / population / grid-area
- **Average (mental L8):** abstract / test scores / temperatures / heights
- **Archive Gauss tier:** parameterized upper bound + a second framing (no longer always `5050`)

Verified: each formerly-single-structure slot now emits 4 distinct skeletons over 12 calls, 0 malformed,
and the correct answer is always among the options.

### 2.6 Concept-selection diversity — `problemOrchestrator.selectNextConcept` (Phases 6, 7)
The orchestrator now reads per-concept exposure recency (`getConceptRecency` →
canonicalized to knowledge-graph conceptIds) and uses `leastRecentlySeen` to **break ties
between concepts that are equally valid to teach next**. Applied at the three genuine choice
points — mastery-building (among concepts within 0.08 of the weakest), exploration (among all
prereq-ready concepts, instead of always the first in graph order), and challenge (rotate the
"victory lap" among strong concepts). Pedagogical priority is never overridden — diversity
only decides between otherwise-equivalent options.

### 2.7 Archive pure-constant elimination — `mathGenerator.js` (Phases 2, 4, 5)
The six archive slots that emitted a **byte-identical problem every time** (the diversity
engine cannot help these — every candidate is the same) were parameterized / rotated:
| Slot | Was (constant) | Now |
|------|----------------|-----|
| Calculus ★★★★ | Basel `π²/6` | Basel / telescoping `1` / geometric `2` |
| Mental ★★ | die EV `3.5` | n-sided die `(n+1)/2` / two-dice sum `7` |
| Mental ★★★ | Bayes `8.3%` | prevalence-parameterized posterior |
| Mental ★★★★ | Monty Hall `2/3` | Monty switch / Monty stay / boy-or-girl |
| Arithmetic ★★★ | Diophantus `84` | Diophantus / consecutive-integers |
| Arithmetic ★★★★ | chessboard `255` | total first-k squares / single-square grains |
Verified: each formerly-constant slot now yields multiple distinct answers/structures over 30 calls, 0 malformed.

### 2.8 Multi-stage hint ladder — `mathEngine/hintLadder.js` (Phase 11)
Replaces the single-shot tip with an **escalating ladder** so a learner asks for exactly as
much help as they need: **nudge → concept → method → guided**, built from each concept's
`tipsMap` fields (subskill / conceptualReminder / tip / commonMistakes). The full worked
**solution is never a rung** — it stays in `problem.explanation`, revealed only on explicit
request. Every rung passes an answer-leak guard (`leaksAnswer`, word-boundary-aware for
single-char answers); leaking rungs are dropped and the ladder re-numbered. Attached to every
served problem via `tipService.attachTipToProblem`, so gameplay, archive and daily puzzle all
get it. `problem.tip` is retained (= the "method" rung) for backward compatibility.

### 2.9 Misconception-targeted remediation generation — `mathEngine/remediationEngine.js` (Phase 13)
The misconception engine already classified *why* an answer was wrong and the orchestrator
already routed a critical misconception to priority 1 — but the served problem was just an
ordinary one of that concept. Now, when the round is `misconception_remediation`, the route
calls `applyRemediation`, which:
1. **Reconstructs the learner's own wrong answer** for this specific problem via the
   knowledge-graph concept rule (e.g. quadratic `sign_flip_roots` → `-ans`) or a global
   predictor (`sign_error`/`off_by_one`/`forgot_negative`), gracefully yielding nothing when
   params aren't reconstructable;
2. **Forces that tempting wrong answer into the options**, so the learner must consciously
   reject their own mistake instead of never meeting it (options stay 4, distinct, correct preserved);
3. Attaches a `remediation` focus + a preventive `watchFor` line and **prepends a remediation
   rung to the hint ladder**. No artifact reveals the correct answer (the surfaced value is a
   *wrong* option; coaching is about the error).

### 2.10 Self-auditing engine — `mathEngine/contentAudit.js` (Phase 15)
Turns the telemetry the app already collects into an actionable health report so weak and
repetitive content surfaces automatically. `runSelfAudit(db)` fuses three signals:
- **Weak content** — `problem_pedagogical_feedback` + `lesson_analytics` flagged for low
  success / high frustration / high abandonment / high hint dependence / slow completion,
  merged per template with a severity.
- **Repetitive content** — aggregates the `exercise_exposure` memory per concept into
  *distinct structures vs. total exposures*; concepts served a lot but drawing from few
  structures are flagged `add_more_representations`. **This closes the loop**: it points
  directly at the slots whose generator still needs more representations (the §4 backlog).
- **Summary** — counts + the single top recommendation.

Exposed at `GET /api/engine/content-audit` (admin-gated via `requireAdmin`).

---

## 3. Test & verification status
- `server/test/exerciseMemory.test.js` (8) + `server/test/lessonSafety.test.js` (5 incl. sub-asserts) — pure-logic locks.
- Existing smoke tests still green for `/api/math/problems`, `/api/archive/search`
  (distinct-titles), `/api/math/daily-puzzle`. **77/77 pass.**
- `npm run lint` → 0 errors (45 pre-existing warnings, none in new modules).

---

## 4. Remaining work (honest backlog — Phase 16)

The keystone is in; the following are scoped but **not yet done**. None are blocked.

| Phase | Item | Status | Note |
|-------|------|--------|------|
| 4/5/7 | Expand the **remaining single-structure standard template slots** to multiple representations | Mostly done | **16 standard slots** across every category band now have 4 representations + all **6 pure-constant archive slots** (§2.7). The only slots left are pure mechanical drill (carry/borrow add-sub L5/L6, multiplication L7, squares/cubes mental L5/L6, modular mult/exp L44–46) — intentionally left as number-varied, since a word-problem dressing there is forced and adds little. The content-audit endpoint (§2.10) will flag any that actually read as repetitive in real usage. |
| 6/7 | Make `selectNextConcept` **diversity-aware** | **Done** | §2.6 — concept-recency tie-breaking at the mastery/exploration/challenge choice points. |
| 11 | **Multi-stage hint ladder** (nudge → concept → method → guided → solution) | **Done** | §2.8 — `hintLadder.js`, attached to every problem; solution kept separate; answer-leak-guarded. |
| 13 | **Misconception-typed remediation generation** | **Done** | §2.9 — `remediationEngine.js` reconstructs the learner's own wrong answer, forces it into the options, and leads the hint ladder with targeted coaching. |
| 15 | **Self-auditing engine** | **Done** | §2.10 — `contentAudit.js` fuses pedagogical/lesson telemetry + the exposure memory into a weak+repetitive content report at `GET /api/engine/content-audit` (admin). |
| 10 | Audit each `visualEngine` builder so the *manipulative itself* requires interaction to reveal the answer | Not started | Guard now strips explicit answer keys; the renderers should still be reviewed for visual give-aways. |

### Known limitations of the shipped slice
- **Daily puzzle within-day stability:** the puzzle now regenerates per fetch (numbers may
  differ on refresh) because `generateArchiveProblem` uses unseeded `Math.random`. The
  *concept* is stable per day; concrete content is not pinned. If pinning is desired, persist
  the day's chosen variant or add a seeded RNG.
- **Diversity ceiling = generator variety.** For slots still emitting a single structure, all
  candidates are identical and the engine can only vary numbers — hence the template-expansion
  backlog above is what unlocks the engine's full value.
- Memory is per-user and bounded (~400 rows); very long-lived accounts recycle the oldest
  exposures, which is intended.
