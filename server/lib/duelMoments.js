'use strict';
// Pure "clutch moment" recognition for the Living Arena (docs/CompetitiveArenaRedesign.md §5).
//
// Given the FINAL, already-graded outcome of a duel, decide which memorable-moment tags a win
// earned: comeback, perfect game, upset, streak-breaker, promotion, new peak, win streak. These
// are 100% COSMETIC — they never alter grading, rating, or rewards. The server computes them
// because it alone knows the opponent's prior streak, the player's prior peak, and the rank
// transition; the client merges its own observed-progression `wasTrailing` for the comeback tag.
//
// No DB/IO here — callers pass plain numbers/strings, so every branch is unit-testable.
const { getRankValue } = require('./progression');

// How much lower-rated you must be (and still win) for the win to count as an "upset".
const UPSET_RATING_GAP = 120;
// Opponent must have had at least this active win streak for breaking it to be a "streak breaker".
const STREAK_BREAK_MIN = 3;
// Your own streak reaches this length (after the win) to earn a "win streak" badge moment.
const WIN_STREAK_MIN = 3;

// Each tag: { key, label, emoji, accent }. `accent` is a semantic token the client maps to a
// color (gold/violet/green/blue/amber/teal). Ordered most-prestigious first so the client can
// headline tags[0].
function computeClutchTags({
  didWin = false,
  myScore = 0,
  maxScore = 0,
  myRating = 1000,
  oppRating = 1000,
  oldRank = '',
  newRank = '',
  brokeOppStreak = false,
  oppPriorStreak = 0,
  winStreak = 0,
  newPeak = false,
  wasTrailing = false,
} = {}) {
  const tags = [];
  if (!didWin) return tags; // clutch moments celebrate wins; defeats get rivalry framing elsewhere.

  // Promotion — the single most prestigious moment: you climbed a rank tier this match.
  const oldVal = getRankValue(oldRank);
  const newVal = getRankValue(newRank);
  if (newRank && newVal > oldVal && oldVal > 0) {
    tags.push({ key: 'promotion', label: `Promoted to ${newRank}`, emoji: '⬆️', accent: 'gold' });
  }

  // Upset — you beat someone meaningfully stronger.
  if (oppRating - myRating >= UPSET_RATING_GAP) {
    tags.push({ key: 'upset', label: 'Giant Slayer', emoji: '🐉', accent: 'violet' });
  }

  // Comeback — you were trailing and clawed it back (client observes the progression).
  if (wasTrailing) {
    tags.push({ key: 'comeback', label: 'Comeback', emoji: '🔥', accent: 'amber' });
  }

  // Perfect game — every problem correct (max possible score).
  if (maxScore > 0 && myScore >= maxScore) {
    tags.push({ key: 'perfect', label: 'Perfect Game', emoji: '💯', accent: 'green' });
  }

  // Streak breaker — you ended a hot opponent's run.
  if ((brokeOppStreak || oppPriorStreak >= STREAK_BREAK_MIN)) {
    tags.push({ key: 'streak_break', label: 'Streak Breaker', emoji: '⛓️', accent: 'teal' });
  }

  // New peak rating — a permanent reputation high-water mark.
  if (newPeak) {
    tags.push({ key: 'new_peak', label: 'New Peak Rating', emoji: '📈', accent: 'blue' });
  }

  // Win streak — your own form, surfaced at milestones (3+, and louder every match after).
  if (winStreak >= WIN_STREAK_MIN) {
    tags.push({ key: 'streak', label: `${winStreak}-Win Streak`, emoji: '🔥', accent: 'amber' });
  }

  return tags;
}

module.exports = { computeClutchTags, UPSET_RATING_GAP, STREAK_BREAK_MIN, WIN_STREAK_MIN };
