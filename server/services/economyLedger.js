// Economy ledger — aggregate daily coin flows per source (docs/EconomyModel.md follow-up: "wire coin
// faucet/sink counters into product analytics so this model can be validated against real behavior
// instead of estimated").
//
// Same privacy posture as routes/analytics.js: AGGREGATE rows only — (UTC day, source, flow) →
// coins + events. No user id, no timestamps beyond the day, so it is not personal data. Every coin
// faucet and sink calls recordCoins() AFTER its own transaction commits; the write is
// fire-and-forget and can never fail or slow the reward path.
'use strict';

const { db } = require('../db');
const logger = require('../logger');

// Allowlisted sources keep the table bounded and document every coin flow in the game.
const SOURCES = new Set([
  // faucets (the one-time 100-coin starting balance is excluded: it's 100 × signups)
  'solo_session', 'daily_puzzle', 'mistake_resolve', 'quest_claim', 'achievement_claim',
  'puzzle_rush', 'bot_duel', 'live_duel', 'async_duel', 'tournament', 'club_war', 'season_reward',
  'season_track', 'rank_reward',
  // sinks
  'shop_purchase', 'coin_conversion', 'streak_repair', 'recommit',
]);

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Record a coin flow. Positive amount = faucet (coins entered the economy), negative = sink.
 * Zero/invalid amounts and unknown sources are ignored.
 */
function recordCoins(source, amount) {
  const n = Math.trunc(Number(amount) || 0);
  if (!n || !SOURCES.has(source)) return;
  const flow = n > 0 ? 'in' : 'out';
  db.run(
    `INSERT INTO economy_daily (day, source, flow, coins, events) VALUES (?, ?, ?, ?, 1)
     ON CONFLICT(day, source, flow) DO UPDATE SET coins = coins + excluded.coins, events = events + 1`,
    [today(), source, flow, Math.abs(n)],
    (err) => {
      if (err) logger.warn(`[economy] ledger write failed (${source}): ${err.message}`);
    }
  );
}

module.exports = { recordCoins, SOURCES };
