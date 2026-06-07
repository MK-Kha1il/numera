# Spec — Lifecycle & Notification System

> Goal: turn Numera's existing in-app notification table into a **multi-channel lifecycle
> engine** (in-app + email now, push later) that drives Day-2/7/30 retention without violating
> the project's privacy/minor-safety posture. This is roadmap item #1 (Impact 9 / Difficulty 4).
> Status: **Phase A implemented** (in-app + email, server-side). Migration **v11** shipped.
> Remaining: Android prefs screen, the optional refactor of the 7 legacy insert sites onto the
> funnel, and Phase B (FCM push). See "Implementation status" below.

## Implementation status (Phase A — shipped on `feat/lifecycle-notifications`)
- ✅ Migration **v11** (`migrations.js`): `notification_preferences`, `notification_log`
  (UNIQUE dedup), `push_tokens`. All three added to `USER_SCOPED_TABLES` (`routes/account.js`).
- ✅ **`services/notificationService.js`** — the `notify()` funnel: in-app always; email gated by
  prefs + non-empty address + adult + (recap-only) `telemetry_enabled`; per-channel dedup via
  `notification_log`; signed one-click unsubscribe token (HMAC over `JWT_SECRET`).
- ✅ **`services/lifecycleJobs.js`** — hourly `startLifecycleSweeper` (wired in `server.js`
  alongside the retention sweeper, server-only): triggers `streak_risk`, `winback_d1/d3/d7`,
  `weekly_recap` (Sunday, telemetry-gated). Best-effort, never throws.
- ✅ **`routes/notifications.js`** — `GET/POST /api/notifications/preferences`,
  `GET /api/notifications/unsubscribe` (no-auth, signed token).
- ✅ **Tests** (`test/notifications.test.js`, 6): unsubscribe token round-trip/tamper, funnel
  dedup, adult-emails-vs-minor-blocked, streak_risk sweep (+ same-day re-sweep dedup), lapsed
  minor in-app-but-no-email, prefs round-trip + unsubscribe. **`npm test` 105 pass, lint 0 errors.**
