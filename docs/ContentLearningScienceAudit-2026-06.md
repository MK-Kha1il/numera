# Content Quality & Learning-Science Audit — June 2026

> Scope: lessons, exercises, visualisations, hints, adaptive learning, daily puzzles,
> archive, mistake bank, competitive content, and the learning-science engines behind them.
> Every number below is **computed**, not estimated, by `server/scripts/contentGraphAudit.js`
> (introspects the live engines). Re-run it any time to refresh the figures.

## TL;DR — the one thing to understand

**The intelligence is built and the lessons are world-class. The active-learning content
those engines depend on is concentrated in the first ~8–15 foundational concepts and was
never scaled to the other ~145.** The adaptive/mastery engine is running on a near-empty
tank for ~90% of the catalog.

This is the opposite of the usual "thin engine, lots of content" problem. Numera has a
deep engine starved of the per-concept *active-learning artifacts* (transfer items,
self-explanation prompts, worked examples, ≥2 competing misconceptions) that make the
engine's intelligence visible to the learner.

So the highest-value sprint is **not** "make more content." It is: **scale the three
highest-effect-size active-learning layers across the catalog, deepen misconception
diagnosis where it's shallow, and add the two genuinely-missing capabilities (curiosity
and exercise-type variety).**

---

## 1. What already exists — and is excellent (do NOT rebuild)

| System | State | Evidence |
|---|---|---|
| **Knowledge graph (DAG)** | 161 concepts, prereqs + executable misconception-diagnosis rules per node, 100% Common-Core tagged | `knowledgeGraph.js`; integrity below |
| **Graph integrity** | **0 cycles, 0 dangling prereq edges**, 1 root, 70 leaves, max prereq-chain depth 20 | computed |
| **Concept lessons** | 160/161 rich 5-part lessons (intuition → why → multi-representation → mistakes → connections) | `conceptLessons.js` (4.9k lines) |
| **Representation richness** | **159/161 lessons carry ≥3 representations; 0 carry <2** | computed |
| **Misconception engine** | per-concept diagnosis rules + global patterns + severity + remediation tips | `misconceptionEngine.js`, graph rules |
| **Multi-dimensional mastery** | accuracy / fluency / retention / independence / **transfer** | `masteryEngine.js` |
| **Anti-repetition** | fingerprint + structural-diversity memory, with a self-audit that flags low-variety slots | `exerciseMemory.js`, `contentAudit.js` |
| **Engine suite** | retention/SRS, remediation, self-explain, worked-example, visual-spec, teaching-style adaptation, orchestrator | `mathEngine/*` |
| **Self-audit telemetry** | turns live usage into a weak/repetitive content health report | `contentAudit.js` |

**Verdict:** the conceptual-understanding architecture (graph + 5-part lessons + diagnosis)
is at or above Brilliant/Math Academy on *design*. The deficit is *coverage of the
active-recall layers*, not architecture.

---

## 2. The real gaps (empirical, ranked by leverage)

