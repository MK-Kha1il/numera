# Numera — Brand & Identity System

> **Canonical identity reference.** This document is the single source of truth for what Numera
> *feels* like — its world, voice, visual language, motion, and the vocabulary that ties them
> together. It is the audit that diagnosed why the app felt emotionally flat, and the system that
> fixes it. Every new screen, string, color, animation, and reward should be able to point back to
> a principle here. Companion docs: [DesignSystem.md](DesignSystem.md) (the token/component
> mechanics that *implement* this), [CompetitiveEcosystemAudit.md](CompetitiveEcosystemAudit.md),
> [ProductStrategicAudit.md](ProductStrategicAudit.md).

---

## 0. The one-sentence identity

**Numera is the competitive home of math — where math is a sport: you train, you climb the ranked
ladder, and you go head-to-head. The thrill isn't a worksheet finished; it's a rating earned, a rank
defended, and a rival beaten.**

Everything below is downstream of that sentence.

---

## 1. Why the app currently feels dead — the audit

The app is *functionally* rich and *emotionally* mute. The cause is not missing features; it's that
the features were each built well in isolation and never given a shared soul. Concretely:

| Layer | What's there now | Why it reads as dead / generic |
|---|---|---|
| **Visual DNA** | Default theme is literally commented `// Duolingo Theme`; primary is `Color(0xFF58CC02) // Duolingo green`; the core primitives are `DuoButton` / `DuoCard` (312 references across 48 files). | The app's *signature* is borrowed wholesale from another product. A user who has seen Duolingo feels déjà vu, not Numera. There is no color, shape, or mark a person could point to and call "Numera." |
| **Typography** | `FontFamily.SansSerif` everywhere (the OS default). No custom face, no special treatment for *numbers*. | A product about the *beauty of mathematics* renders its numbers in the same anonymous system font as a settings menu. Type is where "premium" and "intelligent" are won or lost, and it's currently neutral-to-absent. |
| **Terminology / ranks** | Competitive ladder is `Bronze · Silver · Gold · Platinum · Diamond · Master · Grandmaster`; Bronze even renders as the 🪵 log emoji. Four separate ladders (learning level, rating, league, club) all reuse the same metal names (flagged in CompetitiveEcosystemAudit §). | This is the *exact* ladder of League of Legends, Valorant, and chess.com. It carries zero meaning specific to mathematics or discovery, and the four-way name collision makes the systems feel like reskins of each other instead of one coherent journey. |
| **Copywriting** | Clear, kind, but voiceless and emoji-led: "Ready for today's math? 🧠", "We miss you at Numera 👋", "Your next level is waiting 🚀", "Complete objectives every day to earn coins and experience points." | This is *generic friendly-app voice*. Swap the logo and it could be any of a thousand apps. Emoji are doing the job that personality should do. Nothing sounds like a specific, coherent voice. |
| **Rewards** | XP + 🪙 coins + ⭐ stars + confetti. "Achievement Completed! 🏆 … Claim it for rewards." | The reward *chrome* (XP/coins/confetti) is the off-the-shelf gamification kit. Rewards are quantitative ("you got +20") not narrative ("you saw something"). They don't mean anything inside a world. |
| **Achievements** | A genuinely good family/tier system exists (`AchievementBadge`: streak/learning/precision/mastery/…). | The *system* is excellent; the *naming and framing* is plain ("Achievement Completed!"). The structure deserves a story it doesn't yet have. |
| **Motion** | A thoughtful `Motion.kt` already exists: decelerate-in, accelerate-out, reward overshoot spring. | This is a real strength — but it's "good generic Material motion." It expresses *politeness*, not *discovery*. Nothing in the motion language says "a pattern is resolving." |
| **Onboarding** | Streamlined 5-step solve-first flow; copy is warm ("That's your first win."). | The best-written surface in the app — but it introduces *mechanics* (level, goals, habit) without introducing a *world*. The user learns what the app does, never where they are. |
| **Progression** | XP→levels, mastery dimensions, ranks, league, season — all real, all server-authoritative. | Five parallel progress meters that don't ladder into one feeling. The user is "leveling up" in five disconnected ways instead of advancing along one legible arc. |
| **Profile** | Identity hub with title, rank card, collection, growth insights. | Strong bones. But it presents *stats about a user* rather than *a portrait of a mind* — it's a dashboard, not a self. |
| **Item shop** | Rarity system (Common→Mythic), dark premium surfaces, equippable cosmetics, themes. | Mechanically premium. But cosmetics decorate *nothing* — they're vanity floating free of a world. A theme called "Crimson Nebula" is pretty and arbitrary; it isn't *about* anything. |
| **Notifications** | A mature, even *ethically* careful funnel (burnout-aware streak nudges — genuinely excellent). | Voice is generic re-engagement ("We miss you 👋"). The care is in the logic; none of it is in the personality. |

