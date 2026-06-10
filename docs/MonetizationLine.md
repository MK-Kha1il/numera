# Monetization — the line in the sand

> Ultra-review item #25 (2026-06-10). Numera currently earns $0 and ships no payments
> infrastructure. That is fine for now — what is *not* fine is building features without
> knowing which side of the future paywall they live on. Every week without this line makes
> the eventual paywall feel like taking things away. This doc draws the line **now**, so it
> never has to be drawn retroactively against users.
>
> Status: design decision only. No billing code exists or is implied by this doc. Any
> implementation must first revisit `docs/ComplianceAudit.md` (its explicit warning) and the
> DPIA, because paid features for likely-minors carry their own legal requirements.

## The model (decided)

**Freemium consumer subscription + school/teacher B2B2C later.** No ads, ever. No data
sales, ever. No pay-to-win, ever. The privacy posture ("no ads, no tracking, your data stays
yours") is a paid-for *feature* of this model, not a casualty of it.

## Free forever — the learning core

Everything on this list is the product's pedagogical and competitive integrity. It is never
gated, throttled, or made worse to sell something:

1. **All learning content** — every concept, lesson, worked example, manipulative, and
   generated problem, at every difficulty. Breadth and depth of *math* is never paywalled.
2. **The adaptive engine** — placement, difficulty adaptation, misconception diagnosis,
   Socratic hints, SRS review scheduling, mastery tracking (all five dimensions), transfer.
3. **Competitive play** — ranked duels, tournaments, puzzle rush, seasons, leagues, clubs,
   and the rating system. Matchmaking fairness and rating math are sacred: no paid rating
   protection, no paid streak items that touch competitive standings, no entry fees.
4. **The daily loop** — quests, daily puzzle, streaks (including the earned streak freeze),
   coins, achievements, the Today plan.
5. **Safety & access** — accounts, sync, privacy controls, data export/deletion,
   accessibility features. Charging for accessibility or privacy is disqualifying.
6. **Anything already shipped free.** Grandfather rule: features users have today never move
   behind the paywall. The paywall applies to *new additive value* only.

## Paid (consumer subscription) — convenience, identity, insight

Things that make the experience richer for someone who loves it, while their free classmate
loses nothing pedagogically:

1. **Premium cosmetics** — exclusive avatar/frame/theme/particle lines, seasonal collections,
   animated flair. (Coins-for-cosmetics stays; premium adds a parallel cosmetic tier, not a
   coin multiplier.)
2. **Deep insight reports** — the learner-model's rich internals as beautiful, shareable
   reports: longitudinal mastery analytics, misconception profile deep-dives, Wrapped-style
   recaps beyond the free weekly summary.
3. **Parent reports+** — the free tier gets a basic progress email; paid gets detailed
   weekly analysis, goal tracking against exam plans, and multiple children.
4. **Convenience** — offline practice packs, printable worksheet generation in bulk,
   priority support.
5. **Supporter identity** — a visible (tasteful) supporter badge. People pay to support
   products they love; let them be seen doing it.

## Paid (B2B, later) — the school channel

Site licenses for classrooms: rosters, assignments, class dashboards, standards reports,
admin controls, SSO/rostering integrations, and procurement-grade compliance docs. The
*student experience* stays the free experience — schools pay for the **teacher tooling and
administration**, never for student features.

## Never — under any revenue pressure

- **No ads, no ad SDKs, no third-party trackers.** Non-negotiable; it's the moat.
- **No pay-to-win**: nothing purchasable may affect rating, XP, coins-per-solve, league
  standing, matchmaking, or any leaderboard. (The earn-only trophy guard in `routes/shop.js`
  is the enforcement pattern: earned things are earned.)
- **No loot boxes / randomized paid rewards** — gambling mechanics aimed at minors.
- **No selling or sharing user data**, aggregate or otherwise.
- **No artificial degradation** — never add friction (waits, caps, nags) to the free tier to
  manufacture upgrade pressure. Hearts/energy must never become a monetization valve.
- **No dark-pattern sales UX** — no countdown-timer offers, no "your child is falling behind"
  fear copy to parents.

## Engineering implications (when the time comes)

- Entitlements live **server-side** (a `user_entitlements` concept), checked like any other
  authoritative state; the client renders, never decides.
- Payments via Play Billing first; the server verifies purchase tokens (same authoritative
  pattern as everything else). Idempotent grant paths, like every reward endpoint.
- Build the **fake-door test first**: a landing page with pricing and a waitlist answers
  "would anyone pay?" for a day of work, before any billing code.

## Litmus test for every future feature

Ask one question at design time: *"If a motivated 13-year-old with no money uses Numera
daily for a year, is their math education ever worse because they didn't pay?"*
If yes, the design is wrong — move the value to cosmetics, insight, or convenience.
