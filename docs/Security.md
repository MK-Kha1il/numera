# Security

Numera's threat model: untrusted clients (a modified APK can send any request), a LAN/
internet-exposed API, and player incentive to forge progression/economy. Defenses are
**server-side and layered**.

## Authentication
- **Passwords:** bcrypt (`bcryptjs`, salt rounds 10). Never stored or logged in plaintext.
- **Tokens:** JWT (`jsonwebtoken`), 7-day expiry, signed with `JWT_SECRET` from `config.js`.
  `JWT_SECRET` is **required in production** — the server refuses to boot without it (so it
  can't silently mint an ephemeral secret that invalidates all sessions on restart). Dev/test
  fall back to a random secret with a loud warning.
- **Stateful sessions:** every JWT embeds a `sessionId` that must still exist (and be
  unexpired) in the `user_sessions` table (`middleware/auth.js`). Logout/revocation deletes
  the row → outstanding tokens are instantly rejected. Tokens without a `sessionId`, or for
  revoked/expired sessions, are treated as hijack attempts and audit-logged.

## Authorization
- All `/api/*` routes (except register/login and the public landing/download) require
  `authenticateToken`. Handlers operate on `req.user.id` from the verified token.
- **Ownership:** per-user resources are scoped by `req.user.id`, not by client-supplied IDs.
  When auditing/adding a route that takes a `:userId` or resource id, verify it checks
  ownership against `req.user.id` rather than trusting the parameter.

## Input handling
- JSON/urlencoded bodies capped at **10KB** (anti-overflow/DoS).
- Registration enforces a strict username regex (`^[a-zA-Z0-9_]{3,20}$`) and password length
  (8–100). Math answers are validated by the engine (`mathEngine/validation.js`), not trusted.
- SQL uses **parameterized queries** (`?` placeholders) throughout — no string interpolation
  of user input into SQL.

## Rate limiting & brute force (`middleware/rateLimit.js`)
- **Global:** 100 requests/IP/minute across all endpoints.
- **Per-route:** tighter limits on auth (register 5/min, login 10/min).
- **Brute force:** 5 failed logins/IP in 15 min → temporary block.
- Loopback and RFC-1918 private IPs are **exempt** (dev, emulators, LAN play). State is
  in-process — move to a shared store (Redis) if horizontally scaled.

## Transport & headers (`middleware/security.js`)
- Headers on every response: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  HSTS, a restrictive `Content-Security-Policy`, `Referrer-Policy`, `Permissions-Policy`.
- **CORS** is an allow-list (`config.js` `CORS_ORIGINS`); requests with no `Origin`
  (native mobile, server-to-server) are allowed, browser origins must match.

## Economy & progression integrity
- Reward endpoints (`shop/purchase`, `achievements/claim`, `quests/claim`, `math/complete`,
  `daily-puzzle/submit`, `shop/consume-retry`) are **idempotent** (`idempotency.js`):
  a replayed `Idempotency-Key` returns the stored response instead of granting twice.
- Coin spends run in a **transaction** with conditional `WHERE coins >= ?` deduction; a DB
  trigger (`trg_users_coins_nonneg`) is a last-resort guard against negative balances.

## Auditing
- `security_audit_logs` records auth failures, session-hijack attempts, and rate-limit hits
  (`securityLog`). Surfaced via `/api/user/security-logs` and `/api/admin/security-logs`.

## Secrets & data at rest
- `server/.env`, `numera.db` (+ WAL sidecars), and `server/backups/` are **gitignored**.
  Confirmed not tracked. Never commit them.
- Backups (`npm run backup`) use `VACUUM INTO` + `PRAGMA integrity_check` + a SHA-256 sidecar.
  **Gap (accepted):** backups are local-only — no offsite/encrypted copy yet.

## Known gaps / future work
- HTTPS/TLS termination is assumed to be handled by a reverse proxy in production (HSTS is set
  but the app serves HTTP directly on the LAN today).
- Rate-limit and brute-force state is per-process (single-instance assumption).
