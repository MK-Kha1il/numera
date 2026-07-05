# Multiplayer Overhaul — July 2026

A full audit, bug hunt, redesign and polish pass over the live multiplayer stack (the Socket.IO
duel path: matchmaking → live match → rating commit → debrief). This document is the deliverable:
the audit findings, every bug fixed at its root, the design changes shipped, and the ranked list
of what remains.

Scope note: Numera's "multiplayer" spans live duels (Socket.IO), async duels, bot duels,
reasoning arena, live rooms, tournaments and clubs. The REST-based modes were already
server-authoritative and test-covered; **the live socket duel was the weak spine** — it had no
tests around its lifecycle, no disconnect story, and several state-machine races. This pass
focused there. Findings for the other modes are in §7.

---

## 1. Audit summary — why multiplayer felt "dull, buggy, unreliable"

The audit found that the *feel* problems were mostly *correctness* problems:

| Symptom reported | Root cause found |
|---|---|
| Duels freeze on "Waiting for Duel Arena grid setup…" | `ArenaScreen.onDispose` disconnected the shared socket **during** the navigation handoff to `DuelGameScreen`, and `disconnect()` also `off()`'d the duel screen's freshly-registered listeners. Whether a duel worked depended on a race between the nav transition and the join round-trip. |
| Match "never ends" / opponent bar frozen | Same root cause (listeners wiped), **plus** the server had no match deadline and no mid-duel disconnect handling: a player who backgrounded the app stalled the duel forever, and the room object leaked in `rooms{}` for the life of the process. |
| Result screen never appears on a tie | Server emits `winnerId: null` on a draw; the client called `data.getInt("winnerId")`, which **throws** on JSON null — every drawn match hung the screen. There was also no draw UI at all (a tie would have rendered "DEFEAT" for both). |
| Wrong-answer highlights bleed across questions | The client advanced to the next problem on a fixed 1s timer, independent of the server's grading ack. A slow ack then landed on the *next* problem's UI state. |
| "It matched me with a bot when I wanted a human" | The server **force-converted** the queue into a bot duel after 10s. The client's "duel a bot instead?" offer at 20s was dead code — and two humans joining >10s apart could never pair. |
| Feels emotionally flat | No countdown, no draw/forfeit/comeback/photo-finish recognition, no opponent presence (rank, connection state), no match clock, defeat copy that blamed "speed" in a mode where speed doesn't score. |

Additional weaknesses found in audit (fixed):

- **Anti-cheat state leaked to clients.** `room_status` / `duel_end` broadcast the raw room
  player objects — including `integrityFlags`, `integrityReason`, `problemStartTime`, socket ids.
  A tampering client could calibrate against the scorer in real time.
- **Socket auth skipped the stateful session check.** REST enforces "JWT valid *and* session
  row alive"; the socket path verified only the JWT, so revoked/logged-out tokens kept working
  for live duels.
- **Bot head start.** The bot's answer timer started at room creation; with the new countdown it
  would have solved during the intro. It now waits out the countdown like a human.
- **Friend lobby edge cases.** A player could join their *own* lobby code (duel vs self); 4-digit
  codes could collide and silently orphan an open lobby; codes never expired.
- **`solved_count` was credited a flat +5** per duel regardless of how many problems the player
  actually answered.
- **Double-end races.** The final answer, a disconnect grace expiry, and the deadline sweep could
  all call `endDuel` for the same room; nothing prevented a double rating/coin commit.
- **Queueing while already in a live match** was allowed (could corrupt both matches).
- **Client identity depended on a network fetch.** `myUserId` came from a profile round-trip; if
  it failed, the screen attributed scores/победу to the wrong side. It now arrives via the nav
  key from the arena, with the fetch as fallback only.

## 2. What shipped — server (`server/server.js`)

**Lifecycle guarantees (a duel always terminates, exactly once):**
- `openDuelRoom()` — single construction path for matchmade/bot/friend duels: synced countdown
  (`DUEL_COUNTDOWN_MS = 3s`), hard deadline (`45s/problem + 15s grace`), socket binding, and a
  sanitized `duel_start` (`countdownMs`, `matchMs`, `ranked`).
- **Deadline sweeper** (piggybacks the 1.5s matchmaking tick): a room past its deadline emits
  `duel_timeout` and resolves with scores as they stand. No room can leak.