| # | Gap | Coverage | Why it matters |
|---|---|---|---|
| **1** | **Transfer items** | **8 / 161 (5%)** | Transfer is a *core mastery dimension earned only out-of-context*. 95% of concepts can **never** generate a transfer item, so 95% of the catalog can never earn transfer mastery. The mastery model is structurally starved. |
| **2** | **Self-explanation prompts** | **15 / 161 (9%)** | "Why is that right?" reason-MCQ after a correct answer — the single highest-effect-size pedagogy in the codebase — covers 9% of concepts. |
| **3** | **Worked examples** | **12 / 161 (7%)** | The faded worked-example scaffold shown on a *wrong* answer (the strongest remediation move) exists for 7% of concepts. |
| **4** | **Dead misconception rules (systemic)** | **~135 rules are `(ans) => ans` placeholders** | *Bigger than it looked.* 48 concepts have only one misconception, but the deeper defect is that ~135 misconception rules across the catalog return the **correct** answer — so they can never match a wrong answer and never diagnose anything. Persisted diagnosis then silently falls through to 5 generic global heuristics. Compounding it: the generated problem **does not echo its `params`**, so even the *non-dead* param-aware rules are blind at telemetry time (they still work for the real-time socratic probe, which gets params at generation). The mission's "diagnose, don't detect" goal is unmet for the *majority* of the catalog. **Remediation (staged):** (a) revive core foundational concepts with distinct param-aware second misconceptions [DONE this sprint, 9 concepts + tripwire]; (b) echo `params` on the generated problem so the client can return them, reviving every param-aware rule for persisted diagnosis; (c) replace the remaining identity placeholders, which requires per-template param mapping. |
| **5** | **No curiosity / surprise layer** | **0** | Mission explicitly wants surprising patterns, elegant shortcuts, counterintuitive results, aha-moments. No system produces these. This is the biggest *engagement/memorability* lever and it's empty. |
| **6** | **Exercise-type monoculture** | answer interaction ≈ all MCQ | Modes exist (estimation, word-problems, checkpoint, transfer, mistakes) but the *answer format* is overwhelmingly multiple-choice. Missing as formats: **error-detection, matching, sequencing, construction, comparison, prediction.** Manipulatives exist for *display*, not for *answering*. |
| **7** | **One concept has no lesson** | `binomial` (0 representations) | The single hole in otherwise-100% lesson coverage. |
| 8 | Representation-`kind` vocabulary drift | ~120 bespoke `kind` values | Lesson `kind` was specced as a 6-value enum (`number_line\|area_model\|real_world\|symbolic\|balance\|grid`); lessons now use ~120 one-off kinds. Rich, but the client can't key icons/rotation off an open vocabulary. |

### Representation-mix (computed, across all lessons)
Dominant kinds: `symbolic` 50, `real_world` 41, `number_line` 24, `graphical` 13,
`area_model` 12, `grid` 12, `story` 11, `area` 9 — then a long tail of ~110 single-use
bespoke kinds. **Reading:** lessons are representation-*rich*, but the symbolic/verbal
forms dominate; *geometric/graphical/manipulable* forms thin out in the upper catalog.

---

## 3. The 10 requested deliverables (grounded)

> Note on "Top 100": the system is mature enough that an honest enumeration of *distinct*
> structural weaknesses is far shorter than 100. Padding to an arbitrary 100 would violate
> this project's own quality filter ("reject low-value, trivial content"). Below are the
> real, ranked findings — each expands into many per-concept work items.

**1. Top content weaknesses** → §2 #1–#8, in rank order. The dominant weakness is a *coverage
cliff*: transfer/self-explain/worked drop from ~100% (foundational concepts) to ~0% above them.

**2. Top content opportunities** → (a) generalize transfer/self-explain/worked from the
graph's existing misconception rules + template params so coverage scales without 150
hand-authored templates; (b) a curiosity layer keyed to concepts; (c) 5 new answer-interaction
types reusing existing problem data; (d) auto-add a 2nd misconception to the 48 thin concepts.

**3. Missing concept representations** → upper-catalog concepts (calculus, combinatorics,
matrices, number theory) lean symbolic; they need geometric/graphical/manipulable forms.
`binomial` needs a lesson outright.

**4. Missing exercise types** → error-detection, matching, sequencing, construction,
comparison, prediction (none exist as answer formats).

**5. Weak lessons** → only structural weakness is `binomial` (none) + the upper-catalog
representation skew; the authored lessons themselves are strong.

**6. Weak visualisations** → `visualEngine` builders cover a handful of concepts; most
concepts render the lesson's text representations only, no interactive manipulative.

**7. Weak adaptive systems** → none architecturally; the weakness is *input starvation* —
mastery's transfer dimension and the diagnosis engine lack content for ~90% / ~30% of concepts.

**8. Repetition sources** → low structural variety in single-template concepts (the self-audit
already flags these from live exposure data); the long-tail concepts have one generator shape.

**9. Transfer opportunities** → all 153 concepts currently *without* a transfer framing,
prioritized by how foundational/high-traffic they are.

**10. High-impact improvements** → ranked table in §4.

---

## 4. Ranked roadmap (educational value × leverage ÷ effort)

