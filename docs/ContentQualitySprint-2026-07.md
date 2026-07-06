# Content Quality, Learning Science & Visualization Sprint — 2026-07

A full re-audit of the content layer (lessons, exercises, hints, explanations,
visualizations, adaptive pathways) on top of the June-2026 learning-science sprint,
followed by fixes for every top-ranked issue that could ship safely in one pass.
Baseline and after-numbers come from `scripts/contentGraphAudit.js` (extended by this
sprint — run it any time; it is the tripwire).

**Verification:** `npm test` 1,224/1,224 green (was 1,180 — 44 new tests), `npm run lint`
0 errors / 47 warnings (identical warning set to pre-sprint baseline).

---

## 1. What the audit found (ranked)

Ranking = educational impact × how many exercises it touches ÷ effort.

| # | Finding | Frequency | Status |
|---|---------|-----------|--------|
| 1 | **Hint ladder collapsed to one generic rung for 157 of 194 problem types (81%).** `tips.js` (37 authored entries) was never extended past the original curriculum; every strand added since (fractions, decimals, geometry, inequalities, functions, statistics…) fell back to "Re-read the question…". | Nearly every hint request outside legacy topics | **FIXED** |
| 2 | **Socratic wrong-answer probes were generic for 290 of 303 misconception ids (96%).** Authored templates cover 13 ids; every other classified misconception got the same "walk back through your steps" text — the misconception engine's diagnosis was thrown away at the last step. | Most wrong MCQ answers | **FIXED** |
| 3 | **Derived self-explain prompts were meta-gameable.** The June derivation layer used one fixed phrasing per distractor archetype across ~166 concepts; after a few prompts a learner can pick the correct option by recognising the template, not the math. Also: the derived path skipped the leak/control-char discipline of the authored path. | Every self-explain outside the 15 authored concepts | **FIXED** |
| 4 | **36 concepts had exactly one misconception** (incl. the whole foundational band: integers, decimals, fractions, core geometry, core stats). Misconceptions drive distractor tagging, socratic probes, self-explain distractors, and visual decoys — one per concept starves all four. | Foundational = highest-traffic band | **FIXED** |
| 5 | **The 25 thinnest concepts were the most foundational ones** (decimal_*, fraction_*, geo_*, stat_*, integer_*) — no authored self-explain or worked example exactly where novice traffic is highest; derived fallbacks are good but hand-authored is better here. | Highest-traffic concepts | **FIXED** (20 self-explain + 17 worked examples authored) |
| 6 | **Derived worked examples ended without a reason.** Steps re-shaped from lesson explanations carried empty `why` fields, so the predict-then-reveal arc ended on a bare value. | All derived worked examples | **FIXED** (final step now anchors to the concept principle) |
| 7 | **Socratic/lesson hint text could leak the live answer.** Lesson `fix` texts contain worked numbers (e.g. `$0.12$`); the socratic path had no leak guard (the tips/ladder/lesson paths already did). Pre-existing but became critical once lesson text started flowing into probes. | Rare but answer-revealing | **FIXED** (leak guard on probe+hint) |
| 8 | **Transfer coverage was 96/181 (53%).** 8 authored templates + derivation for concepts whose lesson example is applied+numeric. The `transfer` mastery dimension was unreachable for 85 concepts. | Half the catalog | **FIXED** (follow-up pass): `mathEngine/appliedExamples.js` authors an applied numeric context for all 85; `deriveActiveLearning.appliedExampleFor` consults it first. **Transfer now 181/181 (100%)** — held by `test/appliedExamples.test.js`. |
| 9 | **Visual model coverage was 81/181 (45%).** The 16 interactive models are excellent; the gap was concept mapping. | ~20 concepts that genuinely benefit | **PARTIALLY FIXED** (follow-up pass): three new number_line modes shipped cross-stack — `distance` (absolute_value), `compare` (decimal/integer ordering, predict-first), `inequality` (test-a-value + shade, for the 4 parseable inequality concepts). Server: `visualEngine.buildNumberLine` + `visualMetadata`; client: `interactive_visuals.html` number_line module + mode-aware heights in `InteractiveVisual.kt`. **Now 87/181 (48%)**; remaining unmapped concepts are mostly genuinely non-visual (symbolic manipulation, conversions). |
| 10 | `percentage` lesson is not a graph concept. | — | **Not a defect** — intentional legacy lesson for mental-math levels 1–4; codified as `EXPECTED_LEGACY_LESSONS` in `contentGraphAudit.js` so the tripwire reports clean. |

