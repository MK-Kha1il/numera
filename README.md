# Numera

A gamified mathematics learning app built with Node.js + Express on the backend and Jetpack Compose on Android.

## Features

- **60-level progression map** with adaptive difficulty powered by ELO ratings
- **Duolingo-inspired UI** — flat 3D cards, tactile buttons, smooth animations
- **Diagnostic placement test** — skip to your level in 10 minutes
- **Ranked & casual duels** — real-time multiplayer via Socket.io
- **Achievement & quest system** with race-condition-hardened claim endpoints
- **Shop economy** — cosmetics, utility boosters, and daily/featured rotations
- **Profile tab** — custom banners, math-themed avatars, friends list, dark mode

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express, SQLite3 |
| Real-time | Socket.io |
| Android UI | Jetpack Compose, Material 3 |
| Navigation | Navigation3 (Compose Runtime) |
| Networking | Retrofit 2, OkHttp 3, Gson |
| Build | Gradle 9.1, Adoptium JDK 17 |

## Getting Started

### Backend

```bash
cd server
npm install
node server.js
```

Server runs on **port 3000**. Visit `http://localhost:3000/` for the live status dashboard.

### Android

1. Build the APK:
   ```powershell
   $env:JAVA_HOME=" "
   cd android
   .\gradlew.bat assembleDebug
   ```

2. Install on a device or emulator:
   ```powershell
   adb install android\app\build\outputs\apk\debug\app-debug.apk
   ```

You can also download the APK directly from the server dashboard at `http://localhost:3000/download-apk`.
