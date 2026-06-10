# Numera — Ultra Review (2026-06-10)

> A full-panel review (product, UX, UI, educational psychology, math pedagogy, gamification,
> retention, growth, mobile, accessibility, security, performance, QA, architecture) of the
> entire application in its **current** state — including the uncommitted working tree.
> Brutally honest by request. Supersedes nothing; it **re-baselines** on top of
> `ProductStrategicAudit.md` (2026-06-07), most of whose roadmap has since shipped.
>
> Legend used in all tables — **Sev**: 🔴 critical · 🟠 high · 🟡 medium · ⚪ low.
> **Imp** (user impact): H/M/L. **Eff** (effort): S (<1d) / M (days) / L (weeks) / XL (months).

---

## 0. Re-baseline — what changed since the 06-07 audit

In three days the product closed a remarkable share of the strategic audit's gaps. Credit
where due, because this review must not re-litigate solved problems:

**Shipped since 2026-06-07:** tournaments, puzzle rush, async duels, bot duels, challenges,
ranked seasons with rewards, clubs + governance + club wars, friend nudges, per-concept
discussion + moderation queue, 7 new curriculum strands (53 concepts, 53 concept-first
lessons), the CAS/equivalence engine (JS primitives + SymPy bridge) with typed answer input,
fully server-authoritative competitive grading, timing-based duel anti-cheat with forfeits,
a 9-step onboarding flow with funnel analytics, lifecycle notifications (in-app + email),
streak freeze, goal-based learning plans, skill tree, weekly recap, the visualization
redesign (answer-revealer purge, predict-before-verify), privacy policy/ToS drafts, age
gate, TLS, account deletion, 53 server test files, EncryptedSharedPreferences token storage.

**The consequence:** the product's weakness profile has *shifted*. The old story was "great
engine, missing features." The new story is **"great engine, vast feature surface, and the
binding constraints are now content depth, real-user validation, reach, liquidity, business
model, and finish quality."** Velocity has outrun verification: ~12 new screens and ~10 new
systems have never been touched by a real user, an Android test (17 test files cover 104
source files), or a design QA pass.

---

## 1. The one-paragraph truth (updated)

Numera is now a **feature-complete competitive math platform with nobody in it**. The
learning-and-competition intelligence remains the best in the category, the server is
genuinely hardened, and the feature checklist now rivals products with 100-person teams. But
it serves **53 concepts** where IXL serves ~9,000 skills; it runs on **one platform** with
**zero distribution**, **zero revenue**, **zero live push notifications** (credential-gated),
and **zero population** — which silently breaks the entire competitive/social layer it just
built (matchmaking, clubs, wars, leaderboards, discussion all assume people). The biggest
risks are no longer missing systems; they are **unvalidated systems** — an enormous surface
shipped at AI speed without field testing, accessibility compliance, product analytics, crash
visibility, or a single external user's feedback. The next phase must be ruthless: *fewer
things, deeper, verified, in front of real learners.*

---

## 2. Persona walkthroughs

### 2.1 First-time user
Install → **Login screen first** (no value shown before the signup wall — no guest mode, no
"try one problem"). Signup → 9-step onboarding (Welcome→Goals→Profile→Diagnostic→Roadmap→
Aha→Celebrate→Habit→Notifications). The aha step is the right idea, but it arrives ~6 steps
deep; Duolingo gets you solving in <30s. The Notifications step asks for an opt-in that
**push cannot yet honor** (FCM credential not wired) — a first-session broken promise.
Verdict: the front door is dramatically better than a week ago, but still **value-last, not
value-first**, and one network hiccup at launch logs you out (see UX-1).

### 2.2 Casual learner
Opens the app twice a week. Faces five tabs, an arena with seven modes, quests, daily puzzle,
commitment, SRS, learning plan, skill tree — **no single "do this now" surface**; at least
four systems compete to answer "what should I do today?" The actual solving experience is
excellent (lessons, hints, visuals, Socratic probes). Streak freeze now protects them.
Verdict: great session core, **overwhelming periphery**.

### 2.3 Struggling learner
The engine genuinely serves them: misconception diagnosis, Socratic probes, fading hints,
remediation, concept-first lessons, manipulatives that no longer reveal answers. Hearts/
out-of-hearts still puts a **failure tax on the people failing most** — the burnout/tilt
signals are measured but the loss-framed mechanics remain. No "I don't get it, explain it
differently" path (one lesson text per concept; no alternative explanation modality).
Verdict: best-in-class adaptivity, but the emotional design still punishes struggle.

### 2.4 High-performing learner
Burns through the 53-concept ladder quickly. Then: rating play is the only endgame. No
trig/precalc/calculus depth to climb into, no proofs, no olympiad/competition-style problem
sets, no prestige system. Verdict: **the ceiling arrives in weeks**, and the engine has
nothing left to adapt over.

### 2.5 Competitive learner
The strongest persona fit in the category — real Elo, seasons, tournaments, puzzle rush,
anti-cheat. But at current population the **realtime queue is empty** (bot fallback exists
but a bot win ≠ the thrill that retains chess players), tournament boards have three names,
and clubs are ghost towns. Verdict: world-class machinery idling for lack of liquidity; the
design must assume tiny population (async-first, bots-as-citizens, cross-time-zone events).

### 2.6 Returning learner (lapsed 3 weeks)
Today: nothing reaches them (push not live; email only if SMTP configured and address given —
email is opt-in post-signup by design). If they do return: no comeback flow, no "here's what
decayed, here's a 5-minute re-entry." SRS will quietly schedule reviews but nothing frames
the return moment. Verdict: the #1 retention lever is **built but not live**; the comeback
experience is unbuilt.

### 2.7 Daily user
Well served: quests rotate, puzzle daily, streak + freeze, seasons tick. Risks: quest/coin
faucets multiplied (tournaments, wars, challenges, seasons) with no economy rebalance — coin
inflation will hollow out the shop; and the daily loop spans too many surfaces (see 2.2).

### 2.8 Paying customer
Does not exist; cannot exist. No SKU, no payments, no entitlements, nothing to buy. Every
week of polish without a monetization decision deepens the eventual retrofit.

### 2.9 Parent
Invisible persona. Age gate exists, privacy posture is genuinely excellent (no ad/analytics
SDKs, local content, no LLM data sharing) — **and is never shown to the person who decides
installs for kids**. No parent view, progress email, time controls, or COPPA-style verifiable
consent flow for under-13s. Verdict: a marketable trust story locked in a drawer.

### 2.10 Educator
Invisible persona. No web client (Chromebooks), no class/roster/assignment layer, no
standards report despite the new strands being standards-aligned, no accessible math (WCAG
fail blocks US public schools). Verdict: the distribution channel with real money remains
fully unbuilt.

---

## 3. Benchmark matrix

| Capability | vs Khan | vs Brilliant | vs IXL | vs Duolingo | vs Prodigy | vs Chess.com/Lichess | vs Linear/Notion/Spotify |
|---|---|---|---|---|---|---|---|
| Adaptive engine / learner model | **Ahead** | **Ahead** | Equal | **Ahead** | **Ahead** | n/a | n/a |
| Mastery model (5-dim + transfer) | **Ahead** | **Ahead** | Behind (breadth) | **Ahead** | **Ahead** | n/a | n/a |
| Content breadth/depth | **Far behind** | Behind | **Far behind** | Behind | Behind | n/a | n/a |
| Authored lesson quality | Behind | **Far behind** | Equal | Equal | Equal | n/a | n/a |
| Competition systems | **Ahead** | **Ahead** | **Ahead** | Equal | **Ahead** | Behind (liquidity, spectate, variants) | n/a |
| Gamification loop | Equal | **Ahead** | **Ahead** | Behind (notifications, brand) | Equal | n/a | n/a |
| Community | Behind | Behind | Equal | Behind | Behind | **Far behind** | n/a |
| Reach (platforms, web, SEO) | **Far behind** | **Far behind** | **Far behind** | **Far behind** | **Far behind** | **Far behind** | n/a |
| Monetization | Behind all (none exists) | | | | | | |
| Accessibility | **Far behind** | Behind | **Far behind** | **Far behind** | Behind | Behind | **Far behind** |
| Privacy posture | **Ahead** | **Ahead** | **Ahead** | **Ahead** | **Ahead** | **Ahead** | **Ahead** |
| Craft/polish/brand identity | Behind | **Far behind** | Equal | Behind | Behind | Equal | **Far behind** |
| Server engineering quality | Equal+ | Equal | Equal | Behind (scale) | Equal | Behind (scale) | Behind (scale) |

---

## 4. Deliverable 1 — Top 100 weaknesses

### A. Population & liquidity (the silent killer of everything just built)
| # | Weakness | Sev | Imp | Eff | Recommendation |
|---|---|---|---|---|---|
| 1 | Every competitive/social system (queue, tournaments, clubs, wars, discussion, leaderboards) assumes a population that is currently ~0 — empty rooms teach users the app is dead | 🔴 | H | L | Design explicitly for tiny population: async-first defaults, bots as first-class citizens, ghost entries from past runs, cross-mode unified leaderboards |
| 2 | Realtime 1v1 queue with no players = infinite spinner; unclear if bot fallback auto-triggers on queue timeout | 🔴 | H | M | Guarantee a match: queue timeout → calibrated bot seamlessly, clearly disclosed |
| 3 | Tournament leaderboards with 1–3 entrants feel broken, not competitive | 🟠 | H | M | Seed with bot entries at calibrated ratings; collapse to weekly mega-tournament until population grows |
| 4 | Clubs/club wars unjoinable-cold: no discovery, no starter clubs | 🟠 | M | M | Official starter clubs auto-joinable; auto-assign on onboarding opt-in |
| 5 | Per-concept discussion will be empty for months — blank UGC surfaces erode trust | 🟡 | M | S | Seed each concept with 2–3 authored "common question" threads; hide the tab when empty |
| 6 | No growth loop of any kind: no referral, no share artifact, no web presence, no store optimization | 🔴 | H | L | Pick 2: shareable recap card + referral reward; ship before more features |