**The throughline:** Numera has world-class *systems* wearing a *borrowed, voiceless skin*. The fix
is not more features. It is to give the existing systems one shared world, one voice, one visual
signature, and one progression story — derived entirely from what the app already is.

---

## 2. The world — math is a sport

Numera's world is a **competitive game**, in the lineage of chess.com and Rocket League: a ranked
arena where the sport happens to be **mathematics**. Everything else — lessons, the adaptive engine,
the concept graph — is the **training** that builds the edge you bring to the match. The product
already says this on its landing page ("the competitive home of math"); the app should *feel* it.

The world has two places, and the user should always know which one they're in:

> **The Arena is the main stage** — ranked duels, tournaments, live rooms, leaderboards, and seasons.
> Stakes, rating, rivals. **Training is the back room** — solo practice, lessons, and the adaptive
> engine that hunts your weak spots so you lose fewer matches. You train to climb; you climb in the
> Arena. Your skill map (the concept graph) is the record of what you've trained.

How every pillar serves the competitive center (nothing invented — just re-ranked):

| Pillar | Its place in the world |
|---|---|
| **Competition** | The main stage — ranked duels, tournaments, leaderboards, seasons. The reason you open the app. |
| **Progression** | Climbing the **Bronze→Grandmaster** ladder, season over season — the spine everything hangs on. |
| **Mastery** | The skill you bring to a match: earned in training, *proven* in the Arena. |
| **Mathematics** | The sport itself — the thing you're actually competing at. |
| **Adaptive intelligence** | Your training partner — it finds the weakness that's costing you matches and drills it. |
| **Discovery** | Training: the "aha" that turns into a competitive edge. |
| **Visual learning** | How you drill a weak spot until it's a strength you can rely on under pressure. |
| **Collections** | Your kit — banners, titles, rank cards, cosmetics that broadcast rank and history. |
| **Premium quality** | A clean, high-stakes competitive product (chess.com-premium) — never gamey or cheap. |

Place-names (use consistently; see §6 vocabulary):

- **The Arena** — the main stage: ranked play, tournaments, live rooms, leaderboards, seasons. (Keep.)
- **Training** / **your skill map** — solo practice, lessons, the adaptive engine, and the concept
  graph that records what you've trained (today the "Level Map / Archive").
- **The Workshop** — the shop & collection, reframed as your *kit / loadout*, not a vending machine.

---

## 3. Voice & personality — competitor to competitor

Numera has **no narrator character** — it speaks the way a serious competitive game speaks: directly,
to a competitor. Confident and sharp, never hype, never cheesy. It respects skill, names the stakes,
and keeps its sportsmanship (the app already *enforces* fair play — the voice should sound like it
means it).