### What the audit confirmed is healthy (do not rebuild)

- Graph integrity: 0 dangling prereqs, 0 cycles, 1 root, sane depth (20).
- 100% lesson coverage (181/181), all lessons ≥3 representations, 0 without connections.
- Effective self-explain and worked-example coverage: **100%** via the June derivation
  layer (the old tripwire counted only hand-authored keys and understated this badly).
- Anti-repetition (exerciseMemory), lesson answer-leak guard (lessonSafety), idempotent
  rewards, server-authoritative grading — all in place and tested.
- All 77 generator distractor tags map to real misconception/pattern ids (verified by the
  new `taggedDistractors` audit section).

---

## 2. What shipped in this sprint

### Hint system (Phase 7) — `mathEngine/hintLadder.js`, `services/tipService.js`
When `tipsMap` has no entry for a problem type, the 4-rung ladder is now **derived from
the concept's authored lesson**: nudge (orientation) → concept (`oneLineSummary`) →
method (`formula` framed as a setup instruction, else `whyItWorks`) → guided
(`commonMistakes[0]` label + fix). Same re-shape-authored-content pattern as
`deriveActiveLearning.js`; every rung still passes the answer-leak filter; unknown types
keep the generic single nudge. The legacy single `tip` field now serves the derived
method/concept rung instead of boilerplate. **Result: 194/194 generated types at full
4-rung depth (audit `hintLadders.depthHistogram`).**