| Rank | Move | Edu value | Retention | Engagement | Effort | Notes |
|---|---|---|---|---|---|---|
| 1 | **Scale transfer 8→catalog** via a graph-derived transfer generator | ★★★★★ | ★★★★★ | ★★★ | M | Unblocks transfer mastery for 90% of catalog |
| 2 | **Add 2nd misconception** to the 48 thin concepts | ★★★★★ | ★★★★ | ★★ | M | Makes "diagnose not detect" real |
| 3 | **Curiosity layer** (per-concept aha/shortcut/surprise) | ★★★★ | ★★★★★ | ★★★★★ | M | The empty engagement lever |
| 4 | **Scale self-explain 15→catalog** | ★★★★★ | ★★★★ | ★★ | M | Highest effect-size pedagogy |
| 5 | **New exercise types** (error-detection, matching, sequencing first) | ★★★★ | ★★★ | ★★★★ | M–L | Breaks MCQ monoculture |
| 6 | **Scale worked-examples 12→catalog** | ★★★★ | ★★★ | ★★ | M | Wrong-answer scaffold |
| 7 | `binomial` lesson + upper-catalog geometric representations | ★★★ | ★★ | ★★ | S | Closes the one lesson hole |
| 8 | Normalize representation `kind` vocabulary | ★★ | ★ | ★ | S | Content hygiene; enables icon/rotation logic |

**Sequencing rationale:** #1, #2, #4, #6 are all the *same shape* — derive per-concept
active-learning artifacts from data the graph already holds (misconception rules + template
params), so they share infrastructure and quality-gates. Build that derivation layer once,
apply it four times. #3 and #5 are net-new but high-engagement.

---

## 5. Standing tooling

- `server/scripts/contentGraphAudit.js` — the introspection script behind every number here.
  Keep it as a **living coverage tripwire**: re-run after content work to watch the 5%/9%/7%
  transfer/self-explain/worked numbers climb. Candidate for a CI gate ("coverage must not
  regress").
- `mathEngine/contentAudit.js` — the *dynamic* (telemetry-driven) complement: flags weak &
  repetitive content from real usage once there are users.

---

## 6. What shipped this sprint (2026-06-24)

All four high-leverage builds from §4 were executed. Server: 963 tests green, 0 lint errors.
Android: `assembleDebug` + Robolectric `testDebugUnitTest` green.

| Build | What | Effect |
|---|---|---|
| **1. Graph-derived active-learning layer** (`deriveActiveLearning.js`) | Derives transfer / self-explanation / worked-example items per concept from authored lesson fields (no fabricated prose); wired as a fallback into the three engines | **self-explain 9%→99%**, **worked examples 7%→99%**, **transfer 5%→53%** (8→86 concepts). No client change — rides existing problem fields. |
| **2. Misconception diagnosis revival** | Genuine, distinct, **param-aware** 2nd misconceptions for 9 core foundational concepts + `misconceptionDepth.test.js` tripwire; documented the systemic ~135-dead-rule finding (§2 #4) | Socratic real-time diagnosis can now triangulate "misconception vs. slip" on core concepts; regression-locked. |
| **3. Curiosity layer** (`curiosityEngine.js`) | 23 authored sparks (pattern / shortcut / counterintuitive / wonder), attached to lessons as the "✨ surprising bit" (`LessonScreen.kt`) + reusable `getRandomCuriosity()` | The previously-empty engagement/memorability lever now exists. |
| **4. New exercise type: "Spot the Mistake"** (`errorDetection.js`) | Corrupts one line of a worked solution into a checkable false equation; a distinct verify-don't-generate skill, served via the existing MCQ gameplay + a command-palette entry | First non-"just solve it" exercise type; reuses Builds 1+2; 21 concepts. |

**Follow-up shipped (2026-06-24):** the generated problem now echoes a **client-safe `params` bag**
(`mathGenerator.clientSafeParams` → `MathProblem.params` → `TelemetryRequest.params` → the classifier),
so **param-aware misconception rules now fire for *persisted* diagnosis**, not just the real-time
socratic probe. Proven by `test/paramsEcho.test.js`: with params, a `linear_one_step` wrong answer
is diagnosed `concept_specific` (incl. the Build-2 `reversed_subtraction`); without params it is
`unclassified`. The bag is numeric-only and never contains the answer.

**Remaining standing follow-ups:** replace the remaining ~126 identity misconception rules (each now
*can* be made to fire, since params reach the classifier — it's per-template authoring work); pass
`params` from the server-side duel/puzzle-rush flows into `feedEngineOutcome` too; extend curiosity
coverage; add the other new exercise types (matching, sequencing, construction).
