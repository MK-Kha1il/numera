# Economy Model — coin faucet/sink audit & rebalance

> Ultra-review item #10 / #28 / #61 (2026-06-10). The strategic audit flagged that coin
> **faucets multiplied** (tournaments, wars, challenges, seasons, quests, puzzle rush, bot
> duels) while no **sink** was added to match — "inflation will hollow the shop and cheapen
> rewards." This doc models the actual numbers from the code and proposes a rebalance.
>
> Status: **diagnosis + design proposal.** No balance values are changed by this doc. Each
> recommendation below is a discrete follow-up. Numbers are read from the source files cited;
> re-derive them before shipping a change (the faucets move as new modes ship).

## TL;DR

The economy is **structurally inflationary**: faucets are *recurring* (daily, per-solve,
per-match) and several are large, while **every sink except two is a one-time cosmetic
purchase**. A committed learner buys everything they want within ~2–3 weeks and then earns
coins forever with nothing to spend them on. Coins stop being a motivator the moment the
shop is "complete," and every reward that pays coins quietly becomes worthless. The single
most dangerous faucet is **bot duels (up to 280 coins/day, always available)**; the most
counter-productive mechanic is the **shop's dynamic discount, which lowers prices for the
players who already have the most coins** (also a dark-pattern flag, review #32).

---

## Faucets (where coins come from)

| Source | Amount | Recurring? | Daily ceiling | File |
|---|---|---|---|---|
| Starting balance | 100 | once | — | `db.js` (`coins DEFAULT 100`) |
| Solve a problem (`/complete`) | `5 + round(2·log₂(level))` + speed/combo bonuses; ×2 hard, ×1.2 daily-challenge, 10% chance ×2 | **per solve** | **uncapped** (≈8–20 ea.) | `routes/math.js:281` |
| Daily quests (6 defined) | 20+30+25+40+30+25 = **170** if all claimed | **daily** | 170 | `lib/questDefs.js` |
| Daily puzzle solve | +30 (on top of the 40-coin `daily_puzzle` quest → 70 total) | **daily** | 70 | `routes/dailyPuzzle.js:123` |
| Puzzle Rush run | `min(score, 50)` | **per run** | ~50+ (no documented run cap) | `routes/puzzleRush.js:20` |
| Bot duel win | 10 / 18 / 28 (easy/med/hard), capped **10 wins/day** | **per win** | **280** | `routes/botDuel.js:17-23` |
| Tournament finish | top-3 only: 100 / 60 / 40 | per event | 100 | `routes/tournaments.js:21` |
| Async / socket duels, club wars | additional coin grants | per event | — | `routes/asyncDuel.js`, `clubWars.js` |
| Rank-up badges | 100→500 cumulative, **once per rank** | once | — | `services/rankRewardService.js` |
| Achievements | one-time grants | once | — | `routes/achievements.js` |

**Realistic committed-player day:** quests 170 + daily puzzle 70 + a few bot-duel wins ~80 +
one puzzle-rush 50 + ~60 solves × ~12 ≈ **1,000+ coins/day**, and the ceiling is far higher.
Even a *casual* twice-a-week player clears 300–500/session.

## Sinks (where coins go)

| Sink | Cost | Recurring? | File |
|---|---|---|---|
| Cosmetic avatars | 100–3,500 | **one-time** (own it forever) | `db.js:707+` |
| Cosmetic banners | 50–3,000 | **one-time** | `db.js:734+` |
| Cosmetic badges | 50–4,000 | **one-time** | `db.js:748+` |
| Cosmetic themes | 50–1,000+ | **one-time** | `db.js:759+` |
| Retry tokens (utility) | shop-priced consumable | recurring | `routes/shop.js` (`is_utility`) |
| Streak repair | 150 | recurring (rare) | `routes/commitment.js:123` |

Total cosmetic catalog cost is on the order of ~30k coins. At 1,000+/day earn, a dedicated
player **drains the entire shop in under a month** — and the two recurring sinks (retry
tokens, streak repair) are both small, both tied to *failure*, and neither is something a
thriving player buys often. After completion, **net coin flow is permanently positive with
nowhere to go.**

## The two structural bugs

1. **No durable recurring sink.** Cosmetics are one-time; the economy has no equivalent of a
   consumable a healthy player *wants* to keep buying. Every new mode added a faucet (quests
   for puzzle-rush/SRS, bot-duel payouts, tournament prizes) and **zero** matching sink.

2. ~~**The discount runs backwards.**~~ **FIXED.** `routes/shop.js` used to give a discount
   when `saveRate > 0.7 && coins > 600` — i.e. *the richer you are, the cheaper things get*,
   which accelerated inflation and was a dark pattern (review #32). Removed; the only remaining
   discount is a gentle affordability help for low-coin engaged players (`affordabilityDiscount`,
   shared by the display + charge paths, guarded by `test/shopDiscount.test.js`).

---

## Rebalance proposal

Goal: keep coins meaningful for the *whole lifetime* of an engaged player, without ever
gating learning or competition (that line is set in [MonetizationLine.md](MonetizationLine.md)
— coins buy cosmetics and convenience, never pedagogy or rating).

**1. Add a durable recurring sink (highest leverage).**
- **Seasonal cosmetic rotation:** a small set of season-exclusive cosmetics each season
  (review #66). Scarcity by time, not FOMO timers. Gives perpetual coin demand without
  power-creep.
- **End-of-season coin→cosmetic conversion** (review #75): convert surplus coins into a
  season token at season end, resetting accumulated pressure. A *scheduled* sink.
- **Coin gifting between friends**, daily-capped (review #71): social glue *and* a sink.

**2. Tame the largest faucets.**
- Bot duels are the worst offender (280/day, infinite availability, and bots aren't a scarce
  resource). Either lower the per-win reward, lower the daily cap, or make payout decay with
  the number of bot wins that day. Bots should be *practice*, not a coin farm.
- Add an explicit per-run cap to Puzzle Rush coin payout (currently only score-bounded).

**3. Fix the discount.** Remove the inverse discount, or replace it with a flat, honestly
presented price. If a "sale" mechanic is wanted, it should be time-based and the same for
everyone — never keyed on how rich the buyer is.

**4. Pick target numbers and hold them.** Suggested design targets (tune against real data
once analytics land — see `product_analytics`):
- Median committed-player **daily earn ≈ 150–250** coins (down from 1,000+), achieved mostly
  by taming bot duels and capping rush.
- A recurring sink (seasonal rotation + gifting) sized so a thriving player still has a
  *reason* to spend most weeks, not just in week 1–3.

**5. Re-price against the new faucet total.** Once faucets are tamed, re-check the cosmetic
ladder (review #61): the 3,500–4,000 "mythic" tier should feel like a multi-week goal at the
*new* earn rate, not the old one.

## What this doc deliberately does **not** touch

- No change to **XP / leveling** (XP is a progress signal, not a currency; it has no sink and
  doesn't need one).
- No change to **rating / Elo / season points** — those are competitive integrity, never
  bought or sold ([MonetizationLine.md](MonetizationLine.md)).
- No billing implications. Coins remain earned-only; this is purely internal-economy balance.

## Follow-up tasks (discrete)

- [x] Add a seasonal-rotation cosmetic sink (+ coin→token conversion). **Done** — a rotating
      pool of season-exclusive cosmetics (`shop_items.season_slot`, slot = `activeSeasonId % 3`)
      plus a coin→Season-Token conversion (`/api/shop/convert-coins`, migration v46
      `users.season_tokens`) funding token-only prestige items (`token_cost`). Guarded by
      `test/seasonSink.test.js`; client surface in ShopScreen (`SeasonTokenWallet`/`PrestigeTokenCard`).
- [x] Decay the bot-duel faucet. **Done** — per-win reward now decays as the day's wins pile
      up (`routes/botDuel.js`), cutting the hard-tier ceiling from ~280 to ~160/day; first wins
      still pay full. Puzzle Rush already has a per-run cap (`MAX_COIN_REWARD`).
- [x] Remove or flatten the inverse shop discount (`routes/shop.js`). **Done** — hoarder
      discount removed, affordability discount kept (`affordabilityDiscount` + test).
- [x] Re-price the cosmetic ladder against the tamed earn rate. **Reviewed — no change needed.**
      The ladder is already monotonic by rarity (Common 50–100 · Rare ~120–400 · Epic 300–800 ·
      Legendary 1000–1500 · Mythic 3000–4000) with no rarity inversions, and after taming the
      faucets the top Mythic tier (≈4000) sits at ~3 weeks of median earn — appropriately
      aspirational. Intra-rarity variety across cosmetic types looks intentional and was left
      intact (cf. the color-token audit's "don't blanket-normalize intentional data" lesson).
- [ ] Wire coin faucet/sink counters into `product_analytics` so this model can be validated
      against real behavior instead of estimated.
