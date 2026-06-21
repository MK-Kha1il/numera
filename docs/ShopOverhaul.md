# Shop Overhaul — audit, design system & rebuild plan

> Brief: turn the Item Shop into a *collection destination* — premium, coherent, and fused
> with Numera's identity (mathematical mastery, discovery, progression, competition). This
> doc is the canonical blueprint. It is grounded in the **current code** (file/line refs are
> real as of this writing); re-derive before shipping. Economy numbers extend
> [EconomyModel.md](EconomyModel.md); identity extends [BrandIdentity.md](BrandIdentity.md).
>
> Status: **diagnosis + design + staged plan.** No balance/schema values change by this doc.

---

## 0. What the shop is today (the surfaces)

| Layer | Files |
|---|---|
| Catalog seed | `server/db.js:711–845` (`shopItems` + `rawBadges`, inserted into `shop_items`) |
| Server logic | `server/routes/shop.js` — `/api/shop` (rotation+discount), `/purchase`, `/equip`, `/convert-coins`, `/consume-retry` |
| Rarity language | `android/.../theme/Rarity.kt` (5-tier enum: color, border gradient, glow, shimmer) |
| Screen | `ui/feature/shop/ShopScreen.kt` (one `LazyColumn`, ~700 lines) |
| Cards | `ui/feature/shop/ShopCards.kt` (`ShopBackground`, `RarityCardFrame`, `HeroShowcasePanel`, `ShopHeroCard`, `DailyShopItemCard`, `UtilityShopItemCard`, `SeasonTokenWallet`, `PrestigeTokenCard`, **`FeaturedShopItemCard` — dead code**) |
| Assets | `ui/components/Avatar.kt` (`MathAvatar`, `ProfileBanner`, `AchievementBadge`), `ThemePreview.kt` |
| Adjacent (earned) | `lib/titles.js` + `routes/rating.js` — **titles already exist, earned-only**, surfaced on the profile, *not* in the shop |

The catalog today: **~49 purchasable cosmetics** (19 avatars · 12 banners · 9 badges · 9 themes)
+ 4 utilities + 6 seasonal-rotation cosmetics + 3 earned Champion banners + 2 token-only Mythics
+ ~29 earn-only badges (solver/streak/arena/collector tiers, rank badges, commitment relics).

---

## 1. Full shop audit (Deliverable #1)

### 1.1 Information architecture — *the core problem*
The entire shop is **one vertical `LazyColumn`** with ~9 stacked sections in fixed order:
title → loading → collection-progress card → balance card → "My Collection" row → hero
**showcase panel** → "Featured Hero Exhibit" → "Daily Deals" → "This Season" → Season-Token
wallet → token items → "Utility Boosters" → collapsible "Full Collection". This is exactly the
"endless scroll / cluttered grid" the brief warns against.

- **No tabs, no search, no sort, no favorites, no wishlist.** The only filter (avatar/banner/
  badge/theme chips) is buried *inside* the collapsed Full Collection (`ShopScreen.kt:534`).
- **Three competing "hero" surfaces** stack on top of each other: the `HeroShowcasePanel`
  ("✦ SHOWCASE PREVIEW ✦", the only place with a Purchase button), the "★ FEATURED HERO
  EXHIBIT" header, and `ShopHeroCard` ("✨ TODAY'S HERO ITEM"). Three headers, one idea.
- **Backbone is a guessing game.** Daily/Featured are pseudo-random rotations keyed on date
  stamps (`shop.js:83–113`); the catalog is the same items again. A user can't *navigate* to
  "show me banners I don't own" without expanding a collapsible and scrolling.

### 1.2 UX / purchase flow
- Tapping any card calls `showItemDetail` which **scrolls the list up to item index 3**
  (`ShopScreen.kt:72–75`) to reveal the showcase panel that holds the buy button. This is a
  patch over a real flaw: *cards are not buyable in place.* You tap, the screen lurches, then
  you buy somewhere else. (`ShopHeroCard` does have inline price but still routes through the
  panel.)
- **Reveal** (`ShopScreen.kt:578–692`) is the best part: medallion pop with `Motion.rewardEnter()`
  + confetti for Epic+ (`tier.isPrestige`). Keep this.
