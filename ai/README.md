# `ai/` — AI assistant briefs

This directory exists to let an AI coding assistant (Claude Code, reviewers, refactor agents)
understand Numera **without reading the whole repository**. Each file is a dense, pointer-based
map: it tells you *where logic lives* and *what you must not break*, then sends you to the exact
source file or `docs/` deep-dive for detail.

**Design rule:** `ai/` is the compressed index; [`docs/`](../docs/Architecture.md) is the depth.
These briefs do not duplicate `docs/` — they point into it. Keep them short and current.

## Read order

1. [`project-overview.md`](project-overview.md) — what the app is, the stack, the one big idea (authoritative server).
2. [`architecture.md`](architecture.md) — layers, boundaries, request lifecycle, where each kind of code goes.
3. [`feature-map.md`](feature-map.md) — **the lookup table**: feature → server files + Android files. Start here for "fix X".
4. [`state-management.md`](state-management.md) — auth/token/session, client state, server↔client contracts.
5. [`math-engine.md`](math-engine.md) — generation, adaptivity, lessons, mastery, misconceptions.
6. [`competitive-system.md`](competitive-system.md) — duels, matchmaking, Elo/NRS rating, integrity, seasons.
7. [`design-system.md`](design-system.md) — tokens, theme, motion, brand voice.

## The contract for changing code (applies to every brief)

- **Server is authoritative** — never compute rewards/rating client-side.
- **New endpoint → `server/routes/<domain>.js`**, not `server.js`. Shared DB logic → `services/`. Pure helpers → `lib/` + a test.
- **New Android screen → `ui/feature/<domain>/`**, using `theme/` tokens (no raw dp/Color/shape literals).
- **Schema change → append to `server/migrations.js`** (never edit a shipped version).
- **Reward POSTs are idempotent; money is transactional.** See [`state-management.md`](state-management.md).
- A change is done only when its side's gates are green: server `npm test && npm run lint`; Android `gradlew assembleDebug` (+ `testDebugUnitTest` for UI).

The authoritative invariant list is in [`../PROJECT_INDEX.md`](../PROJECT_INDEX.md#invariants-do-not-regress).
