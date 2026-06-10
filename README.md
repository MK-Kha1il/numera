# Numera

A full-stack, gamified math-learning app: a **Jetpack Compose Android client** talking to a
**Node.js / Express + SQLite server** that owns all game logic and progression. The server is
authoritative — the client never computes rewards or touches the database directly.

> New here? Start with [docs/Architecture.md](docs/Architecture.md), then the subsystem docs
> linked at the bottom. [CLAUDE.md](CLAUDE.md) is the fast index for the repo layout.

## Features

- **Learning-intelligence engine** — adaptive problem generation across a growing concept
  graph (currently ~58 concepts), with anti-repetition fingerprinting and multi-representation
  templates ([docs/MathEngine.md](docs/MathEngine.md)).
- **Concept-first lessons** — five-part lessons (intuition, *why*, representations, common
  mistakes, connections) instead of bare drills.
- **Socratic feedback** — misconception-targeted probes and fading hints when an answer is wrong.
- **Multi-dimensional mastery** — accuracy, fluency, retention, independence, and transfer
  tracked per concept; novel-context *transfer* challenges to prove real understanding.
- **Hero progression path** that traverses every strand (number, algebra, geometry, powers, …)
  in stage cycles, with a diagnostic placement test to skip ahead.
- **Ranked & casual duels** — real-time multiplayer over Socket.IO, **server-authoritative
  scoring** with an anti-cheat integrity engine (ranked requires fair-play consent).
- **Economy & engagement** — shop (cosmetics, boosters, rotations), quests, achievements,
  daily puzzle, SRS review, leagues, and leaderboards — all behind idempotent reward endpoints.
- **Lifecycle notifications** — streak, win-back, and recap nudges (in-app + email; FCM push
  scaffolded).
- **Hardened auth** — Argon2id hashing, TOTP MFA, refresh-token rotation, password reset
  ([docs/SecurityAudit-Auth.md](docs/SecurityAudit-Auth.md)).
- **Polished Compose UI** — design-token theme, onboarding flow, profile identity hub, dark mode.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express, SQLite3 |
| Real-time | Socket.IO |
| Auth | Argon2id, JWT (rotating refresh tokens), TOTP MFA |
| Android UI | Jetpack Compose, Material 3 |
| Networking | Retrofit 2, OkHttp 3, Gson |
| Build | Gradle + Android Gradle Plugin, JDK 17+ (system JDK; non-LTS JDK 26 also builds green) |
| CI | GitHub Actions — server lint + tests, Android assembleDebug + Robolectric |

## Getting Started

### Server

```bash
cd server
npm install
npm start
```

Runs on **port 3000** — visit `http://localhost:3000/` for the live status dashboard. Requires a
`server/.env` with `JWT_SECRET` (required in production; dev auto-generates an ephemeral one with
a warning). See [config.js](server/config.js) for all env config.

### Android

Build the debug APK (the system `JAVA_HOME` is used as-is — no override needed):

```powershell
cd android
.\gradlew.bat assembleDebug
```

Install on a device or emulator:

```powershell
adb install android\app\build\outputs\apk\debug\app-debug.apk
```

You can also download the APK directly from the server dashboard at
`http://localhost:3000/download-apk`. On Windows, `Start_Numera_Server.bat` + `Launch Numera.lnk`
build, install, and launch into BlueStacks in one step.

## Verifying changes

- **Server:** `npm test` (node:test — boots the real app on an ephemeral port against a throwaway
  DB) and `npm run lint` (ESLint v9, 0 errors expected).
- **Android:** `gradlew assembleDebug` must be green; `gradlew testDebugUnitTest` runs the
  JVM Compose UI test net (Robolectric — no device/emulator).
- Both suites also run in CI on every push to `main` and on PRs.

## Documentation

- [Architecture](docs/Architecture.md) · [DataFlow](docs/DataFlow.md) · [Security](docs/Security.md)
- [MathEngine](docs/MathEngine.md) · [ProgressionSystem](docs/ProgressionSystem.md) ·
  [AchievementSystem](docs/AchievementSystem.md) · [DesignSystem](docs/DesignSystem.md)