- No "compare", no "try on profile", no equip-from-card for unowned-after-buy except the reveal's
  "Claim & Equip".

### 1.3 Visual quality / "doesn't feel premium"
- **The shop ignores the app's identity.** `ShopBackground` is hardcoded `Color(0xFF0F0F13)`
  with violet/teal blobs and a faint grid; every card is `Color(0xFF161622)`/`Color(0xFF1E1E2E)`.
  The shop is **hard-dark regardless of the equipped theme** and owes nothing to the warm
  Studio identity (indigo→amber) the rest of the app now uses. It reads as a generic "gamer
  store," not a "vault of rewards earned through learning."
- **Emoji-as-art.** Avatars render as emoji (📐🏺⚛️…) unless a drawable exists
  (`Avatar.kt:118–139`); utilities are emoji (🛡️🔄⚡🎫); the generic fallback is 📦; themes are
  **three colored dots** (`ThemePreview.kt`). Banners (procedural canvases) and badges
  (procedural medallions) are genuinely good — they're the proof that handcrafted is possible.
  Emoji is the single biggest "not premium" driver.
- **Raw color/lit literals everywhere** — violates CLAUDE.md ("no raw `Color(0x…)`/`16.dp`/
  `RoundedCornerShape(…)` in new code"). `0xFF00CED1`, `0xFFFFD54A`, `0xFF2A2438`, `20.dp`,
  `RoundedCornerShape(20.dp)` recur across `ShopScreen.kt`/`ShopCards.kt`.

### 1.4 Rarity system
- `Rarity.kt` is **solid** — five tiers each with accent color, border gradient, glow strength
  (0→1), `isPrestige` (Epic+ get shimmer/pulse/confetti), and elevation. This is real and
  cross-surface. Keep it as the backbone.
- Gaps vs. brief: **(a)** one purchase sound for every tier (`SoundManager.playPurchase()`),
  no per-rarity audio; **(b)** **Legendary amber `0xFFFDB813` and Mythic `MedalGold` collide**
  — Mythic is not *instantly* distinct; **(c)** Common is correctly understated (glow 0) but has
  no identity of its own.

### 1.5 Item usefulness / filler
- **"Duolingo Theme"** (`db.js:763`) sells the *retired* brand-green identity — directly
  contradicts the BrandIdentity decision to retire Duolingo green and default to Studio. Filler/
  off-brand: rename+reskin or remove.
- **`items` response field** (`shop.js:144`) is a legacy concat kept "for backward compatibility";
  the client reads the typed lists. Dead weight on the contract.
- **`FeaturedShopItemCard`** (`ShopCards.kt:513`) is defined but never called. Dead code.
- Utilities are mostly fine (see §10). Everything else in the catalog has identity/clear purpose;
  the catalog is *narrow*, not bloated — the problem is presentation, not item count.

### 1.6 Economy (extends EconomyModel.md)
- Faucets are recurring & large; sinks were one-time until the seasonal rotation + coin→token
  conversion landed. Prices are **monotonic by rarity** (Common 50–100 · Rare 120–400 · Epic
  300–800 · Legendary 1000–1500 · Mythic 3000–4000) — good.
- The discount is means-tested help (`affordabilityDiscount`, `shop.js:20`) but is **dressed up
  as a sale** — red "DISCOUNTED"/"OFFER" tags with strikethrough (`ShopCards.kt:467,613`). That
  is the cheap-store / fake-urgency vibe the brief wants gone. The mechanic is fine; the *costume*
  is wrong.

### 1.7 Discoverability & info architecture summary
No search, no sort, no favorites/wishlist, no preview-on-profile, no titles in the shop, no
empty states, no "earnable rewards" showcase (earned cosmetics only appear once you own them, in
"My Collection"). A new player cannot see *what there is to chase*.

---

## 2. Useless / off-brand items to remove or rework (Deliverable #2)

| Item | Verdict | Action |
|---|---|---|
| `theme_duolingo` "Duolingo Theme" | Off-brand (retired identity) | **Rename + reskin** to a Studio-native theme (`Chalk`/`Blueprint`), or retire. Don't sell the old brand. |
| `FeaturedShopItemCard` composable | Dead code | Delete. |
| `items` legacy response field | Legacy | Drop after client confirms it reads typed lists only. |
| Emoji avatar fallbacks | Filler-feeling | Replace with crafted procedural avatar marks (see §8), not removal. |
| Three-dot `ThemePreview` | Under-built | Upgrade to a real mini-mockup swatch (see §8/§13). |

**Nothing else is "filler" by the brief's test** (identity / personalization / satisfaction /
progression). The catalog is small and intentional. The win is *re-presenting* it, plus adding
the **missing item types** in §8 to make it feel like a collection.