### B. Content & curriculum
| # | Weakness | Sev | Imp | Eff | Recommendation |
|---|---|---|---|---|---|
| 7 | 53 concepts ≈ 0.5–5% of incumbents' catalogs; the ceiling arrives in weeks for an engaged learner | 🔴 | H | XL | Content is the multi-month grind: target ~300 concepts (full middle-school + algebra-1 spine) before breadth elsewhere |
| 8 | No trigonometry, precalculus, or calculus strands despite achievement chains referencing "Calculus Master" | 🟠 | H | XL | Either build the strands or retire the achievement chains (see #58) |
| 9 | No word problems / applied contexts as a strand — the single most-tested real-world skill | 🟠 | H | L | Word-problem templates per concept with unit-aware grading |
| 10 | No multi-step problems (every exercise is single-answer) | 🟠 | H | L | Multi-part problems with per-step grading via the CAS |
| 11 | No proof/reasoning/justification content | 🟡 | M | XL | Defer; but add "explain why" self-explanation prompts cheaply (see EDU list) |
| 12 | One lesson text per concept — a struggling learner has no second explanation modality | 🟠 | H | M | Per-concept alternative explanation (different representation), surfaced after repeated failure |
| 13 | No worked-example library (faded worked examples are among the highest-effect-size interventions known) | 🟠 | H | M | 2–3 worked examples per concept, faded (full → partial → solve) |
| 14 | No video or production-value media; purely text+canvas | 🟡 | M | XL | Acceptable position — but state it as a deliberate "interactive-first" stance in marketing |
| 15 | Standards alignment claimed in commits but no exportable standards mapping/report | 🟡 | M | M | Emit a concept↔CCSS mapping doc; needed for parents/schools |
| 16 | No exam-prep framing (GCSE/SAT/state tests) — the #1 reason families pay | 🟠 | H | L | Goal-based plans already exist; add exam-mode packs over existing concepts |
| 17 | Content correctness rests on generation-time checks; no human/expert review loop has ever touched the catalog | 🟠 | H | M | Periodic expert audit pass; user-facing "report problem" on every exercise |
| 18 | No content versioning/audit trail — a bad template fix can't be traced to affected users | 🟡 | L | M | Stamp problems with template+version in history |

### C. Onboarding & activation
| # | Weakness | Sev | Imp | Eff | Recommendation |
|---|---|---|---|---|---|
| 19 | Signup wall before any value — no guest mode, no sample problem on the login screen | 🔴 | H | M | Guest/local mode with deferred account creation (sync on signup) |
| 20 | 9 onboarding steps before the app; each step is a drop-off cliff | 🟠 | H | M | Cut to ≤5: Welcome→Aha(solve now)→Diagnostic→Goal→Done; move Profile/Habit/Notifications into week-1 moments |
| 21 | Notification opt-in step requests permission push cannot yet honor (FCM credential absent) | 🟠 | M | S | Hide the step until push is live |
| 22 | Network failure during launch token validation **clears a valid token** and strands the user at Login (`Navigation.kt` catch block) | 🔴 | H | S | Distinguish 401 (clear) from IOException (keep token, retry/offline notice) |
| 23 | No activation instrumentation beyond onboarding funnel — D1/D7 activation events undefined | 🟠 | M | M | Define activation metric (e.g., 10 problems in 3 days) and log it |
| 24 | First session doesn't end with a concrete "come back tomorrow for X" hook | 🟡 | M | S | Schedule tomorrow's first quest visibly at session end |

### D. Retention & lifecycle
| # | Weakness | Sev | Imp | Eff | Recommendation |
|---|---|---|---|---|---|
| 25 | Push is built but not live (google-services.json + device FCM service missing) — the single highest-ROI item in the backlog is one credential away | 🔴 | H | S | Finish FCM wiring this week; nothing else pays back faster |
| 26 | Email lifecycle depends on opt-in addresses post-signup; coverage will be a small minority | 🟡 | M | S | Strengthen the "secure your account" nudge with a concrete benefit (recap email preview) |
| 27 | No comeback/reactivation experience in-app (lapsed user gets the same home screen) | 🟠 | M | M | Lapse-aware home: decay summary + 5-minute re-entry session |
| 28 | Coin faucets multiplied (tournaments/wars/challenges/seasons/quests/achievements) with no economy audit — inflation will hollow the shop and cheapen rewards | 🟠 | M | M | Economy spreadsheet: model daily earn vs. sink; rebalance prices/payouts |
| 29 | Streak repair absent (freeze shipped; repair-after-loss is the second valve) | 🟡 | M | S | Paid-in-coins repair within 48h of loss |
| 30 | No home-screen widget (streak/daily quest) — cheap daily-return surface | 🟡 | M | M | Glance widget: streak + today's quest |
| 31 | No offline mode at all; a commute user gets a dead app and a lost session habit | 🟠 | M | L | Cache an offline practice pack (generated problems are ideal for this — rare structural advantage) |
| 32 | Loss-framed mechanics (hearts, relic loss) persist for minors while burnout/tilt is measured but barely actuated | 🟠 | M | M | Ethics pass: convert hearts to "energy" framing for <13; auto-soften pacing on high tilt |
| 33 | Quiet hours / timezone correctness of lifecycle sends unverified | 🟡 | M | S | Test DST/timezone paths; default quiet hours 21:00–08:00 local |
| 34 | Streak timezone/DST edge cases unaudited (classic streak-rage source) | 🟡 | M | S | Unit-test streak day boundaries across TZ changes |

### E. Engagement architecture & focus
| # | Weakness | Sev | Imp | Eff | Recommendation |
|---|---|---|---|---|---|
| 35 | ≥4 surfaces compete to answer "what now?": dashboard, quests, learning plan, SRS due, commitment | 🟠 | H | M | One "Today" card that *composes* all of them into a single ordered session plan |
| 36 | Arena hub: 7 modes at population ~0 splits nonexistent liquidity 7 ways and paralyzes choice | 🟠 | H | M | One hero "Play" button (smart-routes to best-available mode); others demoted to a list |
| 37 | Progression sprawl: XP, coins, Elo, league, season points, war points, mastery, commitment — no hero metric | 🟡 | M | M | Subordinate visually: mastery (learn) + rating (compete); everything else becomes detail |
| 38 | Feature shipping outpaces validation: ~12 new screens with zero real-user exposure | 🔴 | H | M | Freeze features; recruit 10–20 real testers (friends/family/classroom); fix what they hit |
| 39 | No product analytics (beyond onboarding funnel) — flying blind on what's used | 🟠 | H | M | Self-hosted, privacy-safe event pipeline (counts, no PII) for screen/feature usage |
| 40 | No crash reporting (privacy-motivated absence) — field crashes invisible | 🟠 | H | M | Self-hosted ACRA/Sentry; crashes are not analytics |
| 41 | Over-rewarding risk: every action drops coins/XP/achievements — reward fatigue and meaningless dopamine | 🟡 | M | M | Audit reward moments; make fewer, bigger, more meaningful |

### F. Social & community
| # | Weakness | Sev | Imp | Eff | Recommendation |
|---|---|---|---|---|---|
| 42 | Verify friend-request decline actually shipped (was a compliance flag) | 🟠 | M | S | Confirm decline + ignore + block paths end-to-end |
| 43 | One-person moderation queue cannot scale with UGC discussion | 🟠 | H | M | Pre-publication filter (profanity/PII regex) + rate caps + auto-hide on N reports |
| 44 | No off-app community (Discord) — zero gravity between sessions | 🟡 | M | S | Official Discord; link from Profile |
| 45 | No spectating/replays of duels — kills shareability and learning-from-others | 🟡 | M | L | Replay file from existing server-side duel log; spectate later |
| 46 | Bot opponents' disclosure unclear — users discovering they beat "bots" framed as players lose trust | 🟠 | H | S | Always label bots; celebrate them as training partners |
| 47 | No mentor/peer-help loop (the strongest learning-community mechanic) | 🟡 | M | L | Defer until population exists |

### G. Monetization & business
| # | Weakness | Sev | Imp | Eff | Recommendation |
|---|---|---|---|---|---|
| 48 | Zero revenue model; zero infrastructure for one (payments, entitlements, seats) | 🔴 | H | L | Decide now even if shipping later: freemium consumer + school B2B; design the free/paid line before more features blur it |
| 49 | The compliance audit's "don't add monetization without revisiting" note means a future paywall has legal homework attached | 🟡 | M | M | Fold monetization into the DPIA when it happens |
| 50 | No price discovery ever done (would anyone pay? for what?) | 🟠 | H | S | Landing page + waitlist + fake-door pricing test costs ~a day |
| 51 | Parent channel (Prodigy's wedge) unbuilt — the adult with the credit card has no surface | 🟠 | H | L | Parent progress email is the cheapest first slice |
| 52 | School channel unbuilt (rosters, assignments, class dashboard, web) | 🟠 | H | XL | Phase 4 — but standards mapping + a11y are prerequisites to start |

### H. Reach & platform
| # | Weakness | Sev | Imp | Eff | Recommendation |
|---|---|---|---|---|---|
| 53 | Android-only — excludes ~half of consumer mobile and ~all of US classrooms | 🔴 | H | XL | Web (Compose Multiplatform or a thin web client over the same API) before iOS |
| 54 | No web presence at all: no landing page, no SEO, no store listing optimization | 🟠 | H | M | A landing page with the privacy story + concept pages (SEO) is days of work |
| 55 | English-only; strings hardcoded in composables (no `strings.xml` discipline) — i18n retrofit grows daily | 🟡 | M | L | Start extracting strings now; pick 1 second language as forcing function |
| 56 | Locale-numeric input: European users type `0,5` — equivalence likely rejects commas (verify) | 🟠 | M | S | Normalize decimal comma in `areEquivalent` input path |
| 57 | Tablet/landscape/foldable layouts unaudited | 🟡 | L | M | Smoke-test on tablet emulator; fix the top 3 screens |

### I. Gamification coherence
| # | Weakness | Sev | Imp | Eff | Recommendation |
|---|---|---|---|---|---|
| 58 | Achievement catalog drifted from the product: mastery chains exist for calculus/combinatorics/number-theory/mental but **none for the 7 new strands** (fractions, decimals, integers, geometry, stats, number sense, algebraic expressions) — new content feels unrewarded; old chains may be unreachable | 🟠 | M | S | Regenerate mastery chains from the live knowledge graph |
| 59 | Seasonal achievement chain is half-built (spring/summer only) | 🟡 | L | S | Complete or remove |
| 60 | 0-cost badges seeded into `shop_items` blur shop (buy) vs. trophy case (earn) | 🟡 | M | S | Separate catalogs; shop shows only purchasables |
| 61 | Shop rarity/pricing never rebalanced against the new faucets (see #28) | 🟠 | M | M | Same economy audit |
| 62 | No collection meta-game (sets, completion bonuses) — items are isolated SKUs | 🟡 | L | M | Themed sets with completion rewards |
| 63 | Quests are 4 fixed types (solved/duels/mistakes/daily_puzzle) — repetitive within a week | 🟡 | M | S | Add quest types over new systems (puzzle rush, transfer, SRS clear, discussion) |
| 64 | Hidden achievement "magic number 67" is an in-joke; hidden achievements should be discoverable legends | ⚪ | L | S | Fine to keep; add 3–4 genuinely discoverable ones |
| 65 | League system overlaps seasons/tournaments in purpose (weekly competitive bucket) | 🟡 | M | M | Merge or clearly differentiate (league=effort, season=skill) |

### J. Trust, safety, compliance
| # | Weakness | Sev | Imp | Eff | Recommendation |
|---|---|---|---|---|---|
| 66 | Privacy Policy/ToS drafted but unpublished, unlinked in-app, not counsel-reviewed | 🔴 | H | S | Publish + link in Settings/signup; counsel review before any public distribution |
| 67 | DPIA pending while profiling likely-minors — the largest regulatory exposure (GDPR/Children's Code) | 🔴 | H | M | Complete DPIA; document the legitimate-interest analysis |
| 68 | No verifiable parental consent path for under-13s (age gate alone is not COPPA-grade if under-13s are admitted) | 🟠 | H | M | Either block <13 or build the consent flow |
| 69 | No GDPR data export (deletion exists; portability doesn't) | 🟡 | M | M | JSON export endpoint |
| 70 | Best-in-class privacy posture is invisible — never marketed, never shown to parents | 🟡 | M | S | "Your data" screen + landing-page pillar |
| 71 | Raw `err.message` returned by many routes — internals leak + unhelpful user copy | 🟡 | M | S | Error-code map; generic 500 text |
| 72 | The app's trust surface (rankings, achievements, streaks) has no "why" transparency (why this rating change, why this problem) | 🟡 | M | M | Post-duel rating breakdown; "why am I seeing this" on recommendations |

### K. Accessibility (unchanged: would fail an audit)
| # | Weakness | Sev | Imp | Eff | Recommendation |
|---|---|---|---|---|---|
| 73 | KaTeX WebView math is opaque to TalkBack — the core content is unreadable to screen readers | 🔴 | H | L | Generate alt text from the problem AST server-side (you *have* the AST — rare advantage); set contentDescription on MathText |
| 74 | `contentDescription` present in 11 of 104 UI files | 🟠 | H | M | Sweep all icons/buttons; add semantics to custom components |
| 75 | State signaled by color alone (correct/wrong, rarity, mastery dims) | 🟠 | H | M | Add icons/shapes/text to every color signal |
| 76 | No reduced-motion mode despite heavy animation (confetti, shimmer, pulse) | 🟠 | M | S | Respect system animator scale; add in-app toggle |
| 77 | Font-scale (dynamic type) behavior unaudited; sp usage unverified across custom text | 🟡 | M | M | Test at 1.3×/2× font scale; fix clipping |
| 78 | Touch-target sizes unaudited (44/48dp minimum) | 🟡 | M | S | Audit small icon buttons |
| 79 | Contrast unaudited across the dark theme (especially dimmed/secondary text) | 🟡 | M | S | Token-level contrast check (the token system makes this cheap) |
| 80 | No dyslexia-friendly option (font/spacing) | ⚪ | L | S | OpenDyslexic toggle is nearly free |

### L. Technical & operational
| # | Weakness | Sev | Imp | Eff | Recommendation |
|---|---|---|---|---|---|
| 81 | Android test coverage: 17 test files vs 104 source files; all the new screens (onboarding, tournaments, puzzle rush, clubs, wars, skill tree, recap, plans) untested | 🟠 | H | L | Extend the proven Robolectric pattern to the top-10 flows |
| 82 | No CI — `npm test`/`gradlew test` run only when remembered, locally | 🟠 | H | S | GitHub Actions: server tests + lint + assembleDebug on push |
| 83 | ~54 files of uncommitted work in the tree — a crash/mistake loses days | 🟠 | M | S | Commit in coherent slices today |
| 84 | Backups are local `VACUUM INTO` snapshots on the same disk | 🟠 | H | S | Off-machine copy (even a cloud-drive sync of the backup dir) |
| 85 | SQLite single-writer + single-node Socket.IO + in-process cache = known scale ceiling (acceptable now; documented) | 🟡 | L | XL | Keep the Postgres+Redis plan staged to growth; don't do it early |
| 86 | Lifecycle jobs run in-process (`setInterval`-style) — duplicate sends if a second instance ever runs | 🟡 | M | S | Job lock row in DB |
| 87 | SymPy bridge spawns a Python process per call (tens of ms, 8s kill); Python is a silent prod dependency; CPU-burn DoS margin within 30/min rate cap | 🟡 | M | M | Persistent worker pool + expression complexity cap; document the Python dependency |
| 88 | One `MathText` = one WebView; lists of math (options, archive, library) can hold many WebViews → memory/jank | 🟠 | M | L | Single shared rendering WebView or native renderer (also fixes a11y #73) |
| 89 | `SettingsScreen.kt` is 2,129 lines — the largest screen in the app violates the project's own 600-line rule | 🟡 | M | M | Split by section; same for ProfileScreen (1,724) and LevelMapScreen (1,332) |
| 90 | Socket event rate-limiting unverified (duel answer spam, queue join/leave flapping) | 🟡 | M | S | Per-socket token bucket |
| 91 | Anti-cheat is timing-only; no longitudinal/statistical detection (accuracy-vs-rating anomalies), no device attestation | 🟡 | M | L | Add post-hoc statistical screens before rewards finalize; Play Integrity API later |
| 92 | Tournament problems shared across entrants over an async window → out-of-band answer sharing | 🟡 | M | M | Per-entrant problem sets from the same template/difficulty recipe (engine already supports this) |
| 93 | No observability: no metrics, no uptime alert, no error-rate dashboard | 🟡 | M | M | Even a /healthz + cron ping + log-based error counts |
| 94 | No load testing ever run (duel socket path especially) | ⚪ | L | M | k6 script for REST; artillery for sockets, when usage justifies |

### M. Identity & brand
| # | Weakness | Sev | Imp | Eff | Recommendation |
|---|---|---|---|---|---|
| 95 | No brand character, world, or narrative — "premium dark Duolingo" is a description, not an identity | 🟠 | M | L | One distinctive identity decision (mascot/world/voice) carried through onboarding, empty states, celebrations |
| 96 | No signature celebration moment worth screenshotting | 🟡 | M | M | One spectacular, shareable moment (mastery-up or season-end) |
| 97 | App name/store positioning untested; "the competitive home of math" positioning exists in docs only | 🟡 | M | S | Write the store listing now; it forces positioning clarity |
| 98 | Empty states across new features are likely default/blank (clubs, discussion, tournaments at 0 population) | 🟠 | M | M | Design empty states as invitations ("Be the founder of…") — they are the *most-seen* screens at launch |
| 99 | No sound identity (SoundManager exists; no signature audio brand) | ⚪ | L | M | 3–5 distinctive earcons; respect mute |
| 100 | The product has no public face: no website, no demo video, no press kit — it cannot be discovered, evaluated, or trusted from outside | 🟠 | H | M | Landing page + 60-second demo video |

---

## 5. Deliverable 2 — Top 100 improvement opportunities

Forward-looking builds, ranked roughly by leverage within each theme. (Sev omitted — these
are opportunities; Imp/Eff retained.)

### Activation & growth (1–15)
| # | Opportunity | Imp | Eff |
|---|---|---|---|
| 1 | Finish FCM push (credential + device service) — the built-but-dark retention engine | H | S |
| 2 | Guest mode: solve 3 problems before any signup; convert with progress-save prompt | H | M |
| 3 | Collapse onboarding to 5 steps with the aha-solve at step 2 | H | M |
| 4 | Landing page: privacy story + live demo problem + waitlist (also a pricing fake-door) | H | M |
| 5 | Shareable weekly-recap card (image export) — Wrapped-style organic loop | M | M |
| 6 | Referral system: both sides get a cosmetic (not currency — protects economy) | M | M |
| 7 | Play Store listing optimization: screenshots that show the duel + manipulatives | M | S |
| 8 | "Challenge a friend" deep link that works for non-users (install → direct into the duel) | H | L |
| 9 | Classroom pilot: hand the APK to one real teacher; watch 30 kids use it | H | S |
| 10 | Concept pages on the web (SEO: "how to add fractions") feeding app installs | M | L |
| 11 | D1 ritual: end first session by scheduling tomorrow's quest visibly | M | S |
| 12 | Comeback flow: lapse-aware home with decay summary + 5-min re-entry pack | M | M |
| 13 | Home-screen widget: streak + daily quest | M | M |
| 14 | Email capture with a real bribe: "get your weekly progress report" | M | S |
| 15 | Activation metric definition + dashboard (e.g., 10 problems in 3 days) | M | M |

### Learning experience (16–40)
| # | Opportunity | Imp | Eff |
|---|---|---|---|
| 16 | Faded worked examples per concept (highest-effect-size cheap intervention) | H | M |
| 17 | Self-explanation prompts: after a correct answer, occasionally ask "why?" (MCQ of reasons) | H | M |
| 18 | Second explanation modality per concept, auto-offered after repeated failure | H | M |
| 19 | Word-problem strand with real contexts (money, sports, games) | H | L |
| 20 | Multi-step problems with per-step CAS grading | H | L |
| 21 | Error-specific micro-lessons: misconception detected → 60-second targeted fix | H | M |
| 22 | "Today" composer: one ordered session plan from quests+SRS+plan+commitment | H | M |
| 23 | Interleaved practice mode (mixed concepts — proven superior to blocked practice) | M | S |
| 24 | Retrieval-practice framing for SRS ("brain workout," streak-safe, low stakes) | M | S |
| 25 | Math keyboard for typed input (fraction, exponent, sqrt, π keys) | H | M |
| 26 | Handwriting input via ML Kit digit/expression recognition (offline, private) | M | L |
| 27 | Estimation mode ("about how big?") — builds number sense, fun under time pressure | M | M |
| 28 | Mental-math trainer with adaptive speed targets (fluency dimension actuated) | M | M |
| 29 | Per-concept manipulative coverage: algebra tiles, area-model multiplication, fraction circles, coordinate plotting | H | L |
| 30 | "Predict the graph" interactions for the parabola/line visuals (commit-then-verify everywhere) | M | M |
| 31 | Explain-back: after a lesson, learner picks which of 3 summaries is correct | M | S |
| 32 | Confidence calibration: "how sure are you?" before reveal; track calibration as a stat | M | M |
| 33 | Mistake museum: turn the mistakes log into a review game ("defeat your old errors") | M | M |
| 34 | Transfer challenges as a weekly special event (they exist — give them a stage) | M | S |
| 35 | Adaptive session length: tilt/burnout high → suggest stopping (and reward stopping) | M | S |
| 36 | Mastery-decay heatmap on the skill tree ("these 3 are fading — 5-min refresh?") | H | M |
| 37 | Concept connections map shown after mastery ("you unlocked the door to X") | M | S |
| 38 | Audio narration of lessons (TTS) — accessibility + learning-style win | M | M |
| 39 | Opt-in LLM tutor ("explain differently") with the privacy story made explicit | H | L |
| 40 | Printable practice sheets from the generator (parent/teacher delight, zero competition risk) | M | S |

### Competition & social (41–60)
| # | Opportunity | Imp | Eff |
|---|---|---|---|
| 41 | One hero "Play" button that smart-routes (queue→bot fallback→async) — guaranteed match | H | M |
| 42 | Bots as named, personified training partners with visible ratings and win records | H | M |
| 43 | Weekly mega-tournament (one event everyone funnels into — concentrates liquidity) | H | M |
| 44 | Duel replays from the server-side log (share + learn) | M | L |
| 45 | Rematch + best-of-3 series | M | S |
| 46 | Season-end ceremony screen (the signature celebration moment) | M | M |
| 47 | Puzzle-rush daily leaderboard with friend-bracket view | M | S |
| 48 | Async duel "correspondence" notifications when push lands (your move!) | H | S |
| 49 | Club war MVP highlights + war recap card | M | M |
| 50 | Per-entrant tournament problem sets (closes answer-sharing) | M | M |
| 51 | Spectate live duels (later; needs population) | M | L |
| 52 | Statistical anti-cheat screens before season rewards finalize | M | M |
| 53 | Rating transparency: post-duel breakdown of Elo delta (trust) | M | S |
| 54 | Official Discord + in-app link | M | S |
| 55 | Discussion seeding: 2–3 authored threads per concept | M | S |
| 56 | Pre-publication content filter + rate caps for discussion (moderation scale) | H | M |
| 57 | Friend leaderboard as default view (strangers' boards don't motivate at small N) | M | S |
| 58 | Study-buddy pairing: two friends share a weekly goal with joint reward | M | M |
| 59 | Cross-mode unified "competitor profile" (duels+rush+tournaments in one card) | M | M |
| 60 | School-vs-school wars (when classroom channel exists — the Prodigy growth engine) | H | XL |

### Gamification & economy (61–75)
| # | Opportunity | Imp | Eff |
|---|---|---|---|
| 61 | Economy model spreadsheet → rebalanced faucets/sinks/prices | H | M |
| 62 | Regenerate mastery achievement chains from the live knowledge graph | M | S |
| 63 | Separate trophy case from shop (0-cost badges out of the catalog) | M | S |
| 64 | Quest types over new systems (rush, transfer, SRS, discussion) | M | S |
| 65 | Item sets with completion bonuses (collection meta-game) | M | M |
| 66 | Season-exclusive cosmetics (scarcity without FOMO timers) | M | S |
| 67 | Streak repair (coins, 48h window) | M | S |
| 68 | Prestige system for maxed concepts (re-master at speed for cosmetic tiers) | M | M |
| 69 | Reward-moment audit: fewer, bigger, more meaningful celebrations | M | M |
| 70 | "Pity timer"/guaranteed progression on rare drops if any randomness exists | L | S |
| 71 | Coin gifting between friends (capped; social glue) | L | M |
| 72 | Daily login calendar replaced by "daily learning moment" (avoid hollow check-ins) | M | S |
| 73 | Hero metric decision: mastery + rating elevated everywhere; XP demoted to detail | M | M |
| 74 | Achievement "almost there" nudges (80% progress surfaced contextually) | M | S |
| 75 | End-of-season XP→cosmetic conversion (sink that resets economy pressure) | M | M |

### Trust, parents, schools, business (76–90)
| # | Opportunity | Imp | Eff |
|---|---|---|---|
| 76 | Publish Privacy Policy/ToS in-app + web; counsel review | H | S |
| 77 | Complete the DPIA; document profiling basis | H | M |
| 78 | Parent progress email (no dashboard needed — start with email) | H | M |
| 79 | "Your data" screen: what's stored, what's not, export + delete buttons | M | M |
| 80 | Market the privacy posture (landing page pillar; store listing) | M | S |
| 81 | Standards mapping export (concept ↔ CCSS) | M | M |
| 82 | Fake-door pricing test on the landing page | H | S |
| 83 | Freemium line design doc: what's free forever (all learning) vs. paid (cosmetics, recaps, parent reports) | H | M |
| 84 | Play Billing integration behind a feature flag | M | L |
| 85 | Teacher one-pager PDF + pilot offer | M | S |
| 86 | Class code join flow (one teacher, 30 kids, zero infra beyond a group) | H | L |
| 87 | Accessibility conformance doc (VPAT-lite) once WCAG pass is done — a school sales asset | M | M |
| 88 | COPPA decision: block <13 or build verifiable consent | H | M |
| 89 | Trust center page (uptime, security practices, data handling) | L | S |
| 90 | "Report a problem" on every exercise (content QA + trust signal) | M | S |

### Platform & engineering (91–100)
| # | Opportunity | Imp | Eff |
|---|---|---|---|
| 91 | CI pipeline (server tests + lint + assembleDebug + Robolectric on push) | H | S |
| 92 | Server-generated alt text for math from the problem AST (a11y unlock nobody else has cheap) | H | M |
| 93 | Native math rendering spike (replace per-instance WebViews) | M | L |
| 94 | Offline practice pack (pre-generated problems cached client-side) | M | L |
| 95 | Robolectric tests for the top-10 new screens | H | L |
| 96 | Off-machine backup sync | H | S |
| 97 | SymPy worker pool + complexity caps | M | M |
| 98 | Job-lock for lifecycle sweeps (multi-instance safety) | M | S |
| 99 | /healthz + uptime ping + error-rate alert | M | S |
| 100 | String extraction to resources (i18n foundation) | M | L |

---

## 6. Deliverable 3 — Top 50 UX issues

| # | Issue | Sev | Imp | Eff | Recommendation |
|---|---|---|---|---|---|
| 1 | Launch token validation treats network failure as auth failure → clears valid token, strands user at Login ([Navigation.kt](../android/app/src/main/java/com/example/numera/Navigation.kt) catch block) | 🔴 | H | S | Branch on 401 vs IOException; keep token on network errors; show offline state |
| 2 | Cold start lands on Login then *jumps* to MainTabs after network round-trip — visible flash + perceived slowness | 🟠 | M | S | Splash/loading state until token check resolves |
| 3 | Signup before any value (no guest path) | 🔴 | H | M | Guest mode |
| 4 | 9-step onboarding; each transition a drop-off cliff | 🟠 | H | M | Cut to ≤5 steps |
| 5 | Notification permission requested for a push system that isn't live | 🟠 | M | S | Hide step until FCM works |
| 6 | No single "what should I do now?" — 4+ competing surfaces | 🟠 | H | M | "Today" composer card at top of dashboard |
| 7 | Arena: 7 modes, no default — choice paralysis before every competitive session | 🟠 | H | M | Hero Play button with smart routing |
| 8 | Empty realtime queue = spinner with no promise of resolution | 🔴 | H | M | Timeout → bot match, always |
| 9 | Empty states across clubs/discussion/tournaments likely blank at 0 population | 🟠 | M | M | Invitation-style empty states |
| 10 | Out-of-hearts dialog interrupts learning at the moment of maximum frustration | 🟠 | M | M | Soften: review-to-restore path (watch worked example → +1 heart) |
| 11 | Raw server `err.message` shown in client errors — technical, unhelpful, occasionally leaky | 🟡 | M | S | Friendly error map |
| 12 | No offline handling anywhere: server down = every screen errors | 🟠 | M | L | Global offline banner + cached last-good data |
| 13 | Typed answer input lacks a math keyboard (fractions/exponents painful on stock keyboard) | 🟠 | H | M | Custom input pad |
| 14 | Decimal-comma input likely rejected (locale) | 🟠 | M | S | Normalize in equivalence |
| 15 | Settings is a 2,129-line screen — almost certainly an unscannable wall | 🟡 | M | M | Group into sub-pages with search |
| 16 | Profile overloaded: identity + mastery + skill tree + recap + plans in one screen (1,724 lines) | 🟡 | M | M | Split into Profile / Progress |
| 17 | No confirmation of *why* rating changed after a duel | 🟡 | M | S | Elo-delta breakdown |
| 18 | Bot matches may not be clearly labeled as bots | 🟠 | H | S | Always disclose |
| 19 | Quest progress not visible from the gameplay screen (no "2/5 toward today's quest" during play) | 🟡 | M | S | Subtle quest ticker on recap |
| 20 | Recap screen likely lists rewards without next-action ("play again / claim quest / stop here") | 🟡 | M | S | Add a single suggested next step |
| 21 | Daily puzzle, quests, commitments reset timing not surfaced (when do I lose this?) | 🟡 | M | S | Consistent reset countdown copy (no FOMO styling for minors) |
| 22 | Streak loss has no grace UX (freeze exists — is it auto-applied? does the user know?) | 🟡 | M | S | Explicit freeze status + auto-apply notice |
| 23 | Long LazyColumns of math = WebView jank during scroll (archive, library, options) | 🟠 | M | L | Native render or shared WebView |
| 24 | Back behavior across the deep nav stack (tabs → arena → mode → game) unverified | 🟡 | M | S | Test back from every leaf; predictable up/back |
| 25 | Command palette is power-user gold but undiscoverable for the core (young) audience | ⚪ | L | S | Long-press hint once |
| 26 | No undo for destructive actions (leave club, disband, delete collection) | 🟡 | M | S | Confirm + 5s undo snackbar |
| 27 | Friend request flow: decline path unverified end-to-end | 🟠 | M | S | Verify + test |
| 28 | Duel opponent disconnect/forfeit UX unverified (what does the winner see?) | 🟡 | M | S | Explicit "opponent left — you win" state |
| 29 | Tournament "one attempt" rule not communicated before starting (stakes surprise) | 🟡 | M | S | Pre-start confirmation with rules |
| 30 | Async duel turn state needs a glanceable "your move" badge on Arena entry | 🟡 | M | S | Badge counts on hub cards |
| 31 | Club wars scoring rules likely opaque to players | 🟡 | M | S | One-screen "how scoring works" |
| 32 | Onboarding diagnostic length/skip affordance unclear (can an anxious user bail safely?) | 🟡 | M | S | "Skip — start easy" escape hatch |
| 33 | Notification inbox vs toast vs dialog hierarchy (3 channels) may double-notify | 🟡 | L | S | One source of truth, dedupe |
| 34 | Search across content (concepts, items, friends) is palette-only | 🟡 | M | M | Search affordances in Library/Archive |
| 35 | No haptic/sound settings granularity check (mute music vs effects) | ⚪ | L | S | Separate toggles |
| 36 | Shop purchase confirmation + equipped-state feedback unverified for new item types | 🟡 | M | S | Test buy→equip→visible loop |
| 37 | Idempotency on double-tap of reward claims client-side (debounce) unverified | 🟡 | M | S | Disable button during flight |
| 38 | Level map at 53 concepts: does the map communicate the *end*? (cliff at the top) | 🟡 | M | S | "More coming" horizon framing |
| 39 | SRS due-items surface may guilt-stack if ignored for weeks (mountain of 200 reviews) | 🟠 | M | S | Cap daily review asks; auto-amnesty |
| 40 | Mistakes log framing ("your failures") vs growth framing | 🟡 | M | S | Rename/reframe as "power-ups in waiting" |
| 41 | Skill tree readability with 53 nodes + 5 dimensions unverified on small screens | 🟡 | M | M | Cluster by strand; progressive zoom |
| 42 | Weekly recap discoverability (is it pushed or buried in Profile?) | 🟡 | M | S | Surface as a Monday card |
| 43 | Placement results → roadmap step: does it *show* what was placed and why? | 🟡 | M | S | "We're starting you at X because Y" |
| 44 | Learning plan vs quest conflicts (plan says fractions, quest says duels) | 🟡 | M | M | Today composer resolves |
| 45 | No global loading skeleton on tab switch (verify all 5 tabs have skeletons) | ⚪ | L | S | Audit |
| 46 | Library/saved collections: bulk operations absent (delete many) | ⚪ | L | M | Multi-select later |
| 47 | Time-pressure modes need a visible pre-game "ready?" gate (anxiety control) | 🟡 | M | S | 3-2-1 countdown with bail option |
| 48 | In-duel emote/reaction absence is *good* (safety) but winners need a sportsmanlike end-screen ("good game" auto-exchange) | ⚪ | L | S | Auto-GG |
| 49 | Font scale 1.3×+ likely breaks dense cards (duel HUD, shop cards) | 🟡 | M | M | Test + fix top 5 |
| 50 | No "rate the difficulty" micro-feedback to tune the engine with explicit signal | 🟡 | M | S | Occasional 1-tap "too easy/right/too hard" |

---

## 7. Deliverable 4 — Top 50 educational issues

| # | Issue | Sev | Imp | Eff | Recommendation |
|---|---|---|---|---|---|
| 1 | 53-concept catalog: an engaged learner exhausts meaningful new material in weeks | 🔴 | H | XL | ~300-concept middle-school+algebra spine is the bar for "primary learning tool" |
| 2 | No worked examples — the highest-effect-size scaffold for novices is absent | 🟠 | H | M | Faded worked examples per concept |
| 3 | No self-explanation prompts (the second-highest cheap intervention) | 🟠 | H | M | "Why?" MCQs post-answer |
| 4 | Single explanation per concept; no alternative modality on repeated failure | 🟠 | H | M | Second representation auto-offered |
| 5 | No word problems — symbolic-only math doesn't transfer to tests or life | 🟠 | H | L | Word-problem templates with contexts |
| 6 | No multi-step problems — real math is compositional | 🟠 | H | L | Per-step CAS grading |
| 7 | Blocked practice dominates; interleaving (proven superior for retention) not a mode | 🟡 | M | S | Interleaved mixed-review mode |
| 8 | MCQ-heavy modes train recognition, not production (typed input shipped only in some modes) | 🟠 | H | M | Typed-first everywhere; MCQ as scaffold for early mastery only |
| 9 | Distractor quality varies; misconception-targeted distractors exist but coverage per concept unverified | 🟡 | M | M | Audit distractor coverage per concept |
| 10 | Speed pressure (timed modes, rush) can entrench math anxiety for vulnerable learners | 🟠 | M | S | Untimed parallel paths; anxiety-safe defaults for new users |
| 11 | Hearts mechanic punishes productive struggle (errors are the learning signal!) | 🟠 | H | M | Decouple errors from resource loss in learning modes; keep stakes in competitive modes |
| 12 | No formative "checkpoint" assessments per strand (only the entry diagnostic) | 🟡 | M | M | Strand checkpoints gate + celebrate |
| 13 | Mastery decay computed but review *framing* is passive (SRS list, not a mission) | 🟡 | M | S | Decay heatmap + "rescue mission" framing |
| 14 | Transfer dimension is earned-only and rare — most users may never see transfer tasks | 🟡 | M | S | Schedule transfer attempts into the Today plan at mastery thresholds |
| 15 | No calibration training (knowing-what-you-know is a meta-skill worth teaching) | 🟡 | M | M | Confidence slider + calibration stat |
| 16 | Estimation/number-sense practice missing as a mode (the foundation of all strands) | 🟡 | M | M | Estimation mini-game |
| 17 | Visual coverage: 9 visual types over 53 concepts — most concepts have no manipulative | 🟠 | M | L | Priority manipulatives: algebra tiles, area model, fraction circles, coordinate plane |
| 18 | Lessons not connected to the visuals (lesson text and manipulative live in separate moments) | 🟡 | M | M | Embed the manipulative inside the lesson's representations section |
| 19 | No spaced *lesson* review — SRS covers problems, not concept re-exposure | 🟡 | M | S | Micro-lesson refreshers in review sessions |
| 20 | Socratic probes exist in solo only (verify); wrong answers in other modes get plain feedback | 🟡 | M | M | Extend misconception probes to practice modes post-session |
| 21 | Explanation quality is template-generated; no learner rating of explanations | 🟡 | M | S | "Did this help?" on explanations; cull the worst |
| 22 | No reading-level control on lesson text (young/EAL learners) | 🟡 | M | M | Two text registers per lesson |
| 23 | No audio narration (modality + accessibility) | 🟡 | M | M | TTS lessons |
| 24 | Math vocabulary never explicitly taught (numerator, coefficient, etc.) | 🟡 | M | M | Glossary chips inline in lessons |
| 25 | Achievement/quest incentives reward volume, not learning quality (solve N problems) | 🟡 | M | M | Mastery-gain quests ("raise fluency on any concept") |
| 26 | The diagnostic's placement accuracy is unmeasured (no follow-up validation that placement was right) | 🟡 | M | M | Track week-1 accuracy by placement; auto-adjust |
| 27 | No learning-science transparency for the user ("why review now?" "why this problem?") | 🟡 | M | S | One-tap why explanations |
| 28 | Daily puzzle difficulty for the whole population (one puzzle, all levels) — frustration at extremes (verify rotation logic) | 🟡 | M | S | Difficulty bands by user level |
| 29 | Wrong-answer review timing: immediate explanation may pre-empt productive struggle | 🟡 | M | S | Offer "try again" before reveal (verify current behavior) |
| 30 | No goal-progress feedback loops on learning plans (am I on track for June?) | 🟡 | M | M | Plan burn-down with weekly checkpoints |
| 31 | Units/measurement absent as content (and grading has no unit-awareness) | 🟡 | M | L | Units strand + unit-aware equivalence |
| 32 | Negative-number misconceptions need richer treatment (sign errors are the #1 algebra blocker) | 🟡 | M | M | Dedicated misconception ladders for sign rules |
| 33 | Fraction division taught procedurally? Verify "why invert-and-multiply" intuition exists in lesson | 🟡 | M | S | Audit lesson; add visual model |
| 34 | No cumulative review guarantee — a concept mastered in week 1 may never reappear if SRS lapses | 🟡 | M | S | Floor: every mastered concept reappears ≤ every N weeks |
| 35 | Competitive modes may rehearse errors at speed (no post-game review of missed problems) | 🟠 | M | S | Post-duel "review your misses" (one tap into mistakes flow) |
| 36 | No early-numeracy floor (below integer arithmetic) — locks out younger siblings/strugglers | 🟡 | M | L | K-3 strand later; know your floor explicitly |
| 37 | English-only math language (locale conventions: decimal comma, division notation ÷ vs :) | 🟡 | M | M | Locale-aware rendering + grading |
| 38 | No teacher-assignable practice even informally (a teacher can't point at content) | 🟡 | M | M | Shareable concept links |
| 39 | The "independence" mastery dimension penalizes hint use — may teach hint-avoidance over help-seeking | 🟡 | M | S | Frame hints as smart strategy early; independence weight grows later |
| 40 | No spaced parental/learner reporting of *learning* (reports exist for activity) | 🟡 | M | M | "What I can do now" concept-language reports |
| 41 | Puzzle Rush content at low ratings may go sub-floor (too-trivial repetition) (verify) | ⚪ | L | S | Floor difficulty |
| 42 | No deliberate-practice framing for fluency (target: speed at 95% accuracy, not speed alone) | 🟡 | M | S | Gate speed targets on accuracy |
| 43 | Lesson completion is passive (read = done) — no comprehension gate | 🟡 | M | S | One check-question per lesson section |
| 44 | No error taxonomy shown to learners ("you tend to slip on borrowing") — the engine knows, the learner doesn't | 🟠 | M | M | Personal misconception profile, kid-friendly language |
| 45 | Streak/quest pressure can push quantity-over-care answering (guess-spam) | 🟡 | M | S | Accuracy floors on quest credit |
| 46 | No mixed-strand cumulative exam mode (test-readiness) | 🟡 | M | M | "Checkpoint exam" generator |
| 47 | Skill tree shows structure but not *recommended next* (analysis vs. guidance) | 🟡 | M | S | "Best next concept" glow from teachingEngine |
| 48 | Generated numbers may produce pedagogically poor instances (ugly fractions early, trivial duplicates) — template constraints unverified per concept | 🟡 | M | M | Per-concept number-range audits |
| 49 | No celebration of *learning* events (mastery-up) at parity with *activity* events (streak) | 🟡 | M | S | Mastery-up = the biggest celebration in the app |
| 50 | No longitudinal learning evidence (does Numera work? no effect data, even self-measured) | 🟠 | H | L | Instrument pre/post per strand; the future marketing asset |

---

## 8. Deliverable 5 — Top 50 design issues

| # | Issue | Sev | Imp | Eff | Recommendation |
|---|---|---|---|---|---|
| 1 | No brand identity: no character, world, voice, or visual signature — premium-generic | 🟠 | M | L | One identity decision, carried everywhere |
| 2 | ~12 new screens shipped with zero design QA pass — consistency drift guaranteed | 🟠 | M | M | One design-review sprint over the new surface |
| 3 | Math in WebViews renders with different type metrics than the app's typography | 🟡 | M | L | Native renderer or matched font config |
| 4 | Color-only state signaling violates both a11y and visual clarity | 🟠 | H | M | Icon+shape+text redundancy |
| 5 | No reduced-motion respect amid heavy animation | 🟠 | M | S | Honor animator scale |
| 6 | Empty states undesigned for the 0-population reality (most-seen screens at launch) | 🟠 | M | M | Invitation-style empty states |
| 7 | Celebration moments are confetti-generic; nothing screenshot-worthy | 🟡 | M | M | One signature moment (mastery-up) |
| 8 | Rarity system (Common→Mythic) visual differentiation beyond color unverified | 🟡 | L | S | Distinct frame silhouettes per tier |
| 9 | Icon system mixes PremiumIcons (custom) with Material icons — verify consistent stroke/weight | 🟡 | M | M | Icon audit; one family per context |
| 10 | Typography hierarchy on dense screens (duel HUD, shop cards) unaudited at small sizes | 🟡 | M | S | Type ramp audit |
| 11 | Dark-only theme? Verify light mode exists/works — kids in bright classrooms need it | 🟡 | M | M | Light theme pass if absent |
| 12 | Contrast of secondary/tertiary text on dark surfaces unaudited | 🟡 | M | S | Token-level contrast check |
| 13 | Touch targets on small icon buttons unaudited | 🟡 | M | S | 48dp minimum sweep |
| 14 | Spacing-token adoption complete on split screens but new screens (onboarding, arena modes) unverified | 🟡 | L | S | Token lint on new files |
| 15 | Font-scale resilience unaudited (sp + container growth) | 🟡 | M | M | 1.3×/2× test pass |
| 16 | Onboarding visual polish vs main-app mismatch risk (new "cinematic" skin vs app skin) | 🟡 | L | S | Shared token audit |
| 17 | Loading states: branded loaders exist — verify coverage on new screens | ⚪ | L | S | Audit |
| 18 | Long-list density (archive, leaderboards): rows likely uniform-height heavy cards — scan cost | 🟡 | M | M | Compact row variants |
| 19 | The 5-tab bar + per-tab deep stacks: tab icons' active/inactive affordance unverified | ⚪ | L | S | Audit |
| 20 | Skill tree visual encoding of 5 mastery dimensions risks unreadable rainbow | 🟡 | M | M | One dimension primary; others on detail view |
| 21 | Numerals legibility in math contexts (1/l/7, 0/O) — font choice for math-heavy UI | 🟡 | M | S | Tabular, disambiguated numerals |
| 22 | LaTeX size in MCQ options vs question (hierarchy) unverified | ⚪ | L | S | Audit |
| 23 | Avatar/cosmetic art quality ceiling: programmatic art only — shop items may all look "same-y" | 🟡 | M | L | A few hero hand-crafted items per season |
| 24 | Duel screen drama: the signature competitive moment needs presence (vs. opponent intro, countdown) | 🟡 | M | M | Match-intro beat |
| 25 | Recap screens (game, weekly, war) each invented separately — verify shared layout grammar | 🟡 | L | M | One recap pattern |
| 26 | Toast/snackbar/dialog/banner hierarchy: 4 feedback channels need rules | 🟡 | M | S | Feedback decision tree in DesignSystem.md |
| 27 | Motion language: durations/easings tokenized (Motion.kt new) — verify adoption on old screens | ⚪ | L | M | Migrate gradually |
| 28 | Sound design: ToneGenerator-style feedback vs branded earcons | ⚪ | L | M | 3–5 signature sounds |
| 29 | Haptics map (success/fail/heavy moments) consistency unverified | ⚪ | L | S | Haptic audit |
| 30 | Number formatting consistency (1,000 vs 1000 coins; 12.5K) across screens | ⚪ | L | S | One formatter |
| 31 | Countdown timers styled as FOMO (red, pulsing) — minors ethics + visual noise | 🟡 | M | S | Calm countdown style |
| 32 | Shop "dynamic discount" presentation pattern is a dark-pattern flag from your own audit | 🟠 | M | S | Honest pricing presentation |
| 33 | Level map (1,332 lines) visual scalability past ~50 nodes (scroll fatigue, landmark absence) | 🟡 | M | M | Strand landmarks/chapters |
| 34 | Profile identity hub vs Progress data: one screen serving two jobs | 🟡 | M | M | Split |
| 35 | Achievement card states (claimed/claimable/locked/hidden) — 4-state visual clarity | 🟡 | M | S | Distinct, testable states |
| 36 | Club war scoreboard: team color systems vs rarity colors collision | ⚪ | L | S | Reserve a team palette |
| 37 | Onboarding progress indicator: 9 dots reads as "long" — design admits the length problem | 🟡 | M | S | Fewer steps; chunked indicator |
| 38 | Placement test question transitions (abrupt vs. paced) affect anxiety | ⚪ | L | S | Gentle transitions, no timer visible |
| 39 | Error/feedback banner animation blocks interaction timing (tests needed waitForIdle — users feel it too) | 🟡 | M | S | Non-blocking banner |
| 40 | Math keyboard absence forces stock keyboard styling mismatch in typed modes | 🟡 | M | M | Custom pad (also UX-13) |
| 41 | Icon-only buttons without labels in dense bars (tool buttons in gameplay) — learnability | 🟡 | M | S | Labels or first-use hints |
| 42 | Card elevation/border language: glass cards + outlined + filled — 3 container dialects (verify) | ⚪ | L | M | Container decision rules |
| 43 | Leaderboard self-row emphasis (find yourself instantly) unverified | ⚪ | L | S | Pin own row |
| 44 | Confetti/particle overuse risk across many reward moments — diminishing returns | 🟡 | L | S | Reserve particles for top-tier events |
| 45 | Screenshot test net absent — visual regressions invisible (Paparazzi/Roborazzi) | 🟡 | M | M | Add snapshot tests for key components |
| 46 | App icon/store identity unreviewed (first brand touch) | 🟡 | M | S | Icon polish round |
| 47 | Notification inbox visual priority (read/unread/action) unverified | ⚪ | L | S | Audit |
| 48 | i18n text expansion headroom (German +30%) not designed for | ⚪ | L | M | Flexible containers with extraction |
| 49 | Tablet layout = stretched phone (verify) | 🟡 | L | M | Two-pane for tablet later |
| 50 | Design documentation drift: DesignSystem.md must absorb Motion/Rarity tokens + new patterns before they fragment | 🟡 | M | S | Doc update with the new tokens |

---

## 9. Deliverable 6 — Top 50 technical issues

| # | Issue | Sev | Imp | Eff | Recommendation |
|---|---|---|---|---|---|
| 1 | No CI — all green-ness depends on remembering to run tests locally | 🟠 | H | S | GitHub Actions on push |
| 2 | ~54 modified + new files uncommitted in the working tree | 🟠 | M | S | Commit in slices now |
| 3 | Launch-time token clear on network failure (also UX-1) — a correctness bug | 🔴 | H | S | 401-only clearing |
| 4 | Android tests: 17 files / 104 source files; every post-06-07 screen untested | 🟠 | H | L | Robolectric for top flows |
| 5 | Backups never leave the machine | 🟠 | H | S | Off-machine sync |
| 6 | No crash reporting | 🟠 | H | M | Self-hosted Sentry/ACRA |
| 7 | No metrics/alerting (server could be down for days unnoticed) | 🟠 | M | S | /healthz + ping monitor |
| 8 | SymPy: process-per-call; Python a silent prod dependency; 8s CPU burn × 30/min/user rate-limit = DoS margin | 🟡 | M | M | Worker pool, complexity cap, deploy-time dependency check |
| 9 | One WebView per MathText in lists — memory/jank under scroll | 🟠 | M | L | Shared renderer/native |
| 10 | SettingsScreen 2,129 / ProfileScreen 1,724 / LevelMapScreen 1,332 lines — God files regrowing against the project's own rule | 🟡 | M | M | Split by responsibility |
| 11 | Socket event rate-limiting unverified (answer spam, queue flapping) | 🟡 | M | S | Per-socket token bucket |
| 12 | Lifecycle jobs lack a multi-instance lock (duplicate notification sends if scaled) | 🟡 | M | S | DB job lock |
| 13 | In-process idempotency store breaks with >1 instance (documented; restating as the first scaling tripwire) | 🟡 | L | M | Move to DB/Redis when scaling |
| 14 | Tournament shared problem set across async window (answer sharing) | 🟡 | M | M | Per-entrant sets |
| 15 | Anti-cheat is timing-only; no statistical screens, no attestation | 🟡 | M | L | Post-hoc anomaly screens pre-reward |
| 16 | Raw error messages to clients (`err.message` passthrough in routes) | 🟡 | M | S | Error-code mapping |
| 17 | Gson models: silent null-defaulting can mask API drift (no schema validation client-side) | 🟡 | M | M | Required-field assertions on critical models |
| 18 | API surface: 134 endpoints, no versioning strategy (`/api/v1`) — breaking changes will hurt once >1 client version exists | 🟡 | M | M | Version prefix before public release |
| 19 | No request-size/shape validation library on many newer routes (manual checks vary) — audit consistency | 🟡 | M | M | Shared validator middleware |
| 20 | Streak/timezone day-boundary logic untested across TZ/DST | 🟡 | M | S | Unit tests |
| 21 | Locale numeric parsing in answerEquivalence (comma decimals) | 🟠 | M | S | Normalize input |
| 22 | JWT session sweep/expiry housekeeping unverified (stateful sessions table growth) | ⚪ | L | S | Expired-session cleanup job |
| 23 | SQLite WAL checkpoint behavior under long uptime unmonitored (file growth) | ⚪ | L | S | Periodic checkpoint + size log |
| 24 | better-sqlite3/sqlite3 version pinning & rebuild-on-node-upgrade fragility (native module) | ⚪ | L | S | Engines field + lockfile discipline |
| 25 | `interactive_visuals.html` is a single growing asset for all visual types — JS God file risk | 🟡 | M | M | Split renderers; build step optional |
| 26 | WebView JS bridge input validation (specs from server are trusted; fine — but document the trust boundary) | ⚪ | L | S | Note in Security.md |
| 27 | No DB migration *down*/recovery story (a bad migration on the live file = restore-from-backup only) | 🟡 | M | S | Pre-migration auto-backup hook |
| 28 | Test DB isolation good; but no seed-data factory — tests hand-roll users (drift) | ⚪ | L | M | Shared test factories |
| 29 | gradle/AGP on JDK 26 (non-LTS) — known future-upgrade tripwire (documented in CLAUDE.md) | ⚪ | L | S | Pin Temurin 21 preemptively |
| 30 | No ProGuard/R8 config review for release builds (only debug verified) | 🟡 | M | M | Release build + smoke test |
| 31 | APK size/startup time never measured; no baseline profile | 🟡 | M | M | Macrobenchmark + baseline profiles |
| 32 | Cleartext-traffic config fixed, but no certificate pinning (acceptable; document the decision) | ⚪ | L | S | Doc note |
| 33 | Socket.IO reconnect/resume mid-duel behavior under network blips unverified | 🟠 | M | M | Reconnect-with-state test |
| 34 | Server-side duel state on process restart = lost matches (in-memory duel state?) (verify) | 🟡 | M | M | Persist active-duel snapshots |
| 35 | Rate limiter memory growth (per-key buckets) unbounded under bot traffic | ⚪ | L | S | LRU eviction |
| 36 | No dependency vulnerability scanning (npm audit / gradle versions) in any loop | 🟡 | M | S | npm audit in CI |
| 37 | Email mailer credentials/config validation at boot (fail fast vs silent no-send) | ⚪ | L | S | Boot check + log |
| 38 | Push token lifecycle (PushTokenManager new): rotation/expiry/dedupe handling unverified | 🟡 | M | S | Token upsert + invalid-token pruning |
| 39 | Idempotency-key TTL/cleanup unverified (table growth) | ⚪ | L | S | TTL sweep |
| 40 | Achievement seed does `DELETE FROM achievements` then reseed at boot — re-confirm user_achievements FK survival on every boot path (a past data-loss bug class) | 🟠 | H | S | Test: claims survive reboot |
| 41 | Knowledge-graph/achievement target_type drift has no validation test (mastery_calculus etc.) | 🟡 | M | S | Test: every achievement target_type maps to a live concept/category |
| 42 | Robolectric net relies on plain-text problems; math-rendering paths untested in UI tests | 🟡 | M | M | Use the MathText seam to cover one math-rendering test |
| 43 | No contract tests between ApiService models and server responses (drift detection) | 🟡 | M | M | Golden JSON fixtures both sides |
| 44 | logger.js levels good; but no request-ID correlation across a request's logs | ⚪ | L | S | Request-ID middleware |
| 45 | `server.js` still ~1.1k lines holding all Socket.IO duel logic — the last God-file remnant | 🟡 | M | M | Extract `sockets/duel.js` |
| 46 | Client retry policy: no exponential backoff/jitter on failures (thundering herd on server restart) | ⚪ | L | S | OkHttp interceptor backoff |
| 47 | Time source: client clocks untrusted but any client-sent timestamps in telemetry should be flagged (verify integrity engine uses server time only) | 🟡 | M | S | Audit timestamps |
| 48 | No feature flags — every ship is all-or-nothing to all users | 🟡 | M | M | Simple server-driven flag endpoint |
| 49 | DB file path/locking on Windows host for prod use (current host = dev machine; "prod" undefined) | 🟠 | H | L | Define the actual deployment target (VPS) before any real users |
| 50 | Secrets: single JWT_SECRET, no rotation story; .env on dev machine is the only copy | 🟡 | M | S | Document rotation; secret backup |

---

## 10. Deliverable 7 — Top 25 highest-impact improvements (ranked)

1. **Ship push end-to-end** (google-services.json + FCM device service). Built, dark, one
   credential away. Everything retention-shaped depends on it. *Imp H · Eff S.*
2. **Fix the launch token-clear bug** (network ≠ 401). One catch-block; protects every
   session. *Imp H · Eff S.*
3. **Put the app in front of 10–20 real users** (classroom or friends) and fix their top 10
   hits. The entire surface is unvalidated; this reprioritizes everything below. *Imp H · Eff M.*
4. **Guest mode + onboarding cut to ≤5 steps** — value before signup. *Imp H · Eff M.*
5. **Guaranteed match**: queue timeout → disclosed bot, one hero Play button. The arena must
   never spin forever. *Imp H · Eff M.*
6. **CI + off-machine backups + commit the working tree.** Operational floor. *Imp H · Eff S.*
7. **"Today" composer** — one ordered daily plan composed from quests/SRS/plan/commitment.
   *Imp H · Eff M.*
8. **Content sprint to ~150 concepts** (double-then-triple the spine: complete middle school
   + algebra 1). The engine is starving. *Imp H · Eff XL (start now, runs in background).*
9. **Worked examples + self-explanation prompts** — the two highest-effect-size pedagogy
   adds, both cheap. *Imp H · Eff M.*
10. **Economy audit + achievement-catalog regeneration** (faucet/sink model; strand-aligned
    chains; 0-cost badges out of shop). *Imp M · Eff M.*
11. **Accessible math**: server-generated alt text from the AST + contentDescription sweep +
    non-color cues. Uniquely cheap for Numera (it owns the AST). *Imp H · Eff M.*
12. **Crash reporting + product analytics (privacy-safe, self-hosted).** You cannot steer
    blind. *Imp H · Eff M.*
13. **Publish Privacy Policy/ToS + DPIA + COPPA decision.** Required before any real
    distribution. *Imp H · Eff M.*
14. **Landing page + store-listing polish + fake-door pricing test.** Distribution and
    revenue discovery for days of effort. *Imp H · Eff M.*
15. **Hearts ethics rework in learning modes** (errors must not tax struggling learners;
    keep stakes competitive-only). *Imp M · Eff M.*
16. **Math keyboard for typed input.** Typed-first grading deserves a first-class input.
    *Imp H · Eff M.*
17. **Post-duel miss review** — close the compete→learn loop (one tap into mistakes flow).
    *Imp M · Eff S.*
18. **Empty states designed for 0 population** (invitations, seeded content, bot presence).
    *Imp M · Eff M.*
19. **Weekly mega-tournament** — concentrate all liquidity into one recurring event.
    *Imp M · Eff M.*
20. **Mastery-up as the signature celebration** + decay heatmap on the skill tree (make the
    crown-jewel engine *felt*). *Imp M · Eff M.*
21. **Parent progress email.** First parent surface, no dashboard needed. *Imp H · Eff M.*
22. **Comeback flow** for lapsed users (pairs with push). *Imp M · Eff M.*
23. **Robolectric coverage for the top-10 new screens.** *Imp M · Eff L.*
24. **Web client spike** (even read-only progress + one practice mode) — Chromebooks and
    discovery. *Imp H · Eff XL (spike first).*
25. **Monetization line-in-the-sand doc** (free-forever learning; paid cosmetics/reports),
    so every future feature lands on the right side. *Imp H · Eff S.*

---

## 11. Deliverable 8 — Top 10 competitive advantages

1. **The adaptive intelligence stack** — learner model + misconception diagnosis + Socratic
   probes + multi-dimensional mastery + transfer + anti-repetition. Still ahead of every
   incumbent, including the billion-dollar ones.
2. **Chess.com-grade competition for math** — Elo/NRS, seasons, tournaments, rush, async,
   bots, server-authoritative grading, anti-cheat v1. No one else has this. Category-defining
   if liquidity is solved.
3. **CAS-verified content + grading** — SymPy-verified generation and equivalence-based
   typed grading; the trust foundation competitors' MCQ banks lack.
4. **Privacy posture** — no ad/analytics SDKs, local generation, argon2id+MFA, encrypted
   token storage. A marketable parent-facing moat, currently unmarketed.
5. **Infinite, non-repeating practice** — generation + exerciseMemory means no problem-bank
   exhaustion, ever. Enables offline packs and printables for free.
6. **Discovery manipulatives done right** — post-redesign visuals (predict-then-verify, no
   answer revealing) are pedagogically ahead of most "interactive" competitors.
7. **Cheat-resistant transactional economy** — idempotent, server-authoritative, audited.
   The integrity baseline competitive play requires.
8. **Owning the problem AST** — makes accessible math (alt text), step grading, and
   worked-example generation structurally cheap. Competitors with static content can't follow.
9. **Engineering quality and decomposed architecture** — documented, tested (server-side),
   conventioned; ships at extraordinary velocity safely.
10. **The full gamification scaffolding already built** — quests, achievements, leagues,
    seasons, clubs, shop. The (rebalanced) chassis for any future engagement design.

---

## 12. Deliverable 9 — Top 10 missing systems

1. **Live push delivery** (FCM credential + device service) — built but dark.
2. **Real-user feedback loop** — testers, product analytics, crash reporting, in-app report-a-problem.
3. **Revenue system** — payments, entitlements, the free/paid line.
4. **Web client** — Chromebooks, schools, discovery, SEO.
5. **Parent system** — progress emails → dashboard → consent management.
6. **Teacher/classroom system** — class codes, rosters, assignments.
7. **Offline mode** — cached practice packs (uniquely easy with local generation).
8. **Content authoring pipeline at scale** — the path from 53 to 300+ concepts with QA.
9. **Brand identity system** — character/world/voice/sound carried through every surface.
10. **Observability/operations** — CI, monitoring, alerting, off-machine backups, deployment
    target definition.

---

## 13. Deliverable 10 — Top 10 risks

1. **Zero-population death spiral**: social/competitive surfaces look abandoned → new users
   churn → stays empty. *Mitigate: bots-as-citizens, async-first, seeded content, one
   concentrated weekly event.*
2. **Regulatory exposure on minors** (GDPR/Children's Code/COPPA): profiling + engagement
   mechanics + unpublished policies. *Mitigate: publish policies, DPIA, consent decision,
   ethics pass — before distribution, not after.*
3. **Single-machine catastrophe**: dev machine = prod server = only backup location = 54
   uncommitted files. One disk failure erases the product. *Mitigate: commit, push, off-machine
   backups, define a deployment target.*
4. **Validation debt**: the entire new surface has never met a user; a large fraction of
   recent effort may be misaligned with real behavior. *Mitigate: testers + analytics now.*
5. **Content ceiling churn**: engaged users exhaust 53 concepts and leave before any moat
   matters. *Mitigate: content sprint; endless competitive ladder as interim ceiling.*
6. **Trust collapse from a wrong answer marked right (or vice versa)** in competitive play —
   equivalence edge cases (locale commas, ambiguous percents) are the soft spot. *Mitigate:
   equivalence fuzzing, report-a-problem, generous regrade policy.*
7. **Burnout of the sole developer**: feature velocity at this level is not sustainable, and
   the project's bus factor is 1. *Mitigate: ruthless prioritization (fewer, deeper), docs
   already strong.*
8. **Economy inflation** quietly devaluing all rewards as faucets multiply. *Mitigate:
   economy model before adding any further coin source.*
9. **Cheating scandal once stakes exist**: timing-only anti-cheat + second-device solving will
   be defeated the moment rewards matter. *Mitigate: statistical screens, per-entrant sets,
   modest reward stakes until detection matures.*
10. **Monetization retrofit pain**: every week without a free/paid line makes the eventual
    paywall feel like taking things away. *Mitigate: write the line-in-the-sand doc now (#25
    above), even if billing ships much later.*

---

## 14. Final verdict

The 06-07 audit said: *great engine, missing features.* Three days later the features exist —
an astonishing build-out — and the honest assessment moves up a level: **Numera is now a
complete product hypothesis that has never been tested against reality.** The engine remains
the best in its category; the server engineering is genuinely strong; the security posture is
better than incumbents'. What stands between this and a category-leading platform is no longer
mostly code:

1. **People** — testers, then users, then community (everything social is starving without them).
2. **Content** — 53 concepts is a demo catalog; ~300 is a product.
3. **Reach** — push live, a web presence, eventually web/iOS clients.
4. **Honesty about minors** — publish the policies, do the DPIA, soften the loss mechanics.
5. **A business** — decide the free/paid line before generosity becomes precedent.
6. **Operational floor** — CI, crash visibility, off-machine backups, a real deployment target.

The strategic bet from the previous audit stands, sharpened: **stop building new systems;
make the existing ones true** — verified by real users, fed by real content, reachable by
real notifications, and owned by a product that can legally and sustainably grow.
