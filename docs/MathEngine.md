# Math & Learning Engine (`server/mathEngine/`)

The engine is Numera's brain: it generates problems, validates answers, models each learner,
adapts difficulty, schedules review, diagnoses misconceptions, and authors lessons. Modules
are small and mostly pure (deterministic where possible — see `test/symbolic.test.js`).

## Module map

| Module | Responsibility |
|---|---|
| `symbolic.js` | Number-theory & symbolic helpers (factorial, gcd/lcm, primes, divisors, Pythagorean triples, quadratics). Pure & unit-tested. |
| `templates.js` | Parameterized problem templates per concept/difficulty. |
| `distractors.js` | Plausible wrong answers (misconception-aligned, not random). |
| `validation.js` | `validateTemplate`, `solveSymbolically` — verifies a generated problem is well-formed and the stated answer is correct. |
| `knowledgeGraph.js` | Concepts, prerequisites, and misconception labels (the curriculum graph). |
| `learnerModel.js` | Per-user mastery / ability estimate, updated from outcomes. |
| `misconceptionEngine.js` | Detects *which* misconception a wrong answer implies. |
| `retentionEngine.js` | Spaced-repetition scheduling (when to resurface a concept). |
| `teachingEngine.js` | Chooses the next teaching action (new concept vs. reinforce vs. review). |
| `analyticsEngine.js` | Recommendations / insights from a learner's history. |
| `competitiveEngine.js` | Matchmaking pool + competitive profile signals. |
| `ratingEngine.js` | **NRS** (Numera Rating System): rating updates, velocity, tilt, smurf signals, seasons. |
| `adaptive.js` | Difficulty selection from mastery/Elo. |
| `problemOrchestrator.js` | `enrichProblem()` — ties generation + tips + lessons + visuals together. |
| `exerciseMemory.js` | **Anti-repetition keystone.** Fingerprints served problems (concept/structure/context/answer), scores candidate novelty against a per-user memory, and picks the freshest. See `docs/MathEngineRepetitionAudit.md`. |
| `lessonSafety.js` | Strips answer-leaking worked examples from lessons + answer keys from visual specs (a lesson must teach, not solve, the exercise in front of the learner). |
| `lessons.js` / `conceptLessons.js` | Lesson content (see "Lessons"). |
| `tips.js` | Per-concept hints with safety checks (don't leak the answer). |
| `visualEngine.js` | Builds declarative specs for interactive manipulatives (see below). |
| `explanationEngine.js` | Step-by-step worked explanations. |
| `socraticEngine.js` / `selfExplainEngine.js` / `workedExampleEngine.js` | **Formative-feedback trio**, each emitting a JSON-string payload attached to the problem (`socraticJson` / `selfExplainJson` / `workedExampleJson`). Socratic = misconception-targeted probe/hint on a WRONG answer; self-explanation = "why is that right?" reason-MCQ on a CORRECT answer; worked example = a faded step-by-step model of the method (on its OWN numbers, so it never leaks the live answer) offered on a WRONG answer. All pure, author-only coverage (`''` ⇒ client shows nothing), each guarded by a tripwire test. |
| `knowledgeIngestion.js` | Pipeline to ingest/seed curriculum data. |

`mathGenerator.js` is the **facade** the routes call (`generateProblem`,
`generateArchiveProblem`, `getLessonAndExamples`, `getLessonForArchive`).

## Concept-first lessons
`conceptLessons.js` holds rich, intuition-first lessons keyed by `conceptId` (matching
`knowledgeGraph.js`): `intuitionHook, whatItIs, whyItWorks, whenToUse, representations[],
commonMistakes[], connections[], examples[]`. `lessons.js#getLessonAndExamples` resolves a
rich lesson first and falls back to the legacy lesson for not-yet-covered topics; it returns
flat fields **plus** a `sections` object. The client renders sections in a fixed pedagogical
order. **To add a lesson:** add a `CONCEPT_LESSONS` entry (and extend `levelToConceptId` if
it's on a new level band) — no client change needed.

## Interactive discovery (manipulatives)
`visualEngine.buildVisualSpec(problem, conceptId, learnerProfile)` returns a declarative JSON
spec (balance scale, fraction bar, triangle, parabola, dice, number line) or `null`.
`decideComplexity()` gates by mastery (guided → explore → on-demand → none for experts).
`problemOrchestrator` attaches it as `interactiveVisualJson` (a JSON **string**, because the
client uses Gson and a heterogeneous nested params object would break the kotlinx
`@Serializable` codegen). The client renders it in a WebView canvas
(`assets/interactive_visuals.html`). **To add a visual type:** add a builder in
`visualEngine.js` + a module in the HTML renderer.

## Validation & correctness invariants
- A generated problem is only served if `validation.js` confirms the answer.
- LaTeX in JS string literals **must** use double backslashes (`"\\frac{\\pi}{6}"`). Single
  backslashes silently corrupt (`\f`→form-feed, `\p`→`p`); ESLint `no-useless-escape` catches
  these — keep the lint clean.

## Testing
`test/symbolic.test.js` locks the deterministic helpers. When changing generation/validation,
add cases there; the smoke tests confirm `/api/math/problems` still serves a valid payload.
