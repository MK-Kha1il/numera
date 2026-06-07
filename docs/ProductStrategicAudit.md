# Numera — Comprehensive Strategic & Product Audit

> Scope: full-stack product, market, pedagogy, UX, gamification, social, retention,
> monetization, accessibility, performance & scalability audit (2026-06-07).
> Lens: not "is this a good math app" but "what would it take to be the **leading gamified
> mathematics platform on Earth**", benchmarked against the best product in each category
> (Khan Academy, Brilliant, IXL, Duolingo, Prodigy, Chess.com, Lichess, Discord, Apple,
> Notion, Linear, Spotify). Brutally honest by request. Not legal advice.

---

## 0. The one-paragraph truth

Numera is a **world-class learning-and-competition *engine* bolted to a narrow,
algorithmically-generated, single-track *curriculum*, shipped on one platform, with no
distribution flywheel, no revenue model, and a thin community.** The server-side intelligence
(adaptive difficulty, multi-dimensional mastery, misconception diagnosis, spaced repetition,
Socratic hinting, transfer tasks, anti-repetition, and a genuinely serious Elo+ rating system
with real-time duels) is more sophisticated than what most billion-dollar incumbents ship. But
that Ferrari engine is driving on a go-kart track: the *content* it adapts over is thin and
machine-generated, the *reach* is Android-only with no push notifications and no web, the
*community* can't even decline a friend request, and there is **no way for the product to grow
itself or make money**. The asset is the engine. The liabilities are content depth, platform
reach, community, distribution (schools/parents), and business model. Win those and Numera is
category-defining; ignore them and it's a beautiful tech demo.

---

## 1. Area-by-area audit

Each area: Strengths · Weaknesses · Missing opportunities · Competitive comparison ·
**Impact** (1–10, value of fixing) · **Difficulty** (1–10) · Recommended solution.

### 1.1 Educational quality
- **Strengths:** Concept-first lessons (intuition → why → representations → mistakes →
  connections), a real knowledge graph with prerequisites and misconception labels, symbolic
  validation so no malformed problem is served, answer-leak guards (`lessonSafety`),
  step-by-step explanations.
- **Weaknesses:** *All* content is **locally, algorithmically generated** from templates. No
  expert-authored pedagogy, no video, no worked-example production value, no editorial voice.
  Curriculum is a **single linear level→concept ladder** over a narrow band (percentages,
  linear/quadratic equations, basic geometry, sequences). Accuracy risk is real (a
  LaTeX-corruption bug already shipped garbage answer choices). No standards alignment (Common
  Core / GCSE / state standards).
- **Missing opportunities:** Breadth (K-12 + early college), strand structure (arithmetic →
  algebra → geometry → trig → precalc → calc → stats → discrete), word-problem/applied math,
  proof and reasoning, multi-step projects, real expert review of generated content.
- **Competitive comparison:** Khan = comprehensive K-14, video + practice, standards-aligned,
  Khanmigo AI tutor. Brilliant = exquisitely authored interactive lessons with production
  design. IXL = ~9,000 skills mapped to every US/UK standard with diagnostic. **Numera's
  content breadth is ~1–5% of any of these.** Its *engine* beats all three; its *catalog*
  loses badly.
- **Impact 10 · Difficulty 9.** *Recommended:* Treat content as a first-class product, not an
  emergent property of templates. (a) Expand the knowledge graph to a full strand-based
  curriculum; (b) add a human/LLM-assisted authoring pipeline with expert review and a
  correctness test suite per concept; (c) align to at least one standard set (Common Core) to
  unlock schools; (d) keep generation for *infinite practice variety*, but anchor each concept
  to a vetted canonical lesson + worked examples.

### 1.2 Adaptive learning
- **Strengths:** `learnerModel` ability estimate, `adaptive` difficulty selection from
  mastery+Elo, `retentionEngine` spaced repetition, `misconceptionEngine` diagnosis,
  `teachingEngine` next-action selection, `exerciseMemory` anti-repetition. This is **textbook
  best-practice adaptivity** and is the product's crown jewel.
