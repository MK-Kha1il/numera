# Math / learning engine

`server/mathEngine/` is the learning-intelligence core: it generates problems, grades them,
adapts difficulty, drives lessons, and models the learner. Pure-ish modules orchestrated by
`mathGenerator.js` (the facade) and `problemOrchestrator.js`. Depth: [docs/MathEngine.md](../docs/MathEngine.md),
[docs/MathEngineRepetitionAudit.md](../docs/MathEngineRepetitionAudit.md).

## Module map (by job)

| Job | Modules |
|---|---|
| **Generate a problem** | `mathGenerator.js` (facade) → `templates.js` (problem templates, large data), `distractors.js` (wrong options), `validation.js`, `generation*` helpers |
| **Decide what to serve** | `problemOrchestrator.js` (the conductor), `adaptive.js`, `arenaDifficulty.js` (lib), difficulty by mastery/Elo |
| **Content catalog** | `conceptLessons.js` (**552KB** of rich 5-part lessons — DATA), `lessons.js`, `knowledgeGraph.js` (concept prereqs), `knowledgeIngestion.js` + `rawIngestionData.json` |
| **Teach & remediate** | `explanationEngine.js`, `tips.js`, `hintLadder.js`, `socraticEngine.js`, `selfExplainEngine.js`, `workedExampleEngine.js`, `remediationEngine.js`, `teachingEngine.js` |
| **Model the learner** | `learnerModel.js`, `masteryEngine.js` (accuracy/fluency/retention/independence dims), `retentionEngine.js`, `misconceptionEngine.js`, `analyticsEngine.js` |
| **Variety & anti-repeat** | `exerciseMemory.js` (fingerprint+diversity), `lessonSafety.js` (answer-leak guard), `estimation.js`, `wordProblems.js`, `transferEngine.js` |
| **Equivalence / CAS** | `answerEquivalence.js` (rationals/decimals/percents/algebra-by-probing), `symbolic.js`, `cas/` |
| **Visual manipulatives** | `visualEngine.js` → `interactiveVisualJson` spec rendered as a WebView canvas |
| **Rating (competitive)** | `ratingEngine.js` — see [`competitive-system.md`](competitive-system.md) |

## The core loop (solve a problem)

1. Client opens a level → `GET /api/math/problems?level=N` (`routes/math.js`).
2. Server generates via `mathGenerator` → `mathEngine`, enriches each with a tip, a concept
   lesson (`lessonSections`), and optionally an `interactiveVisualJson`. **The answer is stripped
   from the payload** for competitive modes (server-authoritative grading).
3. Client renders lesson → problem → options/manipulative.
4. Per-answer the client fires telemetry (`/api/math/telemetry` → `services/engineFeed.js`,
   feeding mastery/retention/misconceptions). On completion: `POST /api/math/complete` with an
   `Idempotency-Key`.
5. Server computes XP/coins/mastery/quests/streak/league/achievements; saves wrong answers to
   `user_mistakes` + schedules `srs_reviews`. All server-side.
6. Client shows the recap from the server response.

## Working in here — rules

- **`conceptLessons.js` / `templates.js` are data, not logic.** To change a concept, edit its
  record; don't restructure the file. They're large by nature (151 concepts × rich content).
- **LaTeX needs double backslashes in JS strings** (`"\\frac"`, `"\\pi"`). A single `\f`/`\p` is
  a silent control-char bug — there's a whole class of these that were hunted out of seed data.
- **Adding a strand/concept** is a multi-file pattern (catalog + knowledge graph + migration +
  client). There's a `strandCoherence.test.js` tripwire; respect the "when adding a strand"
  checklist in the repetition audit doc.
- **`engineFeed.js` is the one shared "a learner answered" recorder** — every mode (solo, puzzle
  rush, all duel types) feeds it. Don't add a second telemetry path.
- Tests are extensive (`test/*.test.js`): generation correctness, coverage, equivalence,
  mastery, remediation. Run `npm test` after engine changes.