---

## 3. Shop identity (Deliverable #9 anchor — reward philosophy/world)

The shop is **"The Vault" — a collection earned through learning.** It inherits the app world:

- **Warm Studio surface, not gamer-dark.** The Vault tints to the equipped theme (Studio
  indigo→amber by default) instead of a fixed near-black. Premium = *warm paper + ink +
  precious-metal accents*, lit like a museum case, not an RGB store.
- **Mathematical, not generic-gaming.** Symmetry, golden ratio, constellations, geometric
  lattices, crystalline facets — already the language of `RankBadge`/banners. Every new asset
  draws from it.
- **Earned > bought.** Prestige (peak ranks, season titles, mastery, streak milestones) is
  *displayed and chase-able* in the shop but **never purchasable** (§9). Coins buy taste, not
  status.

One-line promise to design against: *"I want to earn that,"* and *"that item feels special."*

---

## 4. Information architecture — the redesign (Deliverable #6/#7)

Replace the single scroll with a **tabbed Vault**. A sticky header (balance + Season Tokens +
search) sits above a tab row; each tab is its own lazy list so nothing is bloated.

```
┌ THE VAULT ───────────────────────────────────────────────┐
│  🪙 1,240   👑 3 tokens            [ search ⌕ ]            │  ← sticky wallet + search
│  [ Featured ][ Cosmetics ][ Titles ][ Effects ][ Themes ] │  ← scrollable tab row
│  [ Utilities ][ Seasonal ][ Collection ][ Earnable ]      │
├───────────────────────────────────────────────────────────┤
│  (tab body: filter chips + sort + cards)                  │
└───────────────────────────────────────────────────────────┘
```

**Tabs (map to existing data; new ones noted):**
- **Featured** — *one* dynamic hero (today's spotlight) + this season's strip + 1–2 limited
  highlights. Collapses today's three competing heroes into one. (Reuses `featuredItems`,
  `seasonItems`.)
- **Cosmetics** — avatars + banners + badges in a 2-up collectible grid, with type filter chips
  (All/Avatars/Banners/Badges) + sort (Rarity ▾ / Price / Owned). (Reuses `catalogItems`.)
- **Titles** — *new shop surface* over the existing earned titles (`lib/titles.js`) **plus** a
  small set of new cosmetic titles (§8). Earned ones show their unlock condition; cosmetic ones
  show a price.
- **Effects** — *new type* profile auras + victory effects + tap effects (§8).
- **Themes** — full-mockup theme cards with live preview (§13). Drop/replace `theme_duolingo`.
- **Utilities** — the 4 boosters, framed as *convenience*, not power (§10).
- **Seasonal** — `seasonItems` + `tokenItems` + the coin→token wallet, framed as "leaves when
  the season ends."
- **Collection** — "My Collection" equip surface (current `ownedItems` row → a real grid), the
  completion-progress meter, and per-type ownership counts ("12 / 19 avatars").
- **Earnable** — *new* showcase of prestige you can't buy: peak-rank crests, season titles,
  mastery frames, streak relics — each with its requirement and progress. This is the
  "I want to earn that" engine. (Reuses earn-only `shop_items` cost=0 + titles + rank rewards.)

Search filters across the active tab (name + description). Sort is a single dropdown. Favorites/
wishlist: a ♡ toggle per card persisted in a new `user_wishlist` table; a "Wishlist" view in
Collection.

---

## 5. Hero section redesign (Deliverable #6)

One **Featured Spotlight** at the top of the Featured tab. Single source of desire:
- Large crafted preview of the item (real art, not emoji) on a warm museum-case panel that tints
  to rarity (rarity halo behind it, dashed orbit for Legendary+, slow float — reuse the good
  bits of `HeroShowcasePanel`).