- ✅ **Follow-ups done:** all **7 legacy `INSERT INTO user_notifications` sites** (auth welcome,
  friends ×3, math level-up, rating tilt, achievement complete) now route through `notify()`
  (in-app channel; behavior-preserving, but they can gain email/push later). **Richer weekly
  recap** (level + streak + problems-solved + coins). **Quiet-hours enforcement** (`isQuietHours`,
  midnight-wrapping, gates push; unit-tested). **Partial-update safety** on the prefs POST (merges
  onto the current row, not defaults — so tz-only / single-toggle updates don't clobber siblings).
  **Android**: a server-backed **"Email Reminders"** switch (binds `email_lifecycle`) in the
  Settings → Notifications card + **`tz_offset_minutes` capture** on settings load. `npm test` 106
  pass / 0 lint errors; Android `assembleDebug` + `testDebugUnitTest` green.
- ⬜ **Still deferred:** Phase B FCM `pushChannel`; a fuller prefs UI (quiet-hours hour pickers —
  only the email toggle + tz are wired client-side today); true week-over-week recap deltas (needs
  a weekly snapshot table — current recap shows cumulative standings, framed honestly as such).

## 1. What exists today (don't rebuild it)
- `user_notifications(id, user_id, title, message, type, read_state, created_at)` — the in-app
  center. Listed by `routes/notifications.js` (GET `/api/notifications`, POST `/read`).
- **7 scattered `INSERT INTO user_notifications` call sites** (auth, friends ×3, math, rating,
  achievementService) — each writes the table directly. No dedup, no delivery beyond in-app.
- `services/mailer.js` (nodemailer) — already used for password reset / email verification.
- `services/retention.js` — a **daily sweep** job pattern we can reuse for lifecycle triggers.
- `users.telemetry_enabled` (now opt-in by default), DOB/age gate, `streak`, `last_active`.

## 2. What's missing (the gap)
1. A **single funnel** so every notification can fan out to channels + respect prefs/consent.
2. **Delivery channels** beyond in-app (email digests now; push later).
3. **Scheduled lifecycle triggers** — nobody is reminded to come back. This is the whole point.
4. **Per-user preferences**, frequency caps, quiet hours, timezone.
5. **Dedup / send log** so we never double-send.

## 3. Channel decision (read this first — it has a compliance fork)
The compliance audit's strongest asset is **"no third-party analytics/ad/push SDKs."** Adding
**FCM** reintroduces Google as a data processor and stores push-token PII for a likely-minor
audience — it requires a privacy-policy update, a DPIA touch, and minor-safety review.

**Recommendation — phase it:**
- **Now (Phase A):** **in-app + email only.** Zero new dependency (reuse `mailer.js`), fully
  privacy-preserving, ships immediately, and email alone recovers a large share of lapsed users.
- **Later (Phase B):** **FCM push as an explicit opt-in**, default-off for minors, documented in
  the policy. Build the `pushChannel` interface now (no-op), wire FCM behind it later.
- **Web client:** use **VAPID Web Push** (standards-based, no Google SDK) when the web app lands.

The architecture below is channel-agnostic so Phase B is a drop-in, not a refactor.

## 4. Schema — migration v11
Append to `migrations.js` (then add the three new tables to `USER_SCOPED_TABLES` in
`routes/account.js` so deletion stays complete — C4 invariant).

```js
{
  version: 11,
  name: 'lifecycle_notifications',
  up: async (run) => {
    // Per-user channel/category prefs. Rows created lazily; absence = sensible defaults.
    await run(`CREATE TABLE IF NOT EXISTS notification_preferences (
      user_id INTEGER PRIMARY KEY,
      email_enabled INTEGER NOT NULL DEFAULT 1,        -- transactional always allowed
      email_lifecycle INTEGER NOT NULL DEFAULT 1,      -- streak/winback/recap (off for minors)
      push_enabled INTEGER NOT NULL DEFAULT 0,         -- opt-in, Phase B
      quiet_hours_start INTEGER DEFAULT 21,            -- local hour, no sends 21:00–08:00
      quiet_hours_end INTEGER DEFAULT 8,
      tz_offset_minutes INTEGER DEFAULT 0,             -- client-reported, for send timing
      updated_at INTEGER
    )`);
    // Idempotent send log: dedups triggers + powers frequency caps.
    await run(`CREATE TABLE IF NOT EXISTS notification_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category TEXT NOT NULL,        -- 'streak_risk' | 'winback_d1' | 'weekly_recap' | ...
      channel TEXT NOT NULL,         -- 'inapp' | 'email' | 'push'
      dedup_key TEXT NOT NULL,       -- e.g. 'streak_risk:2026-06-07' — UNIQUE per user
      sent_at INTEGER NOT NULL,
      UNIQUE(user_id, dedup_key)
    )`);
    await run(`CREATE INDEX IF NOT EXISTS idx_notiflog_user_cat
               ON notification_log(user_id, category, sent_at)`);
    // Future push tokens (Phase B). Table exists now so deletion logic covers it.
    await run(`CREATE TABLE IF NOT EXISTS push_tokens (
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL,
      platform TEXT,                 -- 'android' | 'web'
      created_at INTEGER,
      PRIMARY KEY(user_id, token)
    )`);
  },
}
```
> Also add a `tz_offset_minutes` capture on the client (one field on login/heartbeat) so lifecycle
> timing respects local time — sending a "come back!" at 3 a.m. is the dark pattern we're avoiding.

## 5. The funnel — `services/notificationService.js` (new)
One entry point replaces the 7 scattered inserts.

```js
// notify(userId, { category, title, message, type, channels, dedupKey, meta })
// - ALWAYS writes the in-app row (the notification center is the source of truth).
// - For email/push: checks prefs + telemetry_enabled + age + quiet hours + frequency cap,
//   records notification_log (UNIQUE dedup), then hands off to the channel adapter.
async function notify(userId, opts) {
  const { category, title, message, type = 'info',
          channels = ['inapp'], dedupKey, meta } = opts;

  // 1. In-app (existing table) — unconditional, replay-safe.
  await inAppChannel.write(userId, { title, message, type });

  // 2. External channels — gated.
  for (const ch of channels.filter((c) => c !== 'inapp')) {
    if (!(await isAllowed(userId, category, ch))) continue;       // prefs/consent/age/quiet
    const key = `${category}:${ch}:${dedupKey}`;
    if (!(await claimDedup(userId, category, ch, key))) continue;  // UNIQUE insert; skip if dup
    await channelFor(ch).send(userId, { title, message, category, meta });
  }
}
```
- `isAllowed`: honors `telemetry_enabled`, `notification_preferences`, **minor → lifecycle off by
  default**, quiet hours (using `tz_offset_minutes`), and a per-category frequency cap
  (e.g. ≤1 lifecycle email/day, ≤2/week).
