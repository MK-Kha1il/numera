// Level-aware difficulty for arena modes (pure; unit-tested in test/arenaDifficulty.test.js).
//
// Problem: every arena mode used fixed low levels (Puzzle Rush laddered from level 1,
// Bot/Async duels used a hardcoded 5–21 spread), so a level-30 player got "10 × 8".
// These helpers anchor difficulty to the PLAYER's level while keeping each mode's shape:
//  - Puzzle Rush still climbs one level per point — it just starts at your level.
//  - Bot/Async duels still ramp across the set — centred on your level, not level 5.
// Globally-shared sets (weekly tournament, club wars, authored challenges) intentionally
// do NOT use these: their fairness depends on everyone racing identical problems.

const MAX_LEVEL = 49;
// Puzzle Rush caps its *starting* rung so a max-level player still has somewhere to climb.
const MAX_RUSH_BASE = 40;

/** The generator's category bands by level (mirrors mathGenerator's CONCEPT_TO_LEVEL bands). */
function categoryForLevel(level) {
  if (level > 40) return 'number_theory';
  if (level > 30) return 'calculus';
  if (level > 17) return 'combinatorics';
  if (level > 10) return 'algebra';
  return 'arithmetic';
}

function clampLevel(level) {
  const n = Number(level);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(MAX_LEVEL, Math.round(n)));
}

/**
 * Puzzle Rush rung for a player who started at `baseLevel` and has `score` correct answers.
 * One level per point, starting from the player's own level.
 */
function rushLevel(baseLevel, score) {
  const base = Math.min(MAX_RUSH_BASE, clampLevel(baseLevel));
  return Math.min(MAX_LEVEL, base + Math.max(0, score));
}

/**
 * A `count`-problem [category, level] ladder centred on the player's level: starts slightly
 * below it (a warm-up) and ramps past it, so a set has shape without ever being trivial.
 */
function personalLadder(baseLevel, count) {
  const base = clampLevel(baseLevel);
  const ladder = [];
  for (let i = 0; i < count; i++) {
    const level = clampLevel(base - 2 + i * 2); // e.g. base 12, count 5 → 10,12,14,16,18
    ladder.push([categoryForLevel(level), level]);
  }
  return ladder;
}

module.exports = { categoryForLevel, clampLevel, rushLevel, personalLadder, MAX_LEVEL, MAX_RUSH_BASE };
