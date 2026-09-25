// Solo-session reward table (pure: no DB/IO; unit-tested in test/soloRewards.test.js).
//
// The server is authoritative over progression and economy (CLAUDE.md). Before this module, every
// non-level solo mode was paid whatever `xpGained`/`coinsGained` the CLIENT sent (clamped only to
// 100 XP / 50 coins per call), a zero-solve session was counted as 5 solves (`parseInt(x) || 5`),
// the daily puzzle paid twice (its submit endpoint AND /complete), and a transfer challenge paid in
// full even when answered wrong. This table is now the single source of truth: /api/math/complete
// ignores client reward fields and derives everything from (mode, level, solves) here.
'use strict';

// Per-mode rules. `maxProblems` is a hard cap on solves per completion (the serve ticket's own
// served count is the tighter cap); `perSolve` pays per correct answer; `apra` is the level-mode
// formula; `paidElsewhere` means another endpoint already granted the reward.
const SOLO_MODES = {
  level: { maxProblems: 3, apra: true },
  archive_puzzle: { maxProblems: 1, perSolve: { xp: 20, coins: 5 } },
  legacy_puzzle: { maxProblems: 1, perSolve: { xp: 20, coins: 5 } },
  // Rewarded once per day by POST /api/math/daily-puzzle/submit (server-graded); /complete only
  // echoes that grant for the recap so it can never be collected twice.
  daily_puzzle: { maxProblems: 1, paidElsewhere: true, echo: { xp: 50, coins: 30 } },
  transfer_challenge: { maxProblems: 1, perSolve: { xp: 30, coins: 15 } },
  checkpoint_exam: { maxProblems: 12, perSolve: { xp: 12, coins: 6 } },
  word_problems: { maxProblems: 10, perSolve: { xp: 12, coins: 6 } },
  estimation: { maxProblems: 10, perSolve: { xp: 12, coins: 6 } },
  error_detection: { maxProblems: 10, perSolve: { xp: 12, coins: 6 } },
};

const isSoloMode = (mode) => Object.prototype.hasOwnProperty.call(SOLO_MODES, mode);
const normalizeMode = (mode) => (isSoloMode(mode) ? mode : 'level');

// Daily faucet taper: the first FULL_REWARD_SESSIONS solo completions of a local day pay in full;
// after that coins (and weekly league points) step down 10% per session to a 20% floor. XP — a
// progress signal, not a currency (docs/EconomyModel.md) — is never tapered. Mirrors the bot-duel
// decay: honest heavy practice still pays, grinding (or scripting) completions for coins does not.
const FULL_REWARD_SESSIONS = 15;
const TAPER_STEP = 0.1;
const TAPER_FLOOR = 0.2;

function faucetFactor(sessionNumberToday) {
  const n = Math.max(1, Math.floor(Number(sessionNumberToday) || 1));
  if (n <= FULL_REWARD_SESSIONS) return 1;
  return Math.max(TAPER_FLOOR, 1 - (n - FULL_REWARD_SESSIONS) * TAPER_STEP);
}

const clampInt = (v, lo, hi) => Math.min(hi, Math.max(lo, parseInt(v, 10) || 0));

/**
 * Base reward for one solo completion, before the streak/critical/booster modifiers.
 *   mode        solo game mode (unknown → 'level')
 *   level       the (lock-checked) level played — level mode only
 *   solvedCount correct answers, already capped to what was served
 *   errorsCount wrong attempts
 *   speedBonus / comboBonus  client-reported level bonuses (bounded + validated here)
 * Returns { xp, coins, perfect, speedBonus, comboBonus, paidElsewhere }.
 */
function baseReward({ mode, level, solvedCount, errorsCount, servedCount, speedBonus, comboBonus }) {
  const rules = SOLO_MODES[normalizeMode(mode)];
  const solved = clampInt(solvedCount, 0, rules.maxProblems);
  const errors = clampInt(errorsCount, 0, 1000);
  const served = Math.max(solved, clampInt(servedCount, 0, rules.maxProblems));
  const perfect = solved > 0 && errors === 0 && solved === served;
  const out = { xp: 0, coins: 0, perfect, speedBonus: 0, comboBonus: 0, paidElsewhere: !!rules.paidElsewhere };

  if (rules.paidElsewhere || solved === 0) return out;

  if (rules.perSolve) {
    out.xp = rules.perSolve.xp * solved;
    out.coins = rules.perSolve.coins * solved;
  } else if (rules.apra) {
    // The APRA formula: logarithmic difficulty scaling + bonuses, doubled on milestone levels.
    const lv = Math.max(1, parseInt(level, 10) || 1);
    // Bonuses only where they can be legitimate: speed needs a solve, the perfect-combo bonus
    // needs a flawless full run (a spoofed combo on a messy run is dropped, like /rating/session).
    out.speedBonus = clampInt(speedBonus, 0, 20);
    out.comboBonus = perfect ? clampInt(comboBonus, 0, 15) : 0;
    out.xp = 15 + Math.round(5 * Math.log2(lv)) + out.speedBonus + out.comboBonus;
    out.coins = 5 + Math.round(2 * Math.log2(lv)) + Math.round(out.speedBonus / 2) + Math.round(out.comboBonus / 3);
    if (lv % 10 === 0) {
      out.xp = Math.round(out.xp * 2);
      out.coins = Math.round(out.coins * 2);
    }
  }

  // Accuracy bonus: no wrong attempts at all.
  if (errors === 0) {
    out.xp = Math.round(out.xp * 1.2);
    out.coins = Math.round(out.coins * 1.2);
  }
  return out;
}

module.exports = { SOLO_MODES, FULL_REWARD_SESSIONS, isSoloMode, normalizeMode, faucetFactor, baseReward };
