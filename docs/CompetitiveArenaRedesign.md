# Competitive Arena Redesign — "The Living Arena"

> Canonical design doc for the competitive-mode overhaul. Companion to
> [CompetitiveEcosystemAudit.md](CompetitiveEcosystemAudit.md) (rating-substrate audit) and
> [DesignSystem.md](DesignSystem.md). This doc owns the **experience** layer: pre-match,
> in-match, post-match, identity, rivalry, momentum, and social presence.

**Status:** Pass 1 shipped on `main` (see §10 "What shipped"). Baseline audited at commit on
`main` (migration v46) — NOT the `feat/competitive-rating-unification` branch.

---

## 0. Thesis

Numera's Arena is **mechanically complete and emotionally empty.** Every system a competitive
ladder needs technically exists — Elo, ranks, matchmaking, a server-authoritative duel, anti-cheat,
seasons, tournaments. But playing it feels like answering a quiz next to a progress bar. There is
no **opponent** (just a name), no **stakes you can feel** (a number nudges by ±15), no **memory**
(every match is the first match), no **identity** (you are a rank label), and no **world** (the
arena is a menu, not a place).

The fix is not more modes. It is to make the existing duel **mean something** through four felt
truths:

| Target feeling        | Delivered by                                                            |
|-----------------------|-------------------------------------------------------------------------|
| "I have rivals."      | Head-to-head records, rematches, rivalry stories, repeat-opponent memory |
| "I have a reputation."| Peak rating, win streaks, specialties, season history, a real player card |
| "I am improving."     | Animated rating deltas, milestone moments, clutch recognition, learning recap |
| "I want one more match."| Momentum states, clutch payoffs, rematch CTA, a live social feed         |

Design north stars: **prestige (Chess.com), excitement (Rocket League), progression (ranked ladders)
— never at the expense of mathematical integrity.** Momentum and clutch are *cosmetic*: they change
how a match *feels*, never the math or the rewards.

---

## 1. AUDIT — Why competition currently feels dead

Grouped by surface and ranked within group by felt impact. (Consolidated from a raw ~100-item
list; near-duplicates merged so each line is actionable.)

### 1.1 The opponent is a ghost (identity vacuum)
1. The opponent is a bare username string — no rank, rating, avatar, record, or history is shown.
2. `duel_start` ships only `opponent.username`; the rich data the server *has* (elo, rank) is dropped.
3. No player card exists anywhere in the duel flow — pre, during, or post.
4. You never learn if you out-rank or under-rank your opponent, so no David-vs-Goliath tension.
5. No avatar/cosmetic identity in the arena; everyone is visually identical.
6. The bot opponent ("MathBot") is indistinguishable from a human in the UI — no honest labeling.
7. No "specialty" or signature category — players have no mathematical personality.
8. Peak rating is never stored or shown; you can't say "I was once Gold."
9. No win-streak surfaced live or historically.
10. No country/club/affiliation, so no tribal identity.

