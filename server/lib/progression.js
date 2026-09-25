// Pure progression/ranking utilities (no DB, no side effects) — safe to import anywhere
// and unit-tested in test/progression.test.js. Extracted from server.js so route modules
// can share them.

// Map a learning level (1..N) to a tier + division label (e.g. "Gold II").
function calculateRank(level) {
  const ranks = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster'];
  const tierSize = 9; // 3 divisions * 3 levels per division = 9 levels per tier
  const tierIdx = Math.min(Math.floor((level - 1) / tierSize), ranks.length - 1);
  const currentTier = ranks[tierIdx];

  const subLevel = (level - 1) % tierSize;
  let divisionStr = 'III';
  if (subLevel >= 6) divisionStr = 'I';
  else if (subLevel >= 3) divisionStr = 'II';

  return `${currentTier} ${divisionStr}`;
}

// Inverse-ish of calculateRank: turn a rank label into a sortable numeric value.
function getRankValue(rankStr) {
  if (!rankStr) return 0;
  const cleaned = rankStr.replace(/Unranked.*/i, '').trim();
  if (!cleaned) return 0;

  const ranks = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster'];
  const divisions = ['III', 'II', 'I'];

  let tierVal = 0;
  for (let i = 0; i < ranks.length; i++) {
    if (cleaned.startsWith(ranks[i])) {
      tierVal = (i + 1) * 10;
      break;
    }
  }

  let divVal = 0;
  for (let j = 0; j < divisions.length; j++) {
    if (cleaned.endsWith(divisions[j])) {
      divVal = j + 1;
      break;
    }
  }

  return tierVal + divVal;
}

// Per-strand internal template bands [min, max] — the level keys each strand's templates
// actually define (see CONCEPT_TO_LEVEL in mathGenerator.js). Without these, every strand
// fell through the generic 1+(level-1)/6 band, which lands BELOW some strands' key ranges
// (expressions starts at 11), collapsing them onto their easiest concept forever.
const STRAND_BANDS = {
  geometry: [2, 22],
  integers: [4, 11],
  decimals: [3, 11],
  fractions: [3, 11],
  number_sense: [6, 21],
  statistics: [7, 23],
  expressions: [11, 21],
  powers: [4, 15],
  graphing: [8, 21],
  inequalities: [7, 19],
  functions: [7, 19],
  sequences: [7, 19],
  equations: [7, 19],
  rates: [7, 19],
  factors: [7, 19],
};

// Map a UI level + category to the generator's internal level band (milestones pass through).
function normalizeLevelForGenerator(category, level) {
  const parsedLevel = parseInt(level, 10);
  if (isNaN(parsedLevel) || parsedLevel <= 0) return 1;
  if (parsedLevel === 10 || parsedLevel === 20 || parsedLevel === 30 || parsedLevel === 40 || parsedLevel === 50 || parsedLevel === 60) {
    return parsedLevel;
  }
  const cat = (category || 'arithmetic').toLowerCase().replace(' ', '_');
  const index = Math.floor((parsedLevel - 1) / 6);
  if (cat === 'algebra') {
    // 11..19 for index 0..8 (linear → quadratic → systems → matrices); index 9+ steps into Systems II
    // (21/22/23) then Quadratics II (24/25/26/27 — factoring, formula, discriminant, completing the
    // square), skipping the level-20 Fermat boss (force-routed by level===20). Cap at 27.
    if (index <= 8) return 11 + index;          // 11..19
    return Math.min(21 + (index - 9), 27);      // 21..27, then held
  } else if (cat === 'combinatorics') {
    return index >= 8 ? 29 : 21 + index;
  } else if (cat === 'calculus') {
    return index >= 8 ? 39 : 31 + index;
  } else if (cat === 'number_theory') {
    return 41 + Math.min(8, index);
  } else if (STRAND_BANDS[cat]) {
    const [min, max] = STRAND_BANDS[cat];
    const banded = Math.min(min + index, max);
    // Multiples of 10 are milestone template keys: generateProblemInstance force-routes
    // them to the boss category (level 10 → arithmetic/pythagorean), so a strand band must
    // never land on one — it would serve the wrong category AND miscount mastery.
    return banded % 10 === 0 ? Math.min(banded + 1, max) : banded;
  } else {
    return 1 + index;
  }
}

// Apply an XP gain to (xp-into-level, level): each level costs `level * 100` XP, carried over.
// The single copy of the level-up loop that used to be pasted into every reward route.
function applyXp(xp, level, gained) {
  let newXp = Math.max(0, (parseInt(xp, 10) || 0) + Math.max(0, parseInt(gained, 10) || 0));
  let newLevel = Math.max(1, parseInt(level, 10) || 1);
  while (newXp >= newLevel * 100) {
    newXp -= newLevel * 100;
    newLevel += 1;
  }
  return { xp: newXp, level: newLevel };
}

module.exports = { calculateRank, getRankValue, normalizeLevelForGenerator, applyXp };