- Hierarchy: rarity eyebrow → name → one-line hook → price/own-state → **inline Preview + Buy**.
- A thin "limited" / "leaves in 2d 4h" ribbon only when真 true (season/featured timers already
  exist: `featuredExpiresInSeconds`).
- A subtle "progression teaser" line: *"Reach Diamond to unlock the Euler avatar"* when the
  spotlight is rank-locked — turns the hero into a goal, not an ad.

Kill the duplicate "Featured Hero Exhibit" + "Today's Hero Item" headers; one spotlight only.

---

## 6. Item card system (Deliverable #6)

One `CollectibleCard` component, sized by context (grid / list / hero), every instance carrying:

| Slot | Source |
|---|---|
| Illustration | crafted art per type (§8); rarity-framed tile |
| Rarity indicator | `Rarity` accent + frame (already in `RarityCardFrame`) |
| Name + short description | `item.name`, `item.description` |
| Price / own-state | coins · tokens · "Owned" · "Equipped" · "Rank locked" |
| Preview action | opens the showcase/preview sheet |
| Favorite ♡ | wishlist toggle (new) |
| Optional tags | season badge, "Limited", unlock requirement |

Cards are **buyable/previewable in place** (a bottom-sheet preview, not a scroll-jump). The
2-up grid makes the catalog feel like a collection, not a feed.

---

## 7. Rarity system completion (Deliverable #4)

Keep `Rarity.kt`; close the three gaps so a tier is recognizable in <½ second:

| Tier | Accent (today) | Frame | Motion | **Add** |
|---|---|---|---|---|
| Common | slate | flat 1px | none | quiet — leave as the calm baseline |
| Rare | teal→blue | gradient 1px | none | faint sheen on hover/select |
| Epic | violet→indigo | gradient | shimmer + pulse | — |
| Legendary | amber | 2px gradient | shimmer + pulse + float | — |
| Mythic | **gold (collides w/ Legendary)** | 2px | shimmer | **iridescent/animated multi-hue frame** so it can never be mistaken for Legendary; signature reveal |

- **Per-rarity sound:** extend `SoundManager` — soft tick (Common/Rare), richer chime (Epic),
  fanfare swell (Legendary), signature motif (Mythic). Gate by the existing reduce-motion / sound
  settings.