- Channel adapters: `inAppChannel` (existing INSERT), `emailChannel` (templates over `mailer.js`),
  `pushChannel` (no-op interface now; FCM in Phase B). All share the `send(userId, payload)` shape.
- **Refactor:** replace the 7 direct `INSERT INTO user_notifications` with `notify(...)` calls so
  every existing notification (friend request, achievement, rating change…) gains channels for
  free.

## 6. Lifecycle triggers — `services/lifecycleJobs.js` (new)
A scheduled sweep (reuse `retention.js`'s daily-job pattern; run hourly so timezone windows work).
Each trigger computes its audience by SQL, then calls `notify(...)` with a date-stamped
`dedupKey` so it fires at most once per window.

| Category | Audience (SQL gist) | When | Channels | Cap |
|---|---|---|---|---|
| `streak_risk` | active yesterday, **not** today, within N h of reset | evening local | inapp+email(+push) | 1/day |
| `winback_d1` | last_active = today−1, streak just broke | next morning | email(+push) | once |
| `winback_d3` / `winback_d7` | last_active = today−3 / −7 | morning | email | once each |
| `weekly_recap` | active in last 7d | Sun morning local | email+inapp | 1/wk |
| `quest_incomplete` | quests started, unclaimed, pre-reset | evening | inapp(+push) | 1/day |
| `league_ending` | in a league closing <6 h, rank changeable | pre-close | inapp+push | once |
| `duel_rematch` | lost/won a ranked duel, opponent online | event-driven | push/inapp | n/a |

- **Streak insurance ships with this** (roadmap #8): a `streak_freeze` utility (already have a
  shop/utility system) + auto-offer on `winback_d1`. Cheap, huge retention impact.
- **Weekly recap** = the Spotify-Wrapped lever (#20): "you mastered 3 concepts, rating +40, here's
  your graph." Shareable → organic. Build the email template to be screenshot-worthy.

## 7. Routes — extend `routes/notifications.js`
```
GET  /api/notifications/preferences        -> current prefs (lazy-default)
POST /api/notifications/preferences        -> update channels/quiet hours/tz
POST /api/notifications/push-token         -> register/refresh (Phase B; validates platform)
GET  /unsubscribe?token=...                -> one-click email unsubscribe (signed token, no auth)
```
Email footer must carry the one-click unsubscribe (CAN-SPAM/GDPR + minor-safety).

## 8. Client (Android)
- The **notification center already exists** — no change needed for in-app.
- Add a **Notifications preferences screen** under `ui/feature/settings/` (toggles map to the
  prefs endpoint). Capture `tz_offset_minutes` on login.
- Phase B only: FCM token registration → `POST /push-token`; a foreground service/notification
  channel; opt-in dialog (default-off, especially for minors).

## 9. Compliance guardrails (non-negotiable — ties to ComplianceAudit M5/H2/C2)
- Lifecycle/profiling-derived nudges **default OFF for minors**; high-privacy defaults.
- Honor `telemetry_enabled` at the funnel, not per-call-site.
- **Quiet hours + frequency caps** are mandatory, not optional — this is the line between
  "helpful reminder" and the dark pattern the audit flags.
- New tables added to `USER_SCOPED_TABLES`; deletion test must show zero residual rows (C4).
- Update Privacy Policy: notification data, email processor, (Phase B) push token + FCM processor.

## 10. Test plan
- `notificationService`: dedup (double-call → one external send), minor → no lifecycle email,
  `telemetry_enabled=0` → in-app only, quiet-hours suppression.
- `lifecycleJobs`: each trigger's audience SQL on a seeded throwaway DB; idempotent re-run.
- Route: prefs round-trip; unsubscribe token; deletion-completeness over the 3 new tables.
- Reuse the `npm test` ephemeral-DB harness; keep ESLint clean (double-escape any LaTeX).

## 11. Build order (≈ the Difficulty-4 path)
1. v11 migration + `USER_SCOPED_TABLES` + deletion test.
2. `notificationService.notify()` + adapters; refactor the 7 call sites onto it (no behavior
   change yet — pure funnel).
3. `emailChannel` templates (streak, winback, weekly recap) over `mailer.js` + unsubscribe.
4. `lifecycleJobs` sweep + the 5 highest-value triggers (streak_risk, winback_d1/3/7, weekly_recap).
5. Prefs endpoint + client settings screen + tz capture. **Ship Phase A.**
6. Phase B (separate, gated): FCM `pushChannel`, token endpoint, opt-in UI, policy update.