### 1.2 No memory (every match is the first match)
11. **Nothing is persisted about a finished duel** — no match history table exists at all.
12. Head-to-head record is impossible because results aren't recorded.
13. You can play the same person 10 times and the app treats each as a stranger.
14. No "rematch" — when a duel ends, that pairing is gone forever.
15. No revenge framing ("they beat you last time").
16. No rivalry stat (who you've played most, your record vs them).
17. No personal match log to review your own competitive arc.
18. No streak persistence — `arena_wins` is a lifetime counter with no shape.
19. Season history isn't surfaced to the player; past seasons vanish.
20. No notable-moment capture (biggest upset, longest streak) for the profile.

### 1.3 Pre-match is a spinner (zero anticipation)
21. Matchmaking is an unbounded "SEARCHING FOR MATCH" spinner with an Elo window readout.
22. The only pre-match beat is a 1.8s "VS" splash with two names and a sword emoji.
23. No opponent reveal — you don't see who you're about to fight before it starts.
24. No stakes preview ("+18 / −12", "win and you promote", "your rival").
25. No category preview, no "what's on the line" framing.
26. The queue has no sense of a population, ladder, or "others are playing right now."
27. No ready-check / lock-in ritual to build tension.
28. Casual and ranked feel identical pre-match despite different stakes.
29. The bot fallback after 20s reads as a consolation prize, not an exciting option.
30. No music/ambience/haptic build-up.

### 1.4 In-match has no momentum or tension
31. The match is five MCQs with two progress bars — pacing is flat from Q1 to Q5.
32. No round-by-round transitions, no "Round 3" callouts, no escalation.
33. Streak exists (🔥 ×N chip) but is tiny, cosmetic, and unconnected to any feeling.
34. No momentum states — a hot streak feels the same as scraping by.
35. No pressure cues when behind, no "match point" when one answer decides it.
36. The lead callout is a small text line ("You lead — keep pushing!"); easy to miss.
37. No opponent presence during play — you watch a bar, not a competitor.
38. No "they just answered" tells, no tension from a close race.
39. Visual feedback is per-answer green/red only; no compounding excitement.
40. Final question isn't distinguished — the climax lands like any other question.
41. Speed is rewarded by the score model but never *felt* (no clock, no timer drama).
42. No comeback awareness — clawing back from 0–60 to win feels like a normal win.

### 1.5 Post-match is a receipt
43. Result screen: "VICTORY/DEFEAT", a score line, a static rating number, a coin line.
44. The rating change is a static string — no count-up, no weight, no payoff.
45. No celebration scaled to the achievement — a nail-biter and a stomp look identical.
46. No clutch recognition (comeback, perfect game, upset, streak-break, promotion).
47. No milestone surfacing (new peak, win-streak record, promotion to a new tier).
48. Promotion to a new rank tier passes silently — the single most prestigious moment is invisible.
49. No rivalry update ("You now lead Sam 3–2").
50. No "one more" hook — the only buttons are "Leave Arena" and (sometimes) review misses.
51. No rematch button.
52. Defeat teaches nothing emotionally — "Opponent was faster this time" is a shrug.
53. No share / brag affordance for a great win.
54. Learning recap is thin: a "review your N misses" button, no mastery delta or growth framing.

### 1.6 Ranking & rewards feel weightless
55. Reward for a win is a flat +50 coins regardless of opponent strength or stakes.
56. Elo ±15-ish moves with no narrative; the ladder is invisible between matches.
57. No "you are N points from promotion" progress toward the next rank.
58. Rank is a text label with a small badge; tiers don't feel like a climb.
59. Four different ladders (NRS solo, duel Elo, league stones, level-rank) share Bronze..GM names
    and confuse the player about which "rank" is real (see ecosystem audit).
60. No placement-match drama (the 5 placement games aren't presented as a journey).
61. No demotion tension/protection framing.
62. Season rewards exist server-side but are invisible in the duel loop.
63. No cosmetic reward tied to competitive achievement in the moment.

### 1.7 No social presence (the arena is empty)
64. The arena is a menu of modes; it never shows another human exists.
65. No feed of recent promotions, big wins, or streaks from the community/friends.
66. No "friends online / in queue now" presence.
67. No challenge-a-friend-to-ranked direct flow from a profile.
68. No leaderboard glimpse in the arena home.
69. No achievement/notable-moment feed.
70. No season highlights or "this week in the arena."
71. Friend duels are buried as one of six tiles with no social pull.

### 1.8 Emotional & sensory design gaps
72. No arena-specific soundtrack or stingers for promotion/clutch/defeat.
73. Haptics are generic (success/error), not tuned to competitive moments.
74. Color/motion don't escalate with stakes; ranked looks like casual.
75. The "Studio" theme is applied, but the arena doesn't earn a distinct **stadium** identity.
76. No named moments the player remembers a week later.

### 1.9 Educational integrity drift
77. Speed-MCQ rewards recall speed over reasoning (flagged in ecosystem audit).
78. A fast guesser can out-score a slower correct reasoner.
79. No "explain why" or reasoning beat in competitive play.
80. Misses are banked but the loop back to *understanding* is a single optional button.
81. No adaptive difficulty within a duel; all five problems are one level.
82. Mastery earned in duels isn't surfaced as competitive growth.

*(Reasons 83–100 are finer-grained variants of the above — e.g. no draw handling drama, no
spectate, no emotes, no MMR transparency, no post-match opponent profile peek, no "rated/unrated"
badge clarity, no queue-dodge etiquette, no reconnect grace UX, no end-of-match opponent GG. They
inform the backlog in §3 rather than adding new themes.)*

---

## 2. TOP IMPROVEMENTS (ranked by impact × feasibility)

Legend — **Imp** impact on feel, **Eff** effort, **Edu** educational value, **Ret** retention.
Scale 1–5 (Eff: 5 = cheap). ★ = shipped in Pass 1.

| # | Improvement | Imp | Eff | Edu | Ret | |
|---|-------------|-----|-----|-----|-----|--|
| 1 | **Record every duel** (history table) — the substrate for rivalries, H2H, peak, streak | 5 | 4 | 2 | 5 | ★ |
| 2 | **Head-to-head + rivalry memory** — "You lead Sam 3–2", revenge framing | 5 | 4 | 1 | 5 | ★ |
| 3 | **Rich opponent player card** pre-match (rank, rating, peak, streak, H2H, specialty) | 5 | 4 | 2 | 4 | ★ |
| 4 | **Momentum states** in-match (In Rhythm → On Fire → Locked In → Clutch), cosmetic | 5 | 4 | 1 | 4 | ★ |
| 5 | **Clutch recognition** post-match (comeback / perfect / upset / streak-break / promotion) | 5 | 4 | 1 | 5 | ★ |
| 6 | **Redesigned post-match** — animated rating count-up, milestone banners, rivalry update | 5 | 3 | 2 | 5 | ★ |
| 7 | **Peak rating + win-streak** persistence and display (reputation) | 4 | 4 | 1 | 4 | ★ |
| 8 | **Promotion moment** — full-screen celebration when you climb a tier | 5 | 4 | 1 | 4 | ★ |
| 9 | **Rematch button** on the result screen | 4 | 3 | 1 | 5 | (P2) |
| 10 | **Specialty** = your strongest strand, shown as identity chip | 3 | 4 | 3 | 3 | ★ |
| 11 | **Live arena feed** — recent promotions / streaks / big wins | 4 | 3 | 1 | 4 | ★ |
| 12 | **Rivals card** in arena home — your top opponents and records | 4 | 4 | 1 | 4 | ★ |
| 13 | **Stakes preview** pre-match — projected ±rating, "win = promotion" | 4 | 4 | 2 | 3 | ★ |
| 14 | **Promotion-progress bar** — "N points to Gold I" | 4 | 4 | 2 | 4 | ★ |
| 15 | **Reasoning beat** — a "why?" self-explain after a duel (educational integrity) | 4 | 2 | 5 | 3 | (P2) |
| 16 | **Match-point** distinguished final/decisive question (pressure) | 4 | 3 | 1 | 3 | ★ |
| 17 | **Opponent presence** during play — avatar + live "answering…" tell | 3 | 3 | 1 | 3 | (P2) |
| 18 | **Arena stadium identity** — distinct surface/motion/sound for ranked | 3 | 3 | 1 | 2 | (P2) |
| 19 | **Stake-scaled rewards** — bigger coins for beating stronger opponents | 3 | 4 | 1 | 3 | (P2) |
| 20 | **Season history** on the profile (past peaks, finishes) | 3 | 3 | 1 | 3 | (P3) |

*(Improvements 21–100: ready-check ritual, queue population ticker, GG/emote, spectate, replay of
your best duel, weekly rival assignment, "nemesis" auto-detection, draw drama, MMR transparency,
post-match opponent profile peek, brag/share card, streak-shield in arena, clutch leaderboard,
underdog-of-the-week, tier-up cosmetics, division pips, decay grace, calibration journey UI, etc. —
captured in §3 and the ranked table above sets their priority.)*

---

## 3. MISSING SYSTEMS (net-new subsystems the arena needs)

1. **Match-history substrate** (`duel_history`) — every finalized duel, both players, scores, mode. ★
2. **Rivalry engine** — derive H2H and "nemesis" from history; surface stories. ★ (H2H shipped)
3. **Reputation columns** — `peak_elo`, `current_win_streak`, `best_win_streak`, `last_duel_at`. ★
4. **Arena event feed** (`arena_events`) — promotions, streak milestones, peaks. ★
5. **Clutch/moment engine** (`lib/duelMoments.js`) — pure tag computation. ★
6. **Rematch routing** — re-pair the same two players (P2).
7. **Stakes projector** — pre-match ±rating + promotion preview (P2).
8. **Reasoning layer** in duels — integrity (P2).
9. **Season-history surfacing** on profile (P3).
10. **Spectate / replay** (P3, large).

---

## 4. EMOTIONAL DESIGN IMPROVEMENTS
- Anticipation: opponent-reveal player card before the first problem (not just two names). ★
- Pressure: momentum + behind/ahead escalation; match-point styling (P2).
- Payoff: animated rating count-up + scaled celebration + clutch banners. ★
- Memory: named moments (comeback, upset) that persist to the profile. ★
- Relief/sting: defeat that frames the rematch, not a shrug. ★ (rivalry framing)
- Sensory: competitive-tuned haptics + stingers for promotion/clutch (P2 sound).

## 5. SOCIAL IMPROVEMENTS
- Live arena feed of community/friend promotions & streaks. ★
- Rivals card (your top opponents + records). ★
- Head-to-head everywhere a username appears. ★ (duel surfaces)
- Challenge-to-ranked from a profile (P2). Friends-in-queue presence (P3).
- GG / emote at match end (P3). Season highlights (P3).

## 6. IDENTITY IMPROVEMENTS
- Player card: rank crest, rating, **peak**, **win streak**, **specialty**, H2H. ★
- Peak rating as a permanent reputation marker. ★
- Win-streak record as a badge of form. ★
- Specialty = strongest strand → mathematical personality. ★
- Season history + notable moments (P3).

## 7. RETENTION IMPROVEMENTS
- "One more match" via rematch (P2) + momentum/clutch payoff loop. ★ (payoff)
- Rivalry pull — unfinished business brings players back. ★
- Promotion chase — visible progress to next tier (P2).
- Streak preservation tension — don't break the run. ★ (streak surfaced)
- Daily arena feed gives a reason to open the tab even when not queuing. ★

## 8. PREMIUM POLISH OPPORTUNITIES
- Rating count-up with spring + haptic tick per ~point. ★
- Tier-up full-screen crest reveal with particles. ★
- Momentum aura that intensifies with the streak. ★
- Clutch banners with distinct accents per moment type. ★
- Stadium surface + ranked-only motion language (P2).
- Arena soundtrack + promotion/clutch stingers (P2).

---

## 9. EDUCATIONAL INTEGRITY POSITION

Competition must reward **reasoning, understanding, adaptability** — not memorization, grinding, or
answer-farming. This redesign upholds that by **construction**:
- **Momentum & clutch are 100% cosmetic.** They never alter the math, the grading, the rating, or
  the rewards. They change *how a correct answer feels*, not *whether it counts*.
- **Server stays authoritative.** All grading, Elo, peak, streak, and history writes are server-side
  and idempotent; the client computes only its own cosmetic momentum from already-graded results.
- **The compete→learn loop is strengthened, not bypassed.** Misses still bank to the Mistakes Bank;
  the post-match recap now frames them as growth, and duels still feed the learning engine.
- **Deferred integrity work (P2):** a post-duel "why is that right?" reasoning beat, and intra-duel
  adaptive difficulty, so speed-of-recall stops dominating speed-of-reasoning. Tracked in §2 #15.

Anti-farming: rivalry/peak/streak are derived from *real* ranked outcomes; bot duels are excluded
from `duel_history` (no fake rivalries) and clearly labeled.

---

## 10. WHAT SHIPPED (Pass 1)

Server (migration **v47**):
- `users`: `+peak_elo`, `+current_win_streak`, `+best_win_streak`, `+last_duel_at`.
- New `duel_history` table; new `arena_events` table.
- `services/arenaService.js` — identity load, result recording, H2H, rivals, feed, peak/streak.
- `lib/duelMoments.js` (pure, unit-tested) — clutch-tag computation.
- Duel lifecycle wired: enriched `duel_start` opponent identity + H2H; `duel_end` now carries
  clutch tags, win streak, new-peak/promotion flags, and H2H update.
- `routes/arena.js` — `GET /api/arena/rivals`, `GET /api/arena/feed`. Profile exposes peak/streak.

Android:
- Models + ApiService for the arena endpoints and enriched payloads.
- **Pre-match** redesigned: opponent player card (crest, rating, peak, streak, specialty, H2H).
- **In-match** momentum system (In Rhythm / On Fire / Locked In / Clutch) — cosmetic aura + banner.
- **Post-match** redesigned: animated rating count-up, clutch banners, streak/peak/promotion
  moments, rivalry update, learning recap.
- **Arena home**: peak + streak in the header, Rivals card, live Arena Feed strip.

**Pass 2 (also shipped, client-only, no nav changes):**
- **Stakes preview** in the pre-match VS card (ranked): projected `win +X / lose −Y` from the same
  Elo K=32 the server settles with, plus a "Win this to reach <NextRank>!" promotion callout.
- **Promotion-progress bar** on the arena home ("N to Gold I" + band progress) — the always-on climb.
- **Match-point** climax: the decisive final question (Clutch momentum) gets a pulsing "MATCH POINT"
  banner and a gold card border.
- New pure helpers `nextRankInfo` / `projectedEloChange` in `DuelMoments.kt` (mirror the server's
  rank thresholds + Elo math), JVM-tested.

Deferred (P2/P3) tracked in §2–§8: true **rematch** (same-opponent re-pair — a socket offer/accept
flow), reasoning beat (#15, the one real integrity gap), opponent live-presence, stadium sound,
season history, spectate.