- **Per-rarity reveal:** confetti already Epic+; give Mythic a distinct constellation-forming
  reveal (not "more confetti" — *different*, per brief "avoid excessive effects, maintain
  elegance").
- Recolor Mythic to an iridescent treatment (royal-violet→gold→rose sweep it already has in the
  gradient) and **use that, not flat `MedalGold`, for the accent** so Legendary≠Mythic at a glance.

---

## 8. Item design language & new types (Deliverable #3/#8)

**Design law:** every asset is *drawn from math* (symmetry, golden ratio, constellations,
fractals, lattices, crystalline facets) and rendered procedurally on a Compose `Canvas` (like
`RankBadge`/banners) so there are **no emoji, no clip-art, no bitmap dependency**. Each new
`type` is a thin column + an equip path + a renderer.

| New type | Schema | Equip column | Render | Examples |
|---|---|---|---|---|
| **Title (cosmetic)** | `type='title'` rows in `shop_items` | reuse `users.active_title` (coexist w/ earned ids) | text chip on profile | Pattern Seeker, Equation Apprentice, The Geometer, Proof Explorer, The Strategist |
| **Profile Effect** | `type='effect'` | new `users.active_effect` (migration) | aura behind avatar on profile/leaderboard | Constellation Glow, Geometric Pulse, Floating Symbols, Golden Dust (subtle) |
| **Victory Effect** | `type='victory'` | new `users.active_victory` | played on duel win (Arena) | Equation Formation, Pattern Reveal, Constellation Burst (no explosions) |
| **Tap/Cursor Effect** | `type='tap'` | new `users.active_tap` | ripple on answer tap | Geometric Ripple, Grid Pulse, Math Spark |
| **Mastery Frame** | `type='frame'`, `cost=0` (earn-only) | new `users.active_frame` | avatar ring on profile | Algebra Master, Geometry Master, Number-Theory Master — gated by `masteryEngine` |
| **Theme** (exists) | upgrade previews | `users.theme` | full mockup swatch | Midnight Geometry, Golden Ratio, Nebula Equations, Minimal Matrix, Aurora Calculus |

Renderers should be **families** (like `AchievementFamily` in `Avatar.kt:612`): a hue + motif
ladder so new rungs inherit a look automatically. New avatars get crafted procedural marks
(monogram-in-faceted-crest, à la `RankBadge`) instead of emoji.

---

## 9. Earned vs purchased — protect prestige (Deliverable #9)

**Never purchasable** (enforced today by the `cost<=0` purchase guard at `shop.js:233`; keep it
and extend to new earn-only types):

- Peak rank crests / rank badges (`badge_rank_*`, granted by `rankRewardService`).
- Season titles & Champion banners (`banner_champion_*`, Diamond-on-season-track).
- Mastery frames (new, §8 — `masteryEngine`-gated).
- Streak/commitment relics (`relic_*`).
- Elite/hidden achievement badges.

These get a **dedicated "Earnable" tab** (§4) that shows the locked item, its requirement, and
the player's progress toward it — so prestige is *visible and motivating* without ever being for
sale. Coins buy taste; play buys status.

---

## 10. Utilities — convenience, never power (Deliverable #10)

The four current utilities (`db.js:774–777`): Streak Shield (300), Retry Token (150), XP Booster
2× (200), Arena Gold Ticket (100).

- Streak Shield, Retry Token, XP Booster: pure **convenience/QoL** — fine. Keep. Reframe under a
  "Utilities — quality of life" header (not "boosters," which implies power).
- **Arena Gold Ticket** doubles the *Elo stakes* of a ranked duel — symmetric risk/reward
  (neutral-EV, you can lose more), so not pay-to-win, but it touches rating. Keep, but label
  it honestly as a **stakes** item, and never let a utility alter problem difficulty, grading,
  hints, or matchmaking. (Documented line: [MonetizationLine.md](MonetizationLine.md).)
- Possible new *convenience* utilities (all cosmetic-adjacent, no skill effect): Exercise Reroll
  Token (swap a generated problem), Theme/Customization Unlock Token (gift-a-skin), Extra
  Wishlist/Collection slots. **No** utility may buy correctness, rating, or curriculum.

---

## 11. Economy rebalance (Deliverable #5 — extends EconomyModel.md)

The hard work (taming bot-duel faucet, seasonal rotation sink, coin→token sink, monotonic
ladder) is **already done** (EconomyModel follow-ups marked ✓). This overhaul adds:

1. **Drop the fake-sale costume.** Remove the red "DISCOUNTED/OFFER" strikethrough styling. If a
   means-tested affordability price shows, present it quietly ("member price") — never as urgency.
2. **Re-tier for the new types.** Cosmetic titles cheap (Common/Rare, 100–400). Profile/tap
   effects Rare–Epic (250–800). Victory effects Epic–Legendary (600–1500). Mythic effects token-
   only. This widens the *aspirational* band without inflating the count.
3. **Keep the rarity → price → cadence mapping the brief asks for:** Common = frequent buys, Rare
   = aspirational, Epic = long-term, Legendary = significant achievement, Mythic = memorable
   milestone (token-only). The current ladder already satisfies this; new items slot into it.
4. **Wishlist drives saving.** A wishlisted item shows "you're 320 🪙 away" — turns surplus coins
   into a goal (the EconomyModel "always have something to save for" target).
5. Leave XP / rating / season points untouched (currency line unchanged).

---

## 12. UX systems (Deliverable #7) — search, filter, sort, favorites, preview, inventory

- **Search**: filters the active tab by name+description (client-side; catalog is small/cached).
- **Sort**: Rarity ▾ / Price ▲▼ / Newest / Owned-first (one dropdown).
- **Filter chips**: per-tab (type within Cosmetics; rarity within any).
- **Favorites/Wishlist**: ♡ per card → `user_wishlist(user_id, item_id)` (new migration) →
  `/api/shop/wishlist` GET/POST/DELETE; a Wishlist view + "X coins away" nudges.
- **Preview**: a bottom-sheet (not a scroll-jump) that previews the item *in context* — title on
  a mock profile chip, banner full-bleed, theme as a mini-app mockup, effect animated once.
- **Inventory integration**: Collection tab equips anything owned (reuse `equipOwned`), shows
  per-type counts and the completion meter; equipping from shop and from profile hit the same
  `/api/shop/equip` so the two surfaces stay in sync.

Target: buy in ≤2 taps (card → confirm), preview in 1, equip in 1.

---

## 13. Preview & purchase experience (Deliverable #7)

- **Preview** for banners/themes/titles/effects/frames so the user can "imagine ownership"
  before paying. Themes especially need the upgrade from 3 dots → a real mini-mockup (header bar
  + button + card in the theme's palette).
- **Purchase sequence:** tap Buy → lightweight confirm (cost + balance-after) → server purchase →
  **reveal** (keep `Motion.rewardEnter()` + per-rarity reveal from §7) → inventory updates →
  "Claim & Equip". No pop-up spam, no long interruption — one satisfying beat. (Today's reveal is
  already good; we're standardizing it and adding per-rarity audio/Mythic reveal.)

---

## 14. Empty states (Deliverable for Phase 16)

Every tab that can be empty gets illustration + human copy + CTA:
- Collection (none owned): *"Your vault is empty — for now. Earn coins by solving and dueling,
  then claim your first cosmetic."* → [Go to Featured].
- Titles (none earned): *"No titles yet. Climb the Arena and finish challenges to earn them."* →
  [Open Arena].
- Seasonal (off-season): *"No seasonal items right now. New rewards arrive each season."*
- Wishlist (empty): *"Tap ♡ on anything you're saving for."*

Reuse the app's existing empty-state component pattern (polish/perceived-perf system).

---

## 15. Polish checklist (Deliverable #10)

- [ ] Shop tints to the equipped theme; **zero raw `Color(0x…)`/`.dp`/`RoundedCornerShape(n.dp)`
      literals** — route through `theme/` tokens (CLAUDE.md rule).
- [ ] One `CollectibleCard`; consistent spacing/typography/corner-radius across all cards.
- [ ] Rarity instantly readable (Mythic ≠ Legendary); per-rarity sound + reveal.
- [ ] No emoji-as-art; every type has a crafted procedural renderer.
- [ ] Tabbed IA; search/sort/filter/favorites present and fast.
- [ ] Buy/preview/equip in place (no scroll-jump); reveal is one beat.
- [ ] Loading skeletons per tab (reuse `ShopItemSkeleton`); empty states everywhere.
- [ ] "Earnable" tab shows prestige + progress; purchase guard protects earn-only items.
- [ ] Reduce-motion + sound settings respected by every new animation/audio.
- [ ] `npm test` + `npm run lint` green; `gradlew assembleDebug` + `testDebugUnitTest` green;
      a Robolectric render test for the new shop shell + a `node:test` for new endpoints.

---

## 16. Build plan (staged — each stage ships & verifies independently)

Ordered by impact-per-risk. Stages are independent; none destabilizes the live economy/schema
beyond an append-only migration.

- **Stage A — Identity & polish (no schema): ✅ SHIPPED.** Added `VaultTheme` (the shop wraps in
  the equipped theme's dark scheme, so the Vault tints to theme); token-drove every surface (no raw
  `Color(0x…)` left in the shop) + new `SeasonGold` token; collapsed the 3 heroes into one Featured
  Spotlight; deleted dead `FeaturedShopItemCard`/`ShopHeroCard`; dropped the "OFFER" costume → quiet
  "member price"; upgraded `ThemePreview` to a mini app-mockup. (Kept the `items` field — it's read
  by `ProfileScreen`.) `gradlew assembleDebug` green.
- **Stage B — IA & UX: ✅ SHIPPED.** Tabbed Vault (Featured/Cosmetics/Themes/Utilities/Seasonal/
  Collection) with a sticky wallet header + search; one `CollectibleCard` 2-up grid; search/sort
  (Rarity/Price)/type-filter/♡-saved; client-local favorites (`ShopFavorites`, SharedPreferences);
  in-place preview via `NumeraBottomSheet` (no scroll-jump); Collection grid + completion meter +
  empty states. Split `HeroShowcasePanel` into `ShopPreviewSheet.kt` to keep files <600 lines.
  `gradlew assembleDebug` green. *Titles/Effects/Earnable tabs await Stage D's new item types.*
- **Stage C — Rarity completion: ✅ SHIPPED.** Mythic now has a distinct accent
  (`RarityMythicIridescent` orchid, no longer colliding with Legendary amber) and an **animated
  prismatic frame** (`mythicIridescentBrush` sweeping the `MythicIridescence` palette); a
  **per-rarity unlock fanfare** (`SoundManager.playUnlock(tier)`, escalating synthesized tones
  Common→Mythic) replaces the single purchase sound; and Mythic gets a **constellation-forming
  reveal** (`MythicConstellationReveal`, reduce-motion-aware) instead of confetti. `gradlew
  assembleDebug` green.
- **Stage D — New types (schema): ✅ SHIPPED.** Migration **v62** adds
  `users.active_effect/active_victory/active_tap/active_frame` (titles reuse `active_title`). Seeded
  **6 cosmetic Titles + 4 Profile Effects + 3 Victory Effects + 3 Tap Effects + 6 earn-only Mastery
  Frames** (`db.js`). `/equip` extended (`COLUMN_BY_TYPE` map + `none` unequips); `/api/shop` returns
  an **`earnableItems`** feed. Mastery Frames are **granted, never bought** — `routes/math.js` grants
  `frame_<strand>_master` on crossing the "Mastered" (100) milestone. Cosmetic titles join
  `lib/titles.js` (resolve via `titleName`; "earned" = owned, via `computeTitleStats.ownedTitles`).
  Client: new equip slots on `User`; `isEquippedBy` + `ShopItemArt` (procedural title nameplate +
  effect/victory/tap/frame motifs, no emoji) extended; **Titles / Effects / Earnable** tabs (generic
  `FilteredGridTab` + `EarnableTab`); the preview sheet shows "Earned through play" for earn-only
  items. Server tests + lint green; `assembleDebug` green. **Deferred (follow-up):** server-backed
  wishlist (kept client-local `ShopFavorites`), and *live rendering* of equipped effects/frames on
  the profile/duel surfaces (the items exist, buy, and equip; drawing the aura/ring/victory on those
  screens is a separate pass).
- **Live cosmetics — ALL surfaces: ✅ SHIPPED.** `ui/components/ProfileCosmetics.kt` now holds the
  whole cosmetic-rendering kit (procedural + reduce-motion):
  - `CosmeticAvatar` (avatar + earned **mastery-frame ring** + **profile-effect aura**) — on the
    ProfileScreen header **and** other players' `UserProfileDialog` (public-profile payload gained
    `active_frame`/`active_effect`). Plain circle when nothing equipped.
  - `VictoryEffectOverlay` (equation-formation / pattern-reveal / constellation-burst, one-shot) —
    the duel-win path (`DuelGameScreen`) plays the equipped victory instead of confetti.
  - `TapEffectLayer` (geometric-ripple / grid-pulse / math-spark) — wraps the gameplay screen and
    flourishes where each answer tap lands; the pointer handler is **observe-only** (never consumes),
    so answer taps still work.
  - The duel/gameplay screens have no `User`, so the keys are cached on
    `RetrofitClient.equippedVictoryKey` / `equippedTapKey`, set by MainTabsScreen's profile refresh.
  - **Test note:** `ShopScreenTest` was updated to select the "Seasonal" tab (the Vault is tabbed
    now). Full Android suite (85 tests) + server tests/lint green.
- **Stage E — Economy costume + wishlist nudges: ✅ SHIPPED.** The quiet member-price landed in
  Stage A; new-type prices were seeded monotonic-by-rarity in Stage D (titles 150–1200 · effects/
  tap 250–800 · victory 700–1300 · frames earn-only), so the ladder needed no re-tier (cf.
  EconomyModel's "reviewed — no change needed"). Added the **"Saving for" nudge** (`SavingForBanner`
  on the Featured tab): your closest wishlisted-but-unaffordable item + "X 🪙 to go" + a progress
  bar, tap to preview — turns surplus coins into a goal. `assembleDebug` green.

Verification per stage: server `npm test`/`npm run lint`; Android `assembleDebug` +
`testDebugUnitTest`; manual BlueStacks smoke for the visual stages.