| Trait | Means | So we… | We never… |
|---|---|---|---|
| **Competitive** | the stakes are real | name the rating, the rank, the rival, the streak | pretend it's "just practice" or hand out hollow praise |
| **Sharp** | precise and confident | write short, exact, punchy lines | waffle, over-explain, or coddle |
| **Sportsmanlike** | skill earns respect; fair play is the rule | credit a good play, frame a loss as a rematch | trash-talk the user, gloat, or shame a mistake |
| **Premium** | high-stakes, not gamey | let the stakes carry the weight; show restraint | neon hype, "INSANE!!!", ALL-CAPS, confetti spam |
| **Trustworthy** | honest competition | show real ratings, real matchmaking, visible anti-cheat | pass bots off as humans or rig the odds |
| **Energizing** | pulls you into the next match | "one more," "climb," "defend your rank" | manipulative FOMO or guilt-trips |
| **Intelligent** | it's *math* — respect the mind | treat the user as a capable competitor | dumb it down |

**The feeling test for any copy/screen/animation:** does it move the user toward one of these four
inner sentences? If not, cut or rework it.

> "I'm training to win." · "I can climb." · "I earned this." · "I belong in this arena."

**Hard nos** (still true, and now load-bearing — premium-competitive means *not* Rocket-League-neon):
childishness · excessive hype · generic school software · corporate dashboards.

---

## 4. Visual language

The recognizable style = **soft, tactile precision in warm light** — the "Studio" direction. Three
building blocks.

### 4.1 The mark & motif — *the rank crest + the skill map*

Two reusable atoms. **(1) The rank crest** — a clean, collectible insignia per tier (Bronze→
Grandmaster) with real material treatment; it's the hero mark of a competitive product and shows up
on the profile, match HUD, share cards, and leaderboards. **(2) The skill map** — a quiet
node-and-line graph (ideas joined by thin lines; a dot *active* in indigo, *mastered* in amber),
rendered calm and flat (hairline strokes on warm paper, never glowing), used wherever we show what
someone has trained. They appear as:

- the app icon / wordmark accent (an *N* whose strokes resolve into a few connected nodes),
- rank crests on every competitive surface (dashboard, profile, match, leaderboard, share card),
- a restrained ambient texture (replacing the busy `CinematicMathBackground`) that subtly *reflects
  real progress*,
- section dividers, empty states, loading states.

Supporting motif vocabulary, all drawn from **mathematical beauty / geometry**: the grid, the curve,
the golden-ratio spiral, the compass-arc, symmetry/reflection, tessellation. Use them as *quiet
texture*, never decoration-for-decoration's-sake.

### 4.2 Color — the indigo→amber arc

The most important identity decision: **retire Duolingo green as the brand signature.** Green stays
only as the *semantic "correct" feedback* color, where it's conventional and fine. The brand is a
warm, restrained "Studio" palette carrying a two-tone emotional arc:

| Role | Color | Meaning | Notes |
|---|---|---|---|
| **Surface / ground** | **Studio Off-White** `#FBFAF8` (warm) + white cards on soft shadow | the calm, premium canvas | warm light, gentle real depth — never glow |
| **Ink / text** | **Graphite Ink** `#23262B` | confident, readable | not pure black |
| **Brand / active** | **Studio Indigo** `#4C5BA6` (muted) | discovery, in-progress, the active idea | the ownable signature; calm, intelligent, distinct from green |
| **Earned / mastery** | **Amber** `#D99A4E` (warm) — the existing `MedalGold` / `MilestoneGold` family stays for top-tier medals | warmth you *earn*; a mastered idea | reserved for the earned moment |
| **Feedback green** | keep `CorrectGreen` | "this answer is correct" | demoted from *brand* to *signal* |
| **Feedback red** | keep `WrongRed` | "not yet" | reframe copy around it (see §7) |

**The arc is the product's emotional spine:** in-progress work is *indigo* (cool, active, exploring)
and earned work is *amber* (warm, mastered, yours). Map this everywhere — what's active is indigo,
what's *earned and done* is amber/gold. That gives the whole app one legible color story instead of a
rainbow of unrelated theme hues.

