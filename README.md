# Numera

A math practice game for Android. You work through a map of levels, get hints and worked examples
when you're stuck, and can play other people in timed duels. The Android app is Jetpack Compose;
the server is Node/Express with SQLite and owns all the game logic — XP, coins, ratings and
progression are never computed on the device.

## What's in it

- **Practice.** 181 concepts from arithmetic up to calculus and number theory, each with a short
  lesson. Problems are generated, so they don't repeat, and a wrong answer gets a follow-up
  question, then a hint, then a worked example. A placement test lets you skip what you know.
- **Progress.** Levels with 0–3 stars, a daily streak, six daily quests, spaced-repetition
  review of old mistakes, and a per-concept mastery view.
- **Competition.** Real-time ranked duels over Socket.IO (graded on the server, with timing checks),
  plus bot duels, async duels with friends, Puzzle Rush, a weekly tournament and a weekly league.
  One rating per domain, moved by both duels and solo play ([docs/Rating.md](docs/Rating.md)).
- **The rest.** A coin shop for cosmetics, achievements, friends, clubs, classes, and in-app/email
  notifications. Coins are earned only; there are no purchases or ads.

[docs/Systems.md](docs/Systems.md) lists every system with its files and known gaps.

## Running it

### Server

```bash
cd server
npm install
npm start          # http://localhost:3000
```

Put `JWT_SECRET` in `server/.env`. It's required in production; in development the server makes up
a temporary one and warns. Everything configurable is read in [server/config.js](server/config.js).

### Android

```powershell
cd android
.\gradlew.bat assembleDebug
adb install app\build\outputs\apk\debug\app-debug.apk
```

The app looks for the server at `10.0.2.2:3000`, which is how an emulator reaches the host
machine. On Windows, `Start_Numera_Server.bat` starts the server and `launch-numera.ps1` builds
the APK and installs it into BlueStacks.

## Tests

```bash
cd server && npm test && npm run lint
cd android && ./gradlew assembleDebug testDebugUnitTest
```

The server tests boot the real app against a throwaway database. The Android tests are Robolectric
Compose tests and don't need a device. CI runs both on every push.

## Docs

- [Architecture](docs/Architecture.md) · [Data flow](docs/DataFlow.md) · [Security](docs/Security.md) ·
  [Compliance](docs/Compliance.md)
- [Math engine](docs/MathEngine.md) · [Progression](docs/ProgressionSystem.md) ·
  [Rating](docs/Rating.md) · [Achievements](docs/AchievementSystem.md) ·
  [Economy](docs/EconomyModel.md)
- [Design system](docs/DesignSystem.md) · [Sound](docs/SoundDesign.md) ·
  [Content quality gate](docs/ContentQualityGate.md)
