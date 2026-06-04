# Numera — Authentication & Account Security Audit + Hardening

_Audit + remediation pass, 2026-06-04. Scope: login, registration, password handling, email
verification, sessions, tokens, rate limiting, MFA, headers, audit logging, dependencies._

This document is the deliverable set: **1) audit report, 2) vulnerability list, 3) risk
ranking, 4) remediation summary, 5) architecture overview, 6) hardening recommendations.**

---

## 0. Architecture reality (read this first)

Numera authenticates with **username + password only**. Email is an **optional, post-signup**
field (the change-email flow), not a registration credential. The client is a **native Android
app**, not a browser. These two facts shape the whole audit:

- There is **no password-reset, email-verification-at-signup, or account-recovery-by-email**
  flow, and there is **no social login** — those mission sections describe components that do
  not exist and cannot exist without new infrastructure (an email/SMTP provider). They are
  tracked under [Recommendations](#6-security-hardening-recommendations), not faked.
- Browser-only headers (CSP, X-Frame-Options) are set and kept, but are low-relevance to a
  native API consumer. **HTTPS/TLS is a deployment concern** (terminated at a reverse proxy),
  outside this repo — see recommendations.

Authoritative model: **stateful JWT sessions** — a valid signature is not enough; the embedded
`sessionId` must still exist and be unexpired in `user_sessions`, so logout/revocation is
immediate. This is stronger than stateless JWT and already mitigates long token lifetimes.

---

## 1. Vulnerability list & risk ranking

Severity = impact × exploitability for _this_ app (native client, username-based auth).

| # | Sev | Finding | Status |
|---|-----|---------|--------|
| V1 | **Critical** | Email-verification code returned in the HTTP response body (`code: code`) — verification was a no-op; any caller could read the code and verify any address | ✅ Fixed |
| V2 | **High** | Verification code had no expiry, no attempt cap, and the verify endpoint was unthrottled → 10⁶ space brute-forceable | ✅ Fixed |
| V3 | **High** | Rate limiting was IP-only — credential stuffing one account from rotating IPs was unthrottled (mission requires IP **and** account) | ✅ Fixed |
| V4 | **High** | No `trust proxy` config → behind a reverse proxy every client shares the proxy's IP, collapsing all per-IP limiting | ✅ Fixed (opt-in via `TRUST_PROXY`) |
| V5 | Medium | bcrypt cost factor 10; no rehash path; mission prefers Argon2id | ✅ Fixed (Argon2id + rehash-on-login) |
| V6 | Medium | No password strength validation beyond length — `password123` accepted | ✅ Fixed (blocklist + policy) |
| V7 | Medium | `change-username` validation weaker/inconsistent with registration (any chars, looser length) | ✅ Fixed |
| V8 | Medium | Android stored the bearer token in **plaintext** `SharedPreferences` | ✅ Fixed (EncryptedSharedPreferences) |
| V9 | Medium | No MFA option | ✅ Added (server-side TOTP + recovery codes) |
| V10 | Low | No session inactivity timeout; fixed 7-day JWT | ✅ Fixed (3-day idle timeout + sliding activity) |
| V11 | Low | `Math.random()` used for the verification code (not cryptographically unpredictable) | ✅ Fixed (`crypto.randomInt`) |
| V12 | Low | Admin gate is `username === 'admin'` (string role, no roles table) | ⚠️ Documented (acceptable; see rec R6) |
| V13 | Low | `sqlite3@5` pulls transitive build-time CVEs (node-gyp→tar/cacache) | ⚠️ Documented (build-time only; see rec R5) |
| V14 | Low | No access/refresh token split | ⚠️ Documented — mitigated by stateful revocation (see rec R1) |

### Already-solid controls (verified, not assumed)
Stateful session revocation; logout + password-change invalidate sessions; per-user & admin
audit logs; 10 KB body cap; CORS allow-list (no-origin native clients permitted, browser
origins must match); security headers; **generic login error** (no user/password
distinction → no enumeration); session list/revoke endpoints; GDPR export + account deletion;
header-only HTTP logging (never logs bodies/tokens).

---

## 2. Remediation summary (what changed)

### Password security — `lib/passwords.js` (new)
- **Argon2id** for all new hashes (OWASP 2024 params: 19 MiB / t=2 / p=1). Native `argon2`
  installed and verified working in this environment.
- **Transparent migration:** `verifyPassword` accepts both `$argon2*` and legacy `$2*` (bcrypt)
  hashes; `needsRehash` flags legacy hashes; login re-hashes to Argon2id on the next successful
  sign-in. **No forced reset.** If the native module ever fails to load, it falls back to
  bcrypt cost 12 (mission's stated fallback) so the app keeps running.
- **Strength policy** (NIST 800-63B-aligned): min length 10, an **offline common/breached
  blocklist** (`lib/commonPasswords.js`), and rejection of passwords containing the username.
  No arbitrary composition rules. Applied at registration **and** password change.

### Email verification — `routes/account.js`
- **V1 fixed:** the code is never returned in the response (delivered out-of-band; logged
  server-side until an email provider exists).
- 10-minute expiry, hard 5-attempt cap (row deleted on exhaustion), constant-time compare,
  `crypto.randomInt` code, and the request endpoint rate-limited (5 / 15 min).

### Rate limiting & lockout — `middleware/rateLimit.js`
- **Per-account adaptive lockout** keyed on the attempted username (5 failures / 15-min
  window → temporary 429), layered on the existing per-IP brute-force tracker. Window-based,
  **never permanent** (mission requirement). Applied to login and MFA verification.

### MFA — `lib/totp.js` (new) + `routes/auth.js`
- **TOTP** (RFC 6238) on Node `crypto`, no third-party dep. **No SMS** (SIM-swap risk).
- Endpoints: `GET /mfa/status`, `POST /mfa/setup` (pending secret + otpauth URI),
  `POST /mfa/enable` (confirm code → issue 10 one-time **recovery codes**, argon2-hashed at
  rest), `POST /mfa/disable` (re-auth with password), `POST /mfa/login` (second-factor
  exchange). Login returns a short-lived `mfaRequired` challenge instead of a session when MFA
  is on; no streak/session side effects until the second factor passes. Recovery codes are
  strictly single-use. Audit events: `mfa_enrolled`, `mfa_removed`, `mfa_success`,
  `mfa_failure`, `mfa_recovery_used`, `mfa_challenge_issued`.

### Sessions — `middleware/auth.js`, `routes/auth.js`
- **3-day inactivity timeout** (shorter than the 7-day absolute lifetime) with **sliding
  `last_used_at`** (throttled to one write/minute). Idle sessions self-expire; active ones stay
  alive. Audit event `session_expired_inactive`.

### Tokens at rest — Android `RetrofitClient.kt`
- Bearer token moved to **EncryptedSharedPreferences** (AES-256-GCM, Keystore master key) with a
  **one-time migration** from the old plaintext value and a graceful fallback if the Keystore
  store can't be created.

### Infra — `config.js`, `server.js`
- **`TRUST_PROXY`** env (off by default) so per-IP limiting is correct behind a proxy without
  letting clients spoof `X-Forwarded-For` in dev.

### Schema — `migrations.js` v5 (additive/idempotent)
`user_email_verifications.attempts`; `users.mfa_secret`, `users.mfa_enabled`;
`user_sessions.last_used_at`; new `user_mfa_recovery_codes` table (+ index).

### Tests — `test/auth_security.test.js` (new, 9 tests)
Argon2id default + legacy-bcrypt verify + rehash flag; corrupt-hash safety; strength rejections;
TOTP round-trip; weak-password registration rejection; **email-code-not-leaked**; account
lockout; full MFA setup→enable→challenge→TOTP→recovery (single-use). **Server: 50/50 tests pass,
0 lint errors. Android: assembleDebug + unit tests green.**

---

## 3. Authentication architecture overview

```
Register ──> validate username + password strength ──> Argon2id hash ──> create user ──> session
Login ─────> per-IP + per-account lockout gate ──> Argon2id/bcrypt verify ──> rehash-if-legacy
                                                              │
                                              mfa_enabled? ───┴── no ──> finalizeLogin ──> session+JWT
                                                              │
                                                             yes ──> short-lived MFA challenge (5m)
                                                                         │
                              /mfa/login (TOTP or recovery code) ────────┴──> finalizeLogin ──> session+JWT

Every authed request ─> verify JWT signature ─> session row exists & unexpired ─> not idle-timed-out
                        ─> slide last_used_at ─> req.user
```

- **Token:** JWT `{ id, username, sessionId }`, 7-day expiry, signed with `JWT_SECRET`
  (required in production; dev mints an ephemeral one with a warning).
- **Session store:** `user_sessions` (revocable; absolute 7-day + 3-day idle). Users can list
  and revoke sessions; password change / logout revoke server-side.
- **MFA:** opt-in TOTP; recovery codes hashed at rest, single-use.
- **Secrets:** `JWT_SECRET`, DB, backups are env/gitignored — no hardcoded secrets, none shipped
  to the client.

---

## 4. Security testing performed

- **Authentication:** weak-password rejection, legacy-hash verification + upgrade, generic login
  error (no enumeration), account lockout after repeated failures.
- **Session/token:** revocation on logout/password-change, inactivity timeout, MFA challenge
  cannot be skipped (no token issued pre-second-factor), recovery-code single-use, expired/forged
  challenge rejected.
- **MFA:** end-to-end setup→enable→login; wrong TOTP rejected; recovery path + reuse rejection.
- **Authorization/privacy:** existing `profile_private` ownership test still green; admin log
  route gated.
- All automated in `node:test`; see "Tests" above.

---

## 5. Dependency audit

| Package | Note |
|---------|------|
| `argon2` (added) | Native KDF, prebuilt binary loads cleanly here. Verified hash/verify. |
| `bcryptjs` | Retained for legacy-hash verification + fallback. |
| `jsonwebtoken`, `express`, `cors` | Current, no advisories. |
| `sqlite3@5` | **7 advisories, all transitive build-time deps** (node-gyp → tar/cacache/make-fetch-happen). **Not reachable at runtime.** Fix is the breaking `sqlite3@6` bump — recommended as its own change (R5), not bundled into this auth pass. |

No unnecessary auth packages found. TOTP was implemented on built-in `crypto` to avoid adding a
dependency.

---

## 6. Security hardening recommendations (remaining / future)

- **R1 — Refresh-token rotation (Medium).** Introduce short-lived access tokens + rotating
  refresh tokens. _Deferred:_ the stateful, instantly-revocable session model already provides
  the core protection (replay/revocation); this is a meaningful Android networking rework better
  done as its own project.
- **R2 — Email provider (enables several mission flows).** Wire SMTP/SES so email verification,
  **password reset** (signed, single-use, expiring tokens; generic "if an account exists…"
  responses), and account recovery become real. Today verification codes are server-logged only.
- **R3 — Android MFA UI.** Server endpoints are ready; build enrollment (QR from the otpauth
  URI), the login second-factor screen, and recovery-code management.
- **R4 — HIBP breached-password check.** Optionally layer the HaveIBeenPwned k-anonymity range
  API onto the offline blocklist (decide fail-open vs fail-closed; adds a network dependency).
- **R5 — `sqlite3@6` upgrade.** Clears all current `npm audit` advisories (breaking; test the DB
  layer).
- **R6 — Real roles.** Replace `username === 'admin'` with a `role` column + middleware.
- **R7 — TLS/HSTS at the edge.** Enforce HTTPS + modern TLS at the reverse proxy in production;
  set `TRUST_PROXY` to the real hop count there.
- **R8 — Expand the common-password blocklist.** The curated core covers the passwords attackers
  try first; load a larger corpus (e.g. SecLists top-100k) if desired.