- **Disconnect grace → forfeit**: a mid-duel drop marks the player disconnected, notifies the
  opponent (`opponent_disconnected`, 30s grace), and forfeits if they don't return. Rejoining via
  `join_duel_room` re-binds the new socket id, cancels the grace, and emits `opponent_reconnected`.
- **`leave_duel`** — explicit forfeit (back button honesty): opponent wins immediately.
- **`endDuel` re-entrancy guard** (`room.finishing`) — racing terminators commit once.
- **Forfeit overrides score** — the leaver loses even while ahead; a cheat verdict on the
  remaining player still voids their win.

**Fairness & matchmaking:**
- **Bot fallback is now an offer, never a force**: after 10s the server emits `bot_offer`; the
  client renders a clearly-labeled "practice match, rating unchanged" button (`accept_bot`).
  Humans queueing far apart can finally pair; nobody is switched to a bot without consent.
- **Queue guard**: can't queue while in a live match (if your side of that match is disconnected,
  queueing is treated as walking away → the old match forfeits cleanly first).
- Friend lobbies: self-join rejected, collision-proof code draw, 10-minute TTL with
  `friend_room_expired` notification.

**Integrity & security:**
- `publicPlayer()` sanitizer on every broadcast — anti-cheat state never leaves the server
  (unit-tested).
- Socket auth now performs the **same stateful session check as REST** (revoked sessions can't
  duel).
- Countdown-abuse clamp: answers sent before the match start grade with 0ms elapsed —
  squarely inside the superhuman-timing flag.
- `duel_end` carries `integrityReason` for a disqualified player (spec §5: no silent bans).

**Honest accounting:**
- `solved_count` credits problems actually answered, not a flat 5.
- `duel_end` now includes explicit `draw: true` and `forfeit: { userId, reason }`.

**Telemetry (Phase 14):** new allowlisted analytics events —
`arena_queue_start/cancel`, `duel_match_found`, `duel_finish`, `duel_forfeit`, `duel_draw`,
`duel_reconnected`, `bot_offer_accepted` (+ `duel_rematch` reserved). These give the funnel:
queue starts → matches → finishes, plus the leak points (cancel/forfeit/disconnect rates).

## 3. What shipped — client (Android)

**Socket ownership (the freeze fix):**
- `SocketClient.duelHandoffActive` — set when a match is found; `ArenaScreen.onDispose` no longer
  disconnects during the handoff. `DuelGameScreen` owns the socket from then on and disconnects on
  every exit path.
- Duel listeners register **synchronously before any network await** (they used to be gated on a
  profile fetch round-trip).
- Own-connection resilience: on socket drop → calm "reconnecting… your progress is safe" banner;
  on reconnect → automatic room re-join + state resync (server progress wins, index never rewinds).

**Match flow (Phase 3):** queue → match found → VS player cards (names + rank badges) →
**synced 3-2-1 countdown** (server-relative offsets, immune to clock skew, haptic tick per second)
→ rounds → verdict reveal beat → result → rating movement.

**Round state machine (the reveal-race fix):** verdicts are keyed to the problem index they
graded; stale acks are dropped. Advance happens 900ms *after* the verdict (one readable beat), with
a 4s no-verdict fallback so a dropped ack can't stall the match (and never self-judges locally).

**Feedback (Phase 4):** opponent-answered haptic tick + progress bar movement; match clock (quiet
until the last 30s, then red); streak fire; lead callouts; opponent disconnect/reconnect surfaced
in the lead line ("Rival lost connection…"); "you're done" waiting state shows the opponent's live
position ("Rival is on Q4/5…") instead of the frozen-looking disabled button.

**Result screen (Phase 9 — emotional design, elegant not spectacular):**
- Honest outcomes: 🏆 VICTORY / DEFEAT / **🤝 DRAW** (draws used to hang the screen entirely).
- One "moment line" that names what happened: *Flawless* (perfect match), *What a comeback — you
  were N points down*, *A photo finish — decided by a single answer*, forfeit attribution in plain
  words, *Time ran out — scored as it stood*.
- Rating **count-up** (`animatedInt`, reduce-motion aware), rank badge, promotion callout,
  cheat-forfeit notice now includes the *why* (timing reason).