- **Weaknesses:** The **placement test is a fixed 7–8 hardcoded MCQs, identical for everyone,
  non-adaptive** — the weakest possible front door to the most sophisticated engine in the
  category. Adaptivity operates *within* the thin curriculum, so it can finely tune difficulty
  but can't route a learner across a broad skill map (there isn't one).
- **Missing opportunities:** Adaptive diagnostic (CAT-style branching) on first run; cross-strand
  knowledge tracing (BKT/DKT); "learning path" recommendations; mastery-decay-driven review
  surfacing across the whole graph.
- **Competitive comparison:** IXL's diagnostic continuously places a student across the entire
  curriculum on a real scale; Khan's mastery system spans K-14. Numera's engine is *more
  modern* but is fenced into a paddock.
- **Impact 9 · Difficulty 6.** *Recommended:* Replace the static placement test with an
  **adaptive diagnostic** that uses the existing `learnerModel`/`adaptive` machinery and a
  broad item bank to place learners across strands. This is mostly wiring existing parts to a
  bigger graph.

### 1.3 Personalization
- **Strengths:** Per-user mastery, learning-style signals, calculator/hint/retry analytics,
  burnout/tilt/consistency indices, commitment pacing — an unusually rich learner model.
- **Weaknesses:** Rich *measurement*, thin *actuation*. The app collects frustration/burnout/
  tilt but the visible product still pushes streaks and FOMO timers (the audit's own irony).
  No learner-set goals ("I want to pass my GCSE by June"), no interest-based theming (sports
  math, finance, games), no daily-time personalization.
- **Missing opportunities:** Goal-based plans, "why am I seeing this" transparency, adaptive
  session length based on measured burnout, parent/teacher-set targets.
- **Competitive comparison:** Spotify/Netflix-grade personalization is about *acting* on the
  model (Discover Weekly). Numera measures like a pro and acts like a beginner.
- **Impact 7 · Difficulty 5.** *Recommended:* Close the loop — feed burnout/tilt into session
  pacing and nudge intensity; add explicit goals that reshape the path.

### 1.4 Engagement
- **Strengths:** Deep loop — XP, coins, streaks, daily puzzle, 4 rotating daily quests, leagues,
  achievements with tier chains, shop with daily/featured rotation and dynamic discounts,
  commitment/relics. Structurally this **rivals Duolingo**.
- **Weaknesses:** **No push notifications** (no FCM by design) — Duolingo's entire retention
  machine is notifications; Numera has none, so a lapsed user is simply gone. Engagement
  mechanics (hearts, FOMO countdowns, loss-framed relics) are flagged as **potential dark
  patterns for minors** while the app simultaneously measures the harm. Over-engineered relative
  to content depth — many loops compete for attention over a small problem set.
- **Missing opportunities:** Re-engagement push/email, streak-freeze/repair (Duolingo's genius
  retention valve), variable-reward chests done ethically, "comeback" flows.
- **Competitive comparison:** Duolingo is the world champion of engagement loops *and*
  notifications. Numera has the loops, none of the reach.
- **Impact 9 · Difficulty 4.** *Recommended:* Ship **push + email re-engagement** (the single
  highest ROI retention lever available), add streak-freeze, and run an ethics pass on
  loss-framed/FOMO mechanics for minors.

### 1.5 Retention (long-term)
- **Strengths:** SRS resurfacing, mastery progression, seasons, commitment history give
  long-horizon structure.
- **Weaknesses:** No notifications = no Day-2/Day-7/Day-30 reactivation. No habit anchor
  outside the app. Streak is brittle (loss is punishing, no freeze). No "content treadmill"
  that keeps producing fresh *meaningful* challenge once the narrow curriculum is exhausted.
- **Missing opportunities:** Lifecycle messaging, win-back campaigns, weekly recap email
  ("you mastered 3 concepts, here's your rating graph"), seasonal events.
- **Competitive comparison:** Duolingo/Chess.com retain via notifications + endless content +
  social obligation. Numera lacks all three legs.
- **Impact 9 · Difficulty 5.** *Recommended:* Lifecycle comms + streak insurance + an
  "endless competitive ladder" (rating play scales infinitely even if curriculum is finite).

### 1.6 Progression
- **Strengths:** Genuinely excellent and multi-track: XP/levels, per-concept mastery, coins,
  streak, leagues, **NRS rating (Elo + velocity + tilt + smurf + seasons)**, commitment/relics.
  Few products separate "how much you've done" (XP) from "are you actually learning" (mastery)
  this cleanly.
- **Weaknesses:** **Too many overlapping currencies/tracks** risk confusing the player about
  what matters. Level→concept gating over a thin curriculum means the ladder ends fast.
- **Missing opportunities:** A single legible "north-star" progress narrative; prestige/
  endgame for maxed learners; visible long-term skill tree.
- **Competitive comparison:** Chess.com/Lichess keep millions engaged for *years* on essentially
  one rating number — focus beats sprawl. Numera should pick its hero metric.
- **Impact 6 · Difficulty 4.** *Recommended:* Keep the tracks but **subordinate them to one hero
  progression** (likely mastery for learning + rating for competition) and present a single skill
  tree.

### 1.7 Social systems
- **Strengths:** Friends, leaderboards, public profiles, private-profile enforcement, now basic
  block/report + moderation queue.
- **Weaknesses:** **This is one of the weakest areas.** Friend requests **can't be declined**
  (compliance audit). No chat/DM, no clubs/teams/study groups, no forums, no co-op, no content
  sharing beyond `saved_collections`. Social is "a number on a board," not a community.
- **Missing opportunities:** Clubs/teams with team leagues, study groups, discussion per concept,
  shared problem sets, mentor/mentee, social proof on profile.
- **Competitive comparison:** Chess.com = clubs, forums, messaging, team matches; Discord =
  living communities; Reddit-style = peer help and content gravity. Numera is at "leaderboard
  with usernames" — roughly a decade behind.
- **Impact 8 · Difficulty 7.** *Recommended:* Build **clubs/teams + per-concept discussion +
  a real friend graph (accept/decline/DM with safety controls)**. Community is the cheapest
  durable moat and the strongest retention force after notifications.

### 1.8 Competition systems
- **Strengths:** **The standout differentiator.** Real-time Socket.IO 1v1 duels + matchmaking +
  a serious rating system (velocity, tilt, smurf detection, seasons, peak tracking). This is
  **Chess.com/Lichess-grade thinking applied to math, which essentially no one else has done.**
- **Weaknesses:** Only 1v1 duels. No tournaments, no async/correspondence play, no spectating,
  no team matches, no game variants (blitz/bullet/puzzle-rush), no anti-cheat beyond smurf
  signals (math is uniquely cheatable with a second device — a real threat).
- **Missing opportunities:** Tournaments/arenas, "puzzle rush" time-attack ladder, daily ranked
  seasons with rewards, spectator + replay, team/club wars, bot opponents at calibrated rating.
- **Competitive comparison:** Lichess/Chess.com have tournaments, arenas, variants, bots,
  spectating, anti-cheat. Numera has the rating brain but a thin game-mode catalog.
- **Impact 9 · Difficulty 6.** *Recommended:* Lean into this moat hard — **tournaments, puzzle-
  rush, async play, and a credible anti-cheat story** ("the math Chess.com" is a defensible
  category position).

### 1.9 Mastery systems
- **Strengths:** Multi-dimensional mastery (accuracy, fluency, retention, independence, transfer)
  — genuinely ahead of the field. Transfer tasks (novel-context application) are rare and
  pedagogically gold.
- **Weaknesses:** Mastery is computed beautifully but **underexposed** to the learner (one
  Profile card). Per-concept mastery can't ladder into a broad visible map because the map is
  small.
- **Missing opportunities:** A Khan-style mastery wall/skill tree, mastery challenges, "mastery
  decay" review prompts, shareable mastery credentials/certificates.
- **Competitive comparison:** Khan's mastery system is the gold standard for *visibility +
  breadth*; Numera's is more *dimensionally rich* but invisible and narrow.
- **Impact 7 · Difficulty 5.** *Recommended:* Surface mastery as the **hero learning view** (skill
  tree colored by the 5 dimensions) and add mastery-decay review across the graph.

### 1.10 Emotional design
- **Strengths:** Sound + haptics managers, animated feedback banners, glass cards, debrief
  moments, polish components (toasts, skeletons, optimistic UI).
- **Weaknesses:** **No brand character/identity.** Duolingo has Duo; Prodigy has wizards;
  Brilliant has a distinctive intellectual aesthetic. Numera reads as a competent Duolingo
  *reskin* with no soul of its own. Loss-framed mechanics (out-of-hearts, relic loss) create
  *negative* emotion in a learning context where that's risky for kids.
- **Missing opportunities:** A mascot/world/narrative, celebration moments worth screenshotting,
  emotionally intelligent pacing (ease off when tilt/burnout is high).
- **Competitive comparison:** Apple/Spotify/Duolingo win on *feel*. Numera has the components
  but not the identity.
- **Impact 6 · Difficulty 6.** *Recommended:* Invest in a **distinctive brand identity + a
  signature delight moment**, and make emotional pacing react to the burnout/tilt signals you
  already compute.

### 1.11 Visual design
- **Strengths:** Token-driven design system (Spacing/CornerRadius/IconSize/Color tokens),
  Material3, a classified component library, consistent theming.
- **Weaknesses:** Derivative aesthetic; color-only state signaling (accessibility + identity
  problem); math rendered in a WebView (visual inconsistency risk, perf, a11y). No distinctive
  visual language.
- **Missing opportunities:** A proprietary type/color/illustration system; native math rendering;
  motion language.
- **Competitive comparison:** Linear/Notion/Apple set the bar for *taste*. Numera is "clean,"
  not "memorable."
- **Impact 5 · Difficulty 5.** *Recommended:* Commission a real visual identity; move math to a
  native, accessible renderer.

### 1.12 Accessibility
- **Strengths:** Some `contentDescription`; design tokens make a contrast pass feasible.
- **Weaknesses:** **Serious.** Math is a KaTeX **WebView — opaque to screen readers** (no MathML/
  alt text); state signaled by **color alone**; `contentDescription` in only ~12 files; no
  documented WCAG/TalkBack testing; touch-target sizes unaudited.
- **Missing opportunities:** Accessible math (MathML/alt text/audio), non-color state cues,
  dyslexia-friendly mode, full TalkBack support, dynamic type.
- **Competitive comparison:** Apple is the accessibility benchmark; ed-tech in US schools is
  legally bound (ADA/§508). Numera would currently fail an audit and **cannot sell to US public
  schools** as-is.
- **Impact 7 · Difficulty 6.** *Recommended:* WCAG 2.1 AA pass with an **accessible math
  fallback** as the centerpiece — also a school-market unlock.

### 1.13 Monetization
- **Strengths:** Clean economy (transactional, idempotent, anti-cheat), no predatory IAP, no ads.
- **Weaknesses:** **There is no revenue model at all** — no subscription, no IAP, no ads, no B2B.
  Coins are earned-only. The compliance audit literally warns "do not add monetization without
  revisiting this audit." A "leading platform" needs a sustainable business; right now there
  is none, and the architecture (no payments, no entitlement system, no school/seat management)
  isn't built for one.
- **Missing opportunities:** Freemium subscription (Duolingo Super/Brilliant Premium model),
  **school/district site licenses (IXL/Prodigy's real money)**, parent subscriptions (Prodigy),
  cosmetic-only IAP (ethical, since no pay-to-win), tournaments with entry/prizes (regulatory
  care).
- **Competitive comparison:** Brilliant (~$150/yr consumer), IXL/Prodigy (school + parent
  subscriptions), Duolingo (freemium + ads). Numera monetizes at $0.
- **Impact 9 · Difficulty 7.** *Recommended:* Decide the model *deliberately* — most likely
  **freemium consumer subscription + school/teacher B2B2C** — and build the entitlement,
  payments, and seat-management infrastructure. Keep gameplay non-pay-to-win.

### 1.14 Trust
- **Strengths:** Strong auth (argon2id, MFA, rotating refresh tokens, lockouts, audit log),
  no third-party analytics/ad SDKs, locally-generated content (no data sent to LLMs),
  transactional economy, recent compliance remediation (age gate, deletion, TLS, moderation).
- **Weaknesses:** Privacy Policy/ToS drafted but **not yet published/linked or counsel-reviewed**;
  DPIA pending; behavioral profiling of likely-minors is the single largest regulatory exposure;
  accessibility/legal gaps for schools.
- **Missing opportunities:** Published policies, COPPA/Children's-Code-clean child mode, trust
  center, transparency on the (impressive) privacy posture as a *marketing* asset.
- **Competitive comparison:** Apple makes privacy a brand pillar. Numera has a *better-than-
  average* privacy story (no ad SDKs, local generation) but hides it and hasn't closed the legal
  basics.
- **Impact 8 · Difficulty 4.** *Recommended:* Finish the P0 compliance items, publish policies,
  then **market privacy as a differentiator** ("no ads, no tracking, your child's data stays
  private").

### 1.15 Performance
- **Strengths:** TTL cache on hot reads, parallelized client loads, indexed schema, WAL,
  recomposition hoisting on hot paths, transactional writes.
- **Weaknesses:** Single SQLite file (one writer), in-process cache (not shared), Socket.IO
  single-node (no Redis adapter), WebView math rendering cost.
- **Missing opportunities:** Shared cache, read replicas, native math.
- **Competitive comparison:** Fine for current scale; not for "leading platform" scale.
- **Impact 5 · Difficulty 6.** *Recommended:* Address as part of scalability (below); not urgent
  at current user counts.

### 1.16 Scalability
- **Strengths:** Authoritative thin server, clean route/service separation, cache "Redis-shaped
  for a future swap," idempotency — **the architecture was designed to scale even though it
  hasn't yet.**
- **Weaknesses:** **SQLite is a hard ceiling** for a multi-million-user, multi-region product;
  single-node Socket.IO won't fan out duels; in-process cache and idempotency store don't share
  across instances; no horizontal-scale story, no CDN for content, no observability/metrics
  stack.
- **Missing opportunities:** Postgres + connection pooling, Redis (cache + Socket.IO adapter +
  idempotency), stateless horizontal scaling, metrics/tracing, load testing.
- **Competitive comparison:** Every named incumbent runs distributed infra. Numera runs one box.
- **Impact 7 · Difficulty 8.** *Recommended:* When growth demands it, **migrate SQLite→Postgres
  and add Redis** (cache + socket adapter + idempotency). The clean architecture makes this
  bounded, not a rewrite. Don't do it prematurely.

### 1.17 Onboarding
- **Strengths:** A placement test exists; clean auth; age gate now collected.
- **Weaknesses:** Placement is **static, identical for all, 7–8 MCQs** — a flat front door to a
  deep engine. No goal-setting, no interest capture, no "aha" first-session moment, no
  time-to-value optimization, no guided first lesson.
- **Missing opportunities:** Adaptive diagnostic, goal + interest capture, a delightful first
  win in <60 seconds, value-prop framing.
- **Competitive comparison:** Duolingo's onboarding is a conversion masterclass (goal → quick
  win → streak hook). Numera's is a quiz.
- **Impact 8 · Difficulty 5.** *Recommended:* Rebuild onboarding as **adaptive diagnostic + goal/
  interest capture + a sub-minute first win + streak hook**.

### 1.18 Community
- **Strengths:** Foundations (profiles, leaderboards, moderation queue) exist.
- **Weaknesses:** **Effectively no community.** No forums, no UGC creation/sharing, no clubs, no
  peer help, no events, no creator layer, no off-app presence (Discord/Reddit).
- **Missing opportunities:** Per-concept discussion, user-created problem sets/challenges, clubs,
  events/tournaments, an official Discord, creator tools.
- **Competitive comparison:** Discord/Reddit communities and Chess.com clubs are self-sustaining
  growth + retention engines. Numera has none of this gravity.
- **Impact 8 · Difficulty 7.** *Recommended:* Seed an **official community (Discord + in-app
  clubs + per-concept discussion + UGC challenges)**. Community is the cheapest durable moat.

### 1.19 Long-term retention (12-month)
- **Strengths:** Seasons, rating, mastery, SRS give long-horizon hooks.
- **Weaknesses:** Without notifications, broad content, or community, the realistic 12-month
  retention curve is poor. The competitive ladder is the one thing that *can* retain
  indefinitely (Chess.com proves it) — but it's gated to 1v1 with no tournaments/variety.
- **Missing opportunities:** Endless competitive content, lifecycle comms, community obligation,
  visible long-term mastery journey, credentials.
- **Competitive comparison:** Chess.com retains for *years* on competition+community. Numera has
  the rating brain but not the surrounding system.
- **Impact 9 · Difficulty 6.** *Recommended:* The triad — **notifications + community +
  endless competitive ladder** — is the long-term-retention unlock.

---

## 2. Top 25 highest-impact improvements

Ranked by impact × tractability. (I = Impact, D = Difficulty, both /10.)

1. **Push + email lifecycle/re-engagement** (streak reminders, win-back, weekly recap). The
   single biggest retention lever the product is entirely missing. *I9 D4.*
2. **Adaptive diagnostic onboarding** replacing the static placement quiz + goal/interest
   capture + sub-minute first win. *I8 D5.*
3. **Expand the curriculum** from a single ladder to a **strand-based, standards-aligned skill
   graph** (Common Core to start). The content moat. *I10 D9.*
4. **Lean into competition as the category position** — tournaments, puzzle-rush, async play,
   bots, spectating. "The Chess.com of math." *I9 D6.*
5. **Clubs/teams + real friend graph (accept/decline/DM with safety)** — the community spine.
   *I8 D7.*
6. **Surface mastery as the hero learning view** — a skill tree colored by the 5 mastery
   dimensions, with mastery-decay review. *I8 D5.*
7. **Decide and build a monetization model** (freemium consumer subscription + school B2B2C
   entitlement/seat infra). *I9 D7.*
8. **Streak insurance** (freeze/repair) + ethics pass on loss-framed mechanics for minors.
   *I7 D3.*
9. **Accessible math renderer** (MathML/alt text/audio) + WCAG 2.1 AA pass — also a US-school
   unlock. *I7 D6.*
10. **Per-concept discussion + UGC challenges** (user-created problem sets). Community gravity +
    content treadmill. *I7 D6.*
11. **Publish Privacy Policy/ToS, finish P0 compliance, then market privacy as a differentiator.**
    *I8 D4.*
12. **Teacher/classroom layer** (assignments, class dashboard, rosters) — the ed-tech
    distribution + revenue channel. *I9 D8.*
13. **Parent layer** (progress reports, controls, the Prodigy parent-subscription wedge). *I7 D6.*
14. **Anti-cheat for duels** (math is trivially cheatable with a 2nd device) — required before
    competition can be taken seriously. *I7 D6.*
15. **Close the personalization loop** — feed burnout/tilt into session pacing and nudge
    intensity; honor measured emotional state. *I7 D4.*
16. **iOS client** (or a cross-platform/web strategy) — Android-only halves the addressable
    market. *I8 D8.*
17. **Web app** — for schools (Chromebooks), reach, and SEO/content discovery. *I8 D8.*
18. **Brand identity + signature delight moment** (mascot/world; screenshot-worthy celebration).
    *I6 D6.*
19. **Goal-based learning plans** ("pass GCSE by June" → a reshaped path with milestones). *I7 D5.*
20. **Weekly recap/insights** (Spotify-Wrapped-style shareable progress) — retention + virality.
    *I6 D4.*
21. **Tournaments & seasonal events** with rewards — recurring re-engagement spikes. *I7 D6.*
22. **Native math rendering** to replace the WebView (perf, a11y, consistency). *I5 D6.*
23. **Single legible "north-star" progression** layered over the (excellent but sprawling)
    tracks. *I6 D4.*
24. **Observability + load testing + Redis/Postgres migration plan** staged to growth. *I6 D7.*
25. **Content-correctness test suite** per concept (generation can ship wrong math — it already
    did). *I7 D5.*

---

## 3. Top 50 weaknesses (brutally honest)

**Content & pedagogy**
1. Curriculum is a single linear ladder — ~1–5% of any incumbent's breadth.
2. All content machine-generated; no expert-authored depth or editorial voice.
3. No video, no production-value lessons (Khan/Brilliant own this).
4. No standards alignment (Common Core/GCSE) → can't sell to schools.
5. Generated math can be *wrong* (LaTeX-corruption garbage choices already shipped).
6. No word-problems/applied math/proof/reasoning/projects.
7. No conversational AI tutor (Khanmigo is now table stakes; Numera has none).
8. Lessons are template text, not adaptive multi-modal explanations.

**Onboarding & first-run**
9. Placement test is static, identical-for-all, 7–8 MCQs.
10. No goal capture, no interest capture, no sub-minute first win.
11. No value-prop framing or activation optimization.

**Engagement & retention**
12. **No push notifications** — the biggest retention lever, entirely absent.
13. No email lifecycle/win-back/recap.
14. No streak freeze/repair → brittle, punishing streaks.
15. Loss-framed mechanics (out-of-hearts, relic loss) risky for minors.
16. FOMO countdown timers + dynamic discounts = potential dark patterns the app *itself* flags.
17. Over-engineered loops competing over a thin problem set.
18. No comeback/reactivation flows.

**Social & community**
19. Friend requests can't be declined.
20. No DM/chat.
21. No clubs/teams/study groups.
22. No forums or per-concept discussion.
23. No UGC creation/sharing beyond saved collections.
24. No co-op/collaborative play.
25. No off-app community (Discord/Reddit) seeding.
26. No mentor/peer-help system.

**Competition**
27. Only 1v1 duels — no tournaments/arenas/variants/puzzle-rush.
28. No async/correspondence play.
29. No spectating/replays.
30. No bots/calibrated practice opponents.
31. **No real anti-cheat** (math is uniquely cheatable with a 2nd device).
32. No team/club competition.

**Personalization & mastery**
33. Rich measurement, thin actuation — burnout/tilt measured, not acted on.
34. No learner goals.
35. Mastery (the best-in-class part) is nearly invisible (one Profile card).
36. No mastery-decay review across the graph.
37. No interest-based theming.

**Monetization & business**
38. **No revenue model whatsoever.**
39. No payments/entitlement/seat infrastructure.
40. No school/teacher channel (where ed-tech money is).
41. No parent subscription channel.

**Reach & platform**
42. Android-only — no iOS.
43. No web app (blocks Chromebook/school + SEO discovery).
44. No discoverable web content → no organic acquisition.

**Accessibility & trust**
45. Math WebView opaque to screen readers; color-only state cues; sparse labels — would fail
    WCAG/ADA; blocks US public schools.
46. Privacy Policy/ToS not yet published/linked or counsel-reviewed; DPIA pending.
47. Behavioral profiling of likely-minors = largest regulatory exposure.

**Design & identity**
48. No brand character/identity — reads as a Duolingo reskin.
49. No signature delight/celebration moment.

**Infra & quality**
50. SQLite + single-node Socket.IO + in-process cache = a hard scaling ceiling; no
    observability/metrics/load-testing; no Android UI test net historically (now partially
    addressed).

---

## 4. Top 10 competitive advantages (what to protect & weaponize)

1. **A genuinely serious math rating system (NRS: Elo + velocity + tilt + smurf + seasons) with
   real-time duels.** Nobody in math ed-tech has built Chess.com-grade competition. This is the
   category-defining moat.
2. **Multi-dimensional mastery (accuracy/fluency/retention/independence/transfer).** Ahead of
   Khan's single mastery axis.
3. **Transfer exercises** (novel-context application) — rare, pedagogically elite.
4. **Misconception-targeted diagnosis + Socratic hinting** — adaptivity that teaches *why*, not
   just *what*.
5. **Anti-repetition engine** (fingerprint + diversity) — infinite fresh practice without
   repetition fatigue.
6. **Authoritative, cheat-resistant, transactional economy** — a clean foundation most clones
   get wrong.
7. **Privacy posture** — no ad/analytics SDKs, locally generated content, strong auth/MFA. A
   real, marketable differentiator if finished and surfaced.
8. **Clean, decomposed, well-documented architecture** designed to scale (cache "Redis-shaped,"
   routes/services split, idempotency) — fast to extend.
9. **Spaced-repetition + retention scheduling** baked into the core loop.
10. **Breadth of gamification primitives already built** (leagues, quests, achievements chains,
    shop, commitment/relics) — the engagement scaffolding is done.

> Strategic read: advantages 1–5 are *learning-and-competition intelligence*. That is the
> defensible product. The roadmap should **double down on "the most intelligent, most
> competitive way to get good at math,"** not try to out-content Khan.

---

## 5. Top 10 missing systems (net-new, build these)

1. **Lifecycle/notification system** (push + email: reminders, win-back, weekly recap).
2. **Broad standards-aligned curriculum + content authoring/QA pipeline.**
3. **Teacher/classroom system** (rosters, assignments, class analytics) — distribution + revenue.
4. **Parent system** (progress, controls, subscription wedge).
5. **Monetization infrastructure** (payments, entitlements, seats, freemium gating).
6. **Community system** (clubs/teams, per-concept discussion, UGC challenges, official Discord).
7. **Tournament/competitive-events system** (arenas, puzzle-rush, async, spectating, bots).
8. **Anti-cheat system** for competitive play.
9. **Accessible math rendering + a11y system** (also the school unlock).
10. **Web + iOS clients** (reach + discovery).

---

## 6. Roadmap — becoming the leading gamified mathematics platform

Sequenced for compounding leverage: first *retain and activate* the users you can get, then
*build the moats*, then *scale reach and revenue*.

### Phase 0 — Unblock (0–2 months): "Can we even ship?"
- Finish P0 compliance (publish Privacy Policy/ToS, counsel review, DPIA, child-mode decision).
- Accessibility WCAG 2.1 AA pass + accessible math fallback (also unblocks schools later).
- Content-correctness test suite (stop shipping wrong math).
- **Exit:** legally distributable, accessible, content-trustworthy.

### Phase 1 — Activation & retention (2–5 months): "Stop the leak"
- **Push + email lifecycle** (the #1 missing lever) + streak freeze.
- **Adaptive diagnostic onboarding** + goal/interest capture + sub-minute first win.
- Surface **mastery as the hero learning view** (skill tree).
- Weekly Wrapped-style recap (retention + organic sharing).
- Close the personalization loop (burnout/tilt → pacing/nudges; ethics pass on dark patterns).
- **Exit:** materially better D7/D30 retention; a front door worthy of the engine.

### Phase 2 — Moats: competition + community (5–9 months): "Be undeniably the best at one thing"
- **Competition expansion:** tournaments, puzzle-rush, async play, bots, spectating, **anti-cheat**.
  Position publicly as "the competitive home of math."
- **Community:** real friend graph (accept/decline/DM + safety), clubs/teams + team leagues,
  per-concept discussion, UGC challenges, official Discord.
- Brand identity + signature delight moment.
- **Exit:** two self-reinforcing moats (competition + community) that incumbents can't quickly
  copy; word-of-mouth growth begins.

### Phase 3 — Reach & content breadth (9–15 months): "Become a place you can actually learn math"
- **Curriculum expansion** to a strand-based, standards-aligned graph (Common Core first),
  with an authoring + expert-QA pipeline (LLM-assisted, human-reviewed) layered over generation.
- **Web app** (Chromebooks/schools + SEO discovery) and **iOS**.
- Goal-based learning plans.
- **Exit:** broad enough to be a primary learning tool, on every platform, discoverable.

### Phase 4 — Business & scale (15–24 months): "Make it a company"
- **Monetization:** freemium consumer subscription (cosmetic-only IAP, never pay-to-win) +
  **school/district B2B2C** (teacher/classroom system, seats, site licenses) + parent subscription.
- **Scale infra:** SQLite→Postgres, Redis (cache + Socket.IO adapter + idempotency), stateless
  horizontal scaling, observability + load testing.
- Credentials/certificates; creator economy for UGC.
- **Exit:** durable revenue (consumer + schools), infra that scales to millions, a defensible,
  category-leading product.

### The strategic bet, in one line
> **Win "the smartest, most competitive way to get good at math" first (engine + competition +
> community — your real moats), then earn the right to be "where you learn math" (content +
> reach + schools).** Trying to out-Khan Khan on content from day one wastes your actual edge.
