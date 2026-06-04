# Third-Party Notices

Numera includes or depends on the open-source components below. Each is the property of its
respective owners and licensed under its own terms. This file satisfies the attribution
requirements of those licenses (notably Apache-2.0 §4(d)). Full license texts are available from
each project. This list is maintained by hand — update it when dependencies change.

> In-app: surface an "Open-source licenses" screen in Settings that links to this list (the
> Android client can also generate one via the Gradle `oss-licenses` plugin).

## Server (Node.js — see `server/package.json`)

| Component | Purpose | License |
|---|---|---|
| express | HTTP framework | MIT |
| socket.io | Realtime duel/matchmaking | MIT |
| jsonwebtoken | JWT access tokens | MIT |
| argon2 | Password hashing (Argon2id) | MIT |
| bcryptjs | Legacy password hash verification | MIT |
| cors | CORS middleware | MIT |
| dotenv | Env configuration | BSD-2-Clause |
| nodemailer | Transactional email | MIT |
| sqlite3 | Embedded database | BSD-3-Clause |
| eslint, prettier (dev) | Lint/format | MIT |

## Android client (see `android/app/build.gradle.kts`)

| Component | Purpose | License |
|---|---|---|
| AndroidX / Jetpack Compose / Material3 / Lifecycle / Navigation | UI & app framework | Apache-2.0 |
| androidx.security:security-crypto | Encrypted credential storage | Apache-2.0 |
| Retrofit (com.squareup.retrofit2) | HTTP client | Apache-2.0 |
| OkHttp + logging-interceptor (com.squareup.okhttp3) | Networking | Apache-2.0 |
| Gson + converter-gson | JSON serialization | Apache-2.0 |
| socket.io-client (io.socket) | Realtime client | MIT |
| kotlinx-serialization-json (org.jetbrains.kotlinx) | Serialization | Apache-2.0 |
| ZXing core (com.google.zxing) | QR generation (MFA enrollment) | Apache-2.0 |
| JUnit, Robolectric, MockK, Espresso (test) | Testing | EPL-1.0 / MIT / Apache-2.0 |

## Bundled web assets

| Component | Purpose | License |
|---|---|---|
| KaTeX | Math rendering (loaded from jsDelivr CDN) | MIT |