### Socratic feedback — `mathEngine/socraticEngine.js`
New `deriveSocratic`: a classified misconception without an authored template now gets a
probe that **names the actual slip** ("Your answer is exactly what you'd get if you
miscounted the decimal places…") and a hint reusing the lesson's authored `fix` for the
matching mistake (token-overlap label match, same concept only — no cross-concept
fuzzing). Added a leak guard on every probe/hint (derived AND authored).

### Self-explanation — `selfExplainEngine.js`, `deriveActiveLearning.js`
- 20 new hand-authored reason-sets for the thin foundational band (15 → 35 authored).
- Derived prompts now vary question stems and draw each distractor from a phrasing pool
  (deterministic per concept), and use up to two real misconceptions as wrong rationales.

### Worked examples — `workedExampleEngine.js`, `deriveActiveLearning.js`
- 17 new hand-authored examples (12 → 29 authored) for the same band.
- Derived examples now end on a `why` anchored to the concept's governing principle.

### Knowledge graph — `knowledgeGraph.js`
Second misconception (id + label + predictive rule where a clean one exists) authored for
all 36 single-misconception concepts. **0 concepts remain below two misconceptions.**
Rules follow the tripwire contract (`test/revivedDiagnosis.test.js`): predictive rules
must predict a real generator distractor; non-predictive slips use `() => NaN` so they
never misclassify (they still power distractor tagging, self-explain, and visual decoys).

### Audit tripwire — `scripts/contentGraphAudit.js`
Now also reports: effective (authored+derived) active-learning coverage, hint-ladder
depth histogram across every generated type (any type <3 rungs = regression), socratic
coverage, tagged-distractor↔graph id consistency, visual model coverage.

### Tests
+44 tests: derived-ladder depth + leak safety, derived socratic targeting + leak swap,
self-explain phrasing variance + misconception-sourced distractors, worked-example
final-why, and the existing suites re-validated against the expanded data tables.

---

## 3. Backlog (ranked, with recipes)

1. ~~**Transfer to 100%**~~ — **DONE** (see §1 item 8): `appliedExamples.js`, 85 authored
   applied contexts, coverage 181/181, tripwired by `test/appliedExamples.test.js`.
2. ~~**Number-line visual modes**~~ — **DONE** (see §1 item 9): distance / compare /
   inequality shipped cross-stack with behavioral verification of all three interaction
   flows (test-dots + wrong-shade rejection, predict-before-plot, measured distance).
   Recipe for FUTURE modes stands: server spec-builder mode + client renderer branch in
   `interactive_visuals.html` ship together, one mode at a time.
3. ~~**Author socratic templates for the top-frequency misconceptions**~~ — **DONE**
   (follow-up pass): 49 authored templates (was 17) covering the whole foundational band
   (fractions, decimals, integers, geometry, number sense, exponents, statistics,
   expressions — 52 misconception instances). Shared ids (`dropped_sign`,
   `forgot_double`, `forgot_divide`) use wording general enough for every concept that
   declares them. Once real `user_misconceptions` data accumulates, still author any
   high-frequency id that only has the derived probe.
4. ~~**Word-problem contexts**~~ — **DONE** (follow-up pass): 7 → 11 contexts
   (`average` sports stats, `proportion` cooking scale-up with the additive-strategy
   distractor, `rate_time` travel planning, `multi_step` savings goal).
5. ~~**Estimation coverage**~~ — **DONE** (follow-up pass): added `estimate_area`
   (decimal side-lengths) and `estimate_conversion` (m→km, cm→m, g→kg, min→h) kinds;
   the closest-option invariant holds for both.

## 3b. Applied modes brought into the hint system (final pass)

The three applied-mode endpoints (`/api/math/word-problems`, `/estimation`,
`/error-detection`) served **bare problems with no hints at all** — no ladder, no tip, no
self-explain, no worked example — while the main problem route carried all four. Fixed:
generators now carry `templateType` (word-problem skills map to their knowledge-graph
concepts via `SKILL_CONCEPT`; estimation uses the authored legacy `estimation` tip;
spot-the-mistake reuses its `conceptId`), and `enrichAppliedProblem` in `routes/math.js`
attaches the ladder + tip + self-explanation + worked example. Exception by design:
spot-the-mistake never gets `workedExampleJson` — the flawed working IS that concept's
worked example, so the clean version would reveal the broken line. All three families are
now also run through the content quality gate on every `npm test`, including a
no-repeats-in-a-set variety check.

Same sweep, two more surfaces: the **checkpoint exam** was stripping the generator's
active-learning fields down to six keys (no ladder, no socratic/self-explain/worked
example) — it now keeps them and attaches the tip/ladder; **transfer challenges** served
bare and now carry the concept's hint ladder (guidance-on-request never solves the
problem, and the independence mastery dimension already accounts for hint usage).
The **mistakes bank** (the remediation surface, where hints matter most) also served
regenerated problems bare — it now carries the full surface. Intentionally hint-free and
staying that way: competitive modes (duels, puzzle rush) and the **placement test**
(`assessment.js` — a diagnostic must measure unaided ability). Regression assertions live
in `test/checkpointExam.test.js` and `test/smoke.test.js`.

**Hint-system coverage map after this sprint** — every problem-serving surface audited:
main solo route ✓, daily puzzle ✓, archive ✓, word problems ✓, estimation ✓,
spot-the-mistake ✓ (ladder only, by design), checkpoint exam ✓, transfer ✓, mistakes
bank ✓; duels / puzzle rush / placement intentionally unaided.

## 4. Quality gates going forward (Phase 12)

Before merging new content, run `node scripts/contentGraphAudit.js` and hold these lines:
- `hintLadders.shallowTypes` stays **empty** (every generated type has a real ladder).
- `coverageStats.withOneMisconception` stays **0**; `withZeroMisconceptions` stays 0.
- `taggedDistractors.unmappedTaggedIds` stays **empty**.
- `graphIntegrity` stays at 0 dangling / 0 cycles.
- `effectiveCoverage.selfExplain/workedExample` stay **100%**; `transfer` only goes up.
- New self-explain entries: no option contains the numeric answer; options comparable
  length. New worked examples: 3–5 steps, final `math` states the example's own answer,
  double-backslash LaTeX (single `\f`/`\p` is the classic silent corruption bug —
  `hasControlChar` guards it, and the test suites scan every table).
