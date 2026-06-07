'use strict';
// Behavioral anti-cheat scorer (see docs/specs/Spec-CompetitionExpansion.md §5).
//
// Math is uniquely cheatable: a second device or a solver yields instant, correct answers in a
// way chess positions don't. So the primary signal is TIMING vs. DIFFICULTY — a correct answer
// returned faster than a human could plausibly read and solve the problem is implausible. v1
// scores a single answer and aggregates a run into a verdict; later versions can fold in the
// NRS smurf/tilt signals and (on web) focus-loss/paste events.
//
// Pure functions + an env-tunable default config. PUZZLE_RUSH_SUPERHUMAN_MS=0 disables flagging
// (used by tests, which submit answers in microseconds).

function defaultConfig() {
  const base = Number(process.env.PUZZLE_RUSH_SUPERHUMAN_MS ?? 400);
  return {
    superhumanBaseMs: Number.isFinite(base) ? base : 400, // human floor at the easiest level; <=0 disables
    perLevelMs: 25, // each difficulty level adds this much to the floor
    cheatThreshold: 3, // this many fast-flagged answers in one run => 'cheat'
  };
}

// Minimum plausible time (ms) for a human to read + solve a correct answer at this difficulty.
function humanFloorMs(level, cfg = defaultConfig()) {
  if (!cfg || cfg.superhumanBaseMs <= 0) return 0; // disabled
  return cfg.superhumanBaseMs + Math.max(0, Number(level) || 0) * cfg.perLevelMs;
}

// Assess a single submission. Only a CORRECT answer can be "too fast" — a fast wrong answer is a
// misclick, not cheating. Returns { flagged, reason }.
function assessAnswer({ elapsedMs, correct, level } = {}, cfg = defaultConfig()) {
  if (!correct) return { flagged: false, reason: null };
  const floor = humanFloorMs(level, cfg);
  if (floor > 0 && Number(elapsedMs) >= 0 && Number(elapsedMs) < floor) {
    return { flagged: true, reason: `answered in ${elapsedMs}ms, below the ${floor}ms human floor at level ${level}` };
  }
  return { flagged: false, reason: null };
}

// Aggregate a run's fast-flag count into a verdict:
//   clean  -> count rating/rewards normally
//   review -> grant reward but exclude from competitive boards (benefit of the doubt)
//   cheat  -> withhold reward + exclude from boards
function verdictForRun({ flaggedFastCount = 0 } = {}, cfg = defaultConfig()) {
  if (flaggedFastCount <= 0) return 'clean';
  if (flaggedFastCount >= cfg.cheatThreshold) return 'cheat';
  return 'review';
}

module.exports = { defaultConfig, humanFloorMs, assessAnswer, verdictForRun };