**On the existing 11 themes:** keep them as *skins* (a real, loved feature), but (1) make a flagship
**"Studio" (warm light)** theme the default and the face of the brand (splash, onboarding, Arena,
share cards, store hero), and (2) keep the brighter/darker themes as alternates — the indigo→amber
arc and the type carry the identity across all of them, so a theme swap restyles without breaking the
brand.

**Two surfaces — the lobby and the stadium.** Training surfaces use the warm Studio light (a calm
lobby). Competitive surfaces — live duels, ranked match, tournaments — shift to a focused,
higher-contrast **Arena** surface (deeper ground, indigo-forward, amber/gold for rank and wins) so a
match *feels* like a match. Same palette, raised stakes — the chess.com move, not the neon move.

### 4.3 Typography — make the numbers beautiful

Introduce a real pairing. Two moves, in priority order:

1. **Numbers get a crafted face.** Every numeral the user *earns or competes with* — ratings,
   scores, levels, timers, the math expressions themselves — should be set in a precise
   tabular/mono figure face (e.g. a clean geometric mono such as *JetBrains Mono* / *IBM Plex Mono*,
   or a tabular-figure grotesk). This is the single highest-leverage, lowest-cost identity signal:
   in a *math* product, the digits are the hero, and right now they're the OS default. Tabular
   figures also stop scoreboards from jittering.
2. **UI gets a warm geometric grotesk.** Replace `FontFamily.SansSerif` with a humanist-geometric
   grotesk — precise but soft, premium-not-clinical (e.g. *Inter Tight*, *General Sans*, *Hanken
   Grotesk*). A little personality; never neutral-default, never playful-rounded.