- Defeat copy teaches: "No luck involved — sharpen up and run it back" (was "opponent was faster",
  which was false — speed doesn't score).
- Compete→learn ramp kept: "Review your N misses" into Growth Practice.

**Leaving is honest:** hardware back mid-match asks "Leave the match? Leaving now forfeits to
{opponent}" and forfeits immediately on confirm; any other navigation away emits the same forfeit
as a safety net. A dead room shows a "Match unavailable" recovery card (never a silent pop, never
an infinite spinner) — Robolectric-tested.

**Copy honesty (Phase 5):** intro said "fastest correct answers win" — false (scoring is
20/correct, accuracy only). Now: "most correct answers wins". Speed pressure comes from the match
clock, not from scoring — deliberately, so network latency and button-mashing never decide a match.

## 4. Educational integrity review (Phase 5)

Confirmed sound (already in place, kept): server-side grading via the CAS-backed equivalence
engine; answers/explanations never ship with live problems; every graded duel answer feeds the
learning engine (mastery/retention/misconceptions); misses bank to the Mistakes Bank; ranked
requires fair-play consent; bot/casual matches are rating-neutral; level-fair problem sets;
hidden-MMR + level-window pairing with beginner protection.

Strengthened this pass: guessing still can't win (accuracy scoring kept), countdown can't be
jumped (clamp → integrity flag), leaving can't dodge a loss (forfeit), and the anti-cheat scorer
can no longer be observed by the client (payload sanitization).

## 5. Verification

- Server: **1176/1176 tests pass** — 5 lifecycle unit tests (forfeit-overrides-score, endDuel
  re-entrancy, draw credits no winner, per-player solved_count, publicPlayer sanitization) plus
  5 socket integration tests (`test/duelSocket.test.js`, real socket.io clients: auth/session
  gate, pair→sanitized duel_start→grading acks→draw flag, leave_duel forfeit, rematch handshake,
  stale rematch). ESLint 0 errors. `socket.io-client` added as a devDependency for the harness.
- Android: `assembleDebug` green; full Robolectric suite green including the new
  `DuelGameScreenTest` (dead-socket recovery state) and the updated `ArenaScreenTest`.

## 6. New socket protocol (reference)

| Event | Direction | Payload |
|---|---|---|
| `bot_offer` | S→C | `{ waitedSeconds, message }` — practice-bot offer while queued |
| `accept_bot` | C→S | — accept offer, start rating-neutral bot duel |
| `leave_duel` | C→S | `{ roomId }` — explicit forfeit |
| `duel_start` | S→C | + `countdownMs`, `matchMs`, `ranked`; players sanitized |
| `room_status` | S→C | sanitized players + `startsInMs`, `remainingMs`, `ranked` (on join) |
| `opponent_disconnected` | S→C | `{ userId, graceMs }` |
| `opponent_reconnected` | S→C | `{ userId }` |
| `duel_timeout` | S→C | match deadline hit; `duel_end` follows |
| `duel_room_gone` | S→C | joined a room that no longer exists |
| `duel_end` | S→C | + `draw: bool`, `forfeit: { userId, reason }?`, `rematchAvailable`, `rematchWindowMs`, per-player `integrityReason` when DQ'd |
| `request_rematch` | C→S | `{ roomId }` (the finished room) — first accepter waits, second starts the rematch |
| `rematch_pending` | S→C | you accepted; waiting on the opponent |
| `rematch_requested` | S→C | `{ roomId, byUsername }` — opponent wants to run it back |
| `rematch_unavailable` | S→C | window expired / opponent left / room unknown |

## 7. Remaining risks & ranked recommendations

Scored 1–5 on Competitive impact (C), Educational impact (E), User satisfaction (S), and
implementation Effort (F, lower = cheaper). Ordered by value/effort.

**Shipped in the follow-up pass (2026-07-04, same overhaul):**
- ✅ **Rematch flow** — 30s post-match window (human-vs-human), `request_rematch` handshake,
  result-screen button with waiting/incoming/unavailable states, screen swap on the same socket
  (handoff), same stakes + fresh set, cancelled cleanly on disconnect/expiry. Covered by socket
  integration tests.
- ✅ **Round-level opponent correctness ticks** — the client derives ✓/✗ from the opponent's
  score/progress deltas (no new server data) and flashes it on their track with a haptic tick.
- ✅ **Player record in the VS intro** — `publicPlayer` now carries rating + career W-L;
  the intro shows "1234 rating · 12W–8L" under the opponent (hidden for the bot). The duel
  opponent card also now shows the COMPETITIVE rank, not the level-progression rank.
- ✅ **Socket-level integration tests** — `test/duelSocket.test.js`: real socket.io clients cover
  auth/session rejection, queue→pair→duel_start sanitization, countdown fields, grading acks,
  the draw flag, leave_duel forfeit, and the full rematch handshake.
- ✅ **Bot pacing realism (partial)** — the bot's think time now scales with the duel level
  (2.5s + 250ms/level); accuracy remains flat 80% (see #5 below).

**Shipped in the closeout pass (2026-07-04, "leave nothing behind"):**
- ✅ **Process-death rejoin** — `find_my_duel` socket query on arena entry; a "⚔️ Live match in
  progress — return now before it forfeits" banner rejoins via the standard handoff (the server's
  disconnect grace is still ticking, so rejoining cancels the forfeit). Socket-tested.
- ✅ **Ranked rematch fatigue cap** — consecutive ranked rematches capped at 2 via a chain depth
  carried through the offer (`rematchOfferAllowed`, unit-tested); casual chains uncapped; bots
  never get offers.
- ✅ **Bot accuracy scaling** — accuracy now scales with the duel level (~65% → 90%), alongside
  the level-scaled think time.
- ✅ **Emote set** — five positive-only emotes (👏 🔥 🤝 😅 🤯): fixed server allowlist (nothing to
  moderate), 2.5s server-side rate limit mirrored by a client cooldown, relayed only to the
  opponent, transient chip by their name + haptic. Junk/spam drop is socket-tested.

**Deliberately deferred / rejected:**

1. **Per-domain duel queues** (C3 E3 S2 F4). "Algebra duels" etc. — the rating substrate already
   supports per-domain credit; matchmaking would need per-domain pools. Deferred until the
   population can sustain multiple queues; splitting a thin queue would hurt every match.
2. **Spectator/live-room convergence** (C2 E2 S2 F5). Live rooms poll REST + socket pings; a
   shared "live match channel" abstraction could unify duels and rooms. Architecture note only.
3. **Draw tiebreaker** — deliberately **rejected**: total-time tiebreakers reward connection
   speed over understanding; a draw is an honest, rare outcome and now has a dignified screen.

## 8. REST-mode audit (async / bot / reasoning / live rooms / rush / tournaments / challenges)

Verified 2026-07-04, file by file. Overall verdict: **sound** — every mode is transactional where
money moves, duplicate-guarded, expiry-gated where timed, keeps its answer key server-side, and
has an anti-farm cap where coins or rating are at stake. Two real findings, both fixed:

- **Custom challenges trusted a client-supplied `elapsedMs` for the leaderboard speed tiebreak**
  — a tampering client could claim 0ms and win every tie (the exact hole tournaments had already
  closed). Fixed with `challenge_starts` (migration v63): the clock starts server-side the first
  time the problems are served (`GET /api/challenges/:code`, first view wins), `/play` requires
  the stamp and measures elapsed server-side, and the body field is ignored. Covered by two new
  tests (faked-0ms-cannot-outrank-real-speed; clockless attempts rejected). `challenge_starts`
  added to the account-deletion table list.
- **Puzzle Rush "personal best" included integrity-flagged runs** that the public board excludes
  — the two now apply the same bar.

Noted, deliberately not changed: live rooms have no server-side expiry (pure DB state, host-owned
lifecycle, nothing at stake — worth a 24h auto-close only if stale rooms ever confuse anyone);
bot-duel `/start` can create unbounded pending rows (global rate limiter bounds it; rewards are
already capped at `/play`); reasoning `/submit` has no idempotency middleware but its
status-pending guard inside the transaction makes double-resolution impossible.

## 9. Key invariants (do not regress)

- Every duel room MUST have a `deadline`; every path out of a room goes through `endDuel` (guarded
  by `room.finishing`).
- Broadcasts never contain raw room player objects — always `publicPlayer()`.
- The client never self-judges correctness, never advances past a problem before either the
  verdict or the 4s fallback, and drops verdicts whose index doesn't match.
- `SocketClient` ownership: Arena while queueing → Duel after `duelHandoffActive` — whichever
  screen owns it disconnects it, nobody else.
- Leaving a live match is always an explicit, immediate forfeit — never a silent stall.
