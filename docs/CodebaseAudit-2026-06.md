# Codebase Hardening Audit — 2026-06-22

A Staff-Engineer maintainability/quality pass over the whole repository (server + Android),
focused on organization, debuggability, AI-readability, and token-efficiency rather than
features. Companion to [AUDIT.md](AUDIT.md) (the earlier stabilization sprint).

## Verdict

**The codebase is already in strong shape — disciplined, not messy.** The God-file splits are
done, both sides have real test nets, there are 0 `TODO`/`FIXME`/`HACK` markers, no tracked
cruft, and no dead dependencies. The headline gap was the **top-level navigability / AI-readability
layer**, which this pass adds. An aggressive "restructure everything" pass was explicitly *not*
done: it would churn working, tested code for no functional gain and fight both ecosystems'
idioms (Kotlin packages, Express routers).

### Evidence (measured this pass)
| Signal | Value |
|---|---|
| Tracked files | 508 |
| Server tests | **1052 passing, 0 failing** (`npm test`) |
| Server lint | **0 errors, 0 warnings** (was 0 errors / 52 warnings before this pass) |
| Android tests | 41 Robolectric UI test files |
| `TODO`/`FIXME`/`HACK`/`XXX` | 0 (both codebases) |
| Tracked backup/`.old`/dupe files | 0 |
| Declared deps unused | 0 (all 9 server deps referenced; `bcryptjs` = legacy-hash verifier) |
| Largest files | content/data (`conceptLessons.js` 552KB, `templates.js` 214KB, `db.js` 141KB), not tangled logic |

## What changed in this pass

### 1. AI-readability layer (new) — *Phase 11/12*
- **`PROJECT_INDEX.md`** (root): single entry point — 30-second orientation table, repo map,
  run/verify table, and the canonical **invariants** list.
- **`ai/`** (new dir, 8 files): token-efficient briefs — `README`, `project-overview`,
  `architecture`, `feature-map` (the feature→file lookup table), `state-management`,
  `math-engine`, `competitive-system`, `design-system`. Designed so a task like "fix
  achievements" reads `ai/feature-map.md` → the achievements files, not the whole tree.
- Design rule: `ai/` is the compressed index; `docs/` holds the depth — no duplication.

### 2. Documentation consistency — *Phase 10/11*
- `docs/Architecture.md` de-staled: "20 routers" → **43**; "God files remain to be split" →
  **done**; "no UI test net" → **41-file Robolectric net**; quality-gate section now lists
  `testDebugUnitTest` + CI. (The doc had drifted from reality across many shipping sprints.)

### 3. Dead-code elimination (server) — *Phase 4*, verified by `npm test`
- Removed genuinely-dead imports: `fs` (db.js); unused destructured math helpers in
  `mathGenerator.js` (7), `templates.js` (5), `validation.js` (2 — whole line).
- Removed a dead computation (`rank`) in the friend-room socket handler (`server.js`).
- Removed a now-redundant `eslint-disable` on the answer-stripping security code (the new
  `ignoreRestSiblings` config handles that rest-sibling pattern natively).

### 4. Consistency / cleanliness (server) — *Phase 6/10/15*, lint now 0 warnings
- ESLint config aligned to the project's stated philosophy: added `ignoreRestSiblings: true`
  (the deliberate "omit a key from a response" idiom) and `caughtErrors: 'none'` (matches the
  existing `allowEmptyCatch`).
- Marked intentionally-unused parameters with `_` (or dropped them) across `visualEngine.js`,
  `knowledgeGraph.js`, `problemOrchestrator.js`, `teachingEngine.js`, `templates.js`, so an
  unused param now self-documents as intentional.

### 5. Android DTO split — `Models.kt` 2,218 → 6 files — *Phase 3*, verified by Gradle
- Split the 2,218-line `Models.kt` (283 DTOs) into six domain files in the **same package**
  (`Models.kt` 458, `AccountModels.kt`, `ShopSocialModels.kt`, `CompetitiveModels.kt`,
  `ClubTournamentModels.kt`, `ProfileSettingsModels.kt`) — all now under the 600-line rule.
- **Zero consumer changes**: Kotlin resolves classes by package, not file, so no `import`
  anywhere needed touching. Done by mechanical slice (no retyping → no transcription risk);
  content conserved exactly (2,214 body lines redistributed).
- Verified green: `gradlew compileDebugKotlin compileDebugUnitTestKotlin` **BUILD SUCCESSFUL**
  and the full Robolectric suite `gradlew testDebugUnitTest` **BUILD SUCCESSFUL**.

## Remaining risks & recommended next steps (not done this pass)

| # | Item | Severity | Impact | Effort | Notes |
|---|---|---|---|---|---|
| 1 | **Oversized Android UI screens** still over the ">600 line, split it" rule: `SettingsScreen.kt` (2,317), `ProfileScreen.kt` (1,928). (`Models.kt` — **done**, see §5 above.) | Low–Med | Med (maintainability + AI token cost) | **High** (not a mechanical slice) | These are Compose *screens*, not pure data. **`ProfileScreen` was investigated:** it's a single ~1,870-line composable with 30+ shared `remember` state vars; its UI renders across **five `if (selectedSubTab==N)` tab blocks PLUS a shared bottom "Dialogs" section that interleaves each tab's dialogs with unrelated ones** (e.g. the Saved-tab collection dialogs sit next to `replayReview`). There are **no extractable top-level helpers** — everything is inline or nested-local. `SettingsScreen` is the **same shape** (one ~1,490-line composable + a single nested `TwoFactorSettingsSection`). A safe split therefore needs a **state holder / `ProfileViewModel` / `SettingsViewModel`** to consolidate state first, then section extraction — *not* a file-slice. Do it incrementally with **BlueStacks smoke-testing** (Robolectric render tests won't catch dialog/state-flow regressions). |
| 2 | **Token-heavy content/data files** (`conceptLessons.js` 552KB, `templates.js`, `db.js`) | Low–Med | Med (AI must load a huge file to edit one record) | High / risky | Treat as data, not logic. Only split if a real workflow demands it; a per-concept file layout would help AI token cost but is a large, risky migration. |
| 3 | **Rating-substrate caveat** (`users.elo`/`rank` historically written by both NRS-solo and duel-Elo) | Med | Med | High | Tracked separately in `Spec-RatingUnification.md` on another branch — out of scope here. Confirm branch before touching shared rating columns. |
| 4 | **Local-only dev cruft** (`scratch/`, `.system_generated/` Python scripts) | Info | None (gitignored) | Trivial | Not in the repo; the user may clean their working dir at will. |

## Verification

Server side fully verified green after every change: `npm run lint` (0/0) and `npm test`
(1052/1052). Android side: the `Models.kt` split was verified with `gradlew compileDebugKotlin
compileDebugUnitTestKotlin` and the full `gradlew testDebugUnitTest` Robolectric suite — all
**BUILD SUCCESSFUL**. The doc/AI-layer additions are non-code and risk-free.