Keep the existing weight/scale ramp in `Type.kt` (it's well-structured); just swap the family and
add a `numeric`/`mono` style token for figures and expressions.

### 4.4 Design principles (the six laws)

Everything visual resolves to these. When two choices compete, the earlier principle wins.

1. **Show the pattern.** Every screen should make some hidden structure *visible* — that's the whole
   promise. Prefer a diagram, a map, a shape over a number or a wall of text.
2. **Earned warmth.** Indigo (cool) is the resting state; amber/gold is reserved for mastery. Never
   spend the warm tone on something unearned — it's the most valuable thing on screen.
3. **Calm is the premium.** Whitespace, restraint, precise geometry. Ceremony only when deserved.
   Quiet beats loud; an app that trusts itself doesn't shout.
4. **Treat them as a mind.** Never childish, never condescending. Speak and design for a capable,
   curious person who simply hasn't seen this *yet*.
5. **One world.** Every feature is a *place* in the same competitive world — same rank language, same
   map motif, same lexicon. No screen should feel like it came from a different app.
6. **Precision in everything.** Tabular numerals, exact alignment, intentional motion, no stray
   `16.dp`. Math people *notice* sloppiness; precision is how we earn "premium" and "trustworthy."

---

## 5. Motion philosophy

`Motion.kt` already has the right bones (decelerate-in, accelerate-out, reward-overshoot). We extend
it from "polite Material motion" to **"a clean play, precisely landed."** Motion communicates *skill,
stakes, and mastery* — crisp and satisfying when a win or rank-up lands, and the feel of a pattern
resolving in training.

Four named primitives (build on the existing easing tokens):

| Primitive | What it does | When | Feeling |
|---|---|---|---|
| **The Trace** | Geometry *draws itself* — a line, curve, or map edge animates into being like compass-and-straightedge construction (stroke-path reveal), instead of fading in. | Revealing a new concept, a worked example, a result. | discovery — *being shown how it's built* |
| **The Warm** | An element warms from indigo→amber with a single soft `rewardSpring` settle (a gentle overshoot, not a flashy glow). | Mastery moments, level/rank up, achievement claim. | earned warmth — *it clicked* |
| **The Settle** | Decelerate into place, no bounce (existing `MotionEasing.enter`). The default for everything informational. | Navigation, content arrival, selection, reflow. | precise, calm, confident |
| **The Link** | A thin line draws between two elements to show a relationship. | Connecting ideas, showing why two concepts relate, post-duel "you both solved X". | the *aha* of connection |

Motion laws:
- **Settle, don't bounce.** Overshoot is a *reward signal* (The Warm), never ambient decoration —
  if everything bounces, nothing feels earned.
- **Reveal, don't pop.** Discovery uses The Trace (drawing), not a fade or a scale-in. This is the
  signature, ownable idiom — most apps fade; Numera *constructs*.
- **Calm baseline, earned ceremony.** The existing rule — codify it. Restraint is the luxury.
- **Honor reduced-motion.** The `MotionManager` gate already exists; Trace/Warm must degrade to a
  crisp cross-fade. Precision includes accessibility.

---

## 6. Vocabulary — the lexicon

One world needs one language. The table below is the canonical lexicon. **Rule: rename for identity
only where it *adds* meaning and keeps clarity; keep the plain word where the plain word is clearer.**
Universally-understood mechanics (XP, streak) keep their plain name in *labels* but get the in-world
framing in *voice*.

| Generic term (today) | Numera term | Surface where it changes | Keep plain when… |
|---|---|---|---|
| "Level up" | keep "Level up"; frame as **"ready for the next rank"** | celebratory copy | the literal level *number* stays "Level" |
| XP / "experience points" | keep **"XP"** — framed as *training progress* | meters, earn copy | universally understood |
| Coins (🪙) | keep **"coins"** | shop, balances | rename only if a clearly better term emerges |
| Streak (🔥) | keep "streak"; frame as **momentum / form** | notification + dashboard voice | the count + flame stay |
| Ranks `Bronze…Grandmaster` | **keep** — Bronze…Grandmaster (see §8) | the competitive rank ladder | the metal ladder stays; premium comes from rendering, not renaming |
| Solo game / practice | **Training** | solo modes, dashboard | the back room that feeds the Arena |
| Duel / ranked game | **Match** (ranked Match) | duel surfaces | — |
| Opponents you've beaten | **rivals** | profile, head-to-head | — |
| "Level Map" / "Archive" | **Your skill map** | the concept-map screen | what you've trained |
| Shop | **The Workshop** — your *kit / loadout* | store entry, title | — |
| "Quests" / "Daily Challenges" | **Daily Drills** | dashboard daily card | training that sharpens you for matches |
| "Achievement Completed!" | **"You earned: \<name\>"** | achievement toast/notification | — |
| Mistakes / "review" | **Post-match review** / keep "Review" | mistakes screen | review losses like a competitor |
| Arena · Famous Puzzles | **keep** — already on-brand | — | — |

Lexicon discipline: a term means *one* thing. Don't let "Master" be simultaneously a learning rank,
a rating tier, and a mastery state — that name-collision is exactly what makes the four progress
systems feel interchangeable (see §8).

---

## 7. Copywriting — voice in practice

Audit verdict: the copy is *clear and kind* (a real asset — keep the clarity) but *voiceless* and
emoji-led. Rewrite to a confident, competitor-to-competitor voice — same clarity, now with stakes and
a point of view. Concrete before/afters using **real strings pulled from the codebase**:

| Where | Now | Competitive rewrite |
|---|---|---|
| Win-back (d1), `lifecycleJobs.js` | "Ready for today's math? 🧠 — A short session is all it takes to keep your skills sharp. Jump back in!" | "The ladder's open. Five minutes of training, then go climb." |
| Win-back (d3) | "We miss you at Numera 👋 — It's been a few days. Come back and pick up right where you left off." | "You've slipped off your peak rating. Win it back?" |
| Win-back (d7) | "Your next level is waiting 🚀 — A whole week off — let's get back to it." | "A week off the ladder — your rank's still yours. Come defend it." |
| Weekly recap | "Your weekly Numera recap 📊 — Here's where you stand: …" | "This week: 12 ranked wins, peak Gold II, +60 rating. Climbing." |
| Daily card, `DashboardScreen.kt` | "Daily Challenges — Complete objectives every day to earn coins and experience points." | "Daily Drills — three quick reps. Sharper for your next match." |
| Achievement, `achievementService.js` | "Achievement Completed! 🏆 — You completed the achievement: \<name\>! Claim it for rewards." | "You earned **\<name\>**. Few players do." |
| Wrong answer (general) | "Incorrect" / red | "Not this time — look again." *(a miss is a rematch, never a "fail")* |
| Onboarding first win (already good) | "That's your first win. This is how momentum starts…" | "First win's on the board. Now let's get you ranked." |

Voice rules, distilled:
- **Name the stakes.** Rating, rank, rival, streak, season — say what's on the line.
- **Short and sharp.** A competitor doesn't waffle. Cut filler; one exclamation mark, rarely.
- **Emoji are seasoning, not personality.** At most one, and only when it earns its place. Cut the
  🔥🧠🚀🎉🏆 reflex.
- **A miss is a rematch, never a "fail."** Red means *look again* and *go again* — never shame.
- **Sportsmanship.** Credit good play; respect the opponent and the user. No gloating, no trash-talk.
- **Premium, not hype.** Let the stakes carry the weight — no "INSANE!!!", no neon, no confetti spam.
- **Honesty as the flex.** Real ratings, real matchmaking, visible anti-cheat, private by design —
  say it plainly; the truth sells harder than hype.

---

## 8. Progression identity — one arc, not five meters

Today five progress systems run in parallel and *share names*, so they feel like reskins:
learning **level**, competitive **rating/rank**, weekly **league**, **club**, and **mastery**
dimensions — and four of them use Bronze…Grandmaster. The fix is to give each a *distinct* in-world
role and ladder them into **one story: Train → Compete → Climb**, with the ranked ladder as the spine.

**The single arc (what the user feels): Train → Compete → Climb.** You train (the warm, indigo skill
map filling in) → you compete (the Arena — real matches) → you climb (up the Bronze→Grandmaster
ladder, season over season). The ranked ladder is the **spine**; every other meter feeds it:

| System | What it really measures | In-world name | Ladder |
|---|---|---|---|
| Competitive rank | the headline — skill proven vs. others | **rank** | Bronze → Silver → Gold → Platinum → Diamond → Master → Grandmaster |
| Learning level | training breadth — how much you've drilled | **training level** / your skill map | Levels 1…N — the training that raises your ceiling |
| Weekly league | this week's effort vs. peers | **Circles** (weekly tiers) | give these their *own* names, NOT metals (e.g. Quartz/Onyx/Aurora…) |
| Mastery dimensions | depth per concept (accuracy/fluency/retention/independence/transfer) | **how warm an idea is** | the indigo→amber fill of each node on the map |
| Season track | the long arc / cosmetics | **the season's chapter** | keep |

**Keep the existing rank ladder** — `Bronze · Silver · Gold · Platinum · Diamond · Master ·
Grandmaster`. The metal ladder is instantly legible, carries earned competitive weight, and is what
the product already wears; renaming it adds churn without adding premium feel. The premium upgrade
comes from how each tier is *rendered* (materials, type, restraint — see §4) and from giving the
*other* progression systems (league, club) their own distinct names so the four ladders stop
colliding — **not** from renaming the core competitive ladder. ("Numerist" stays where it already
lives, as the apex *title* in `lib/titles.js`.)

**Rule going forward:** no two progression systems may share tier names. Name-collision is what made
the competitive ecosystem feel like four reskins of one ladder (see CompetitiveEcosystemAudit §).

---

## 9. Reward principles

- **The rank-up is the headline.** The biggest moment in the app is climbing a tier — and finishing a
  season. Reserve the strongest ceremony for it: bigger than any XP popup, the one celebration that
  earns the full stop.
- **Two-tone rewards.** Training progress reads *indigo* (you sharpened something); competitive wins
  read *amber/gold* (you proved it — a match won, a rank earned, a season closed). The color *is* the
  meaning.
- **Name what you did.** Lead every reward with the act — a win, a clean streak, a weakness fixed;
  the +N is the receipt, not the headline.
- **Restraint is the reward.** Confetti everything and confetti means nothing. Reserve The Warm and
  particles for genuinely earned moments (the onboarding `CelebrateStep` already nails this —
  "Momentum, not noise" — make it the law).
- **Collections broadcast rank & history.** Cosmetics, banners, rank cards, and titles are *how you
  show standing* — what you've climbed and whom you've beaten. Tie every shop item to the competitive
  world (a banner for a season finish, a crest for a peak rank) so spending coins means something.
- **Honest economy.** No fake scarcity, no guilt timers, no pay-to-win in ranked. The notification
  funnel already refuses to FOMO-bait burnt-out users — that ethic is *part of the brand*; extend it
  to the shop and to matchmaking.

---

## 10. Implementation roadmap (phased, low-risk first)

Identity is decided here; this is the order to make it real. Each phase is independently shippable
and verifiable (`gradlew assembleDebug` + Robolectric; `npm test` + lint).

**Phase 0 — Put competition at the center (IA — the pivot's headline).**
- Make the Arena / ranked ladder the app's home and primary nav, with your **rank crest + current
  rating** on the dashboard. Training (solo / lessons / the engine) becomes the clearly-labeled "back
  room" that feeds it. This is structure, not tokens — but it's what makes the app *feel* competitive.

**Phase 1 — Signature (highest impact / lowest risk).**
- Add the typeface pairing: a `numeric`/`mono` figure style + a grotesk UI family in `Type.kt`. Set
  ratings/levels/scores/expressions in the figure face.
- Add **Studio Indigo** + **Amber** as named brand tokens and the warm **Studio** surface palette;
  introduce the flagship **"Studio" (warm light)** theme and make it the default. Demote "Duolingo
  green" to `CorrectGreen` semantic-only (rename the token, drop the comment).
- Replace the busy `CinematicMathBackground` with the calm, flat map texture.

**Phase 2 — Voice & lexicon.**
- Rewrite the lifecycle/notification copy (§7), the onboarding strings, achievement toasts, and the
  daily-card copy to the competitive voice.
- Land the lexicon (§6): "Training," "Match," "Daily Drills," "Your skill map," "The Workshop,"
  "You earned…" (coins keep their name).

**Phase 3 — Progression story.**
- **Keep** the Bronze…Grandmaster rank ladder; instead give league/club their *own* non-metal tier
  names so the four ladders stop colliding. Resolve the name collision without renaming the core rank.
- Render the rank crests with real material treatment (§4.1) and put them everywhere stakes live.

**Phase 4 — Motion & Arena depth.**
- Implement The Trace / The Warm / The Link in `Motion.kt`; give rank-ups and match wins the
  strongest (earned) motion. Add the **Arena** surface expression (§4.2). Reframe the shop/collection
  as your kit / loadout.

**Naming-debt note:** the `Duo*` primitive names (`DuoButton`/`DuoCard`, 312 refs) are internal, not
user-facing — a low-priority rename to `NumeraButton`/`NumeraCard` for self-respect, safe to defer
until a quiet moment (mechanical find-replace + build).

---

## 11. The test

Before merging anything that touches a surface, ask:

1. **World:** does this feel like part of a competitive game (Arena, ladder, season, rank), or a
   generic app screen?
2. **Voice:** confident competitor-to-competitor — clear, with stakes, premium *not* hype?
3. **Color:** indigo for training/active, amber/gold reserved for what's earned (rank, wins)?
4. **Motion:** precise and high-stakes — does a win or a rank-up *land*?
5. **The four sentences:** does it nudge the user toward *"I'm training to win / I can climb / I
   earned this / I belong in this arena"*?

If a screen can't answer these, it isn't done — it's just functional. The whole point of this
document is that "functional" is exactly the problem we're solving.
