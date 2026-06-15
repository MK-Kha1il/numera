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

// Map competitive Elo (+ games played) to a rank label. <5 games = placement.
function calculateRankFromElo(elo, matchesCount) {
  if (matchesCount === undefined || matchesCount === null || matchesCount < 5) {
    return `Unranked (Placement: ${matchesCount || 0}/5)`;
  }

  if (elo < 1100) return 'Bronze III';
  if (elo < 1200) return 'Bronze II';
  if (elo < 1300) return 'Bronze I';

  if (elo < 1400) return 'Silver III';
  if (elo < 1500) return 'Silver II';
  if (elo < 1600) return 'Silver I';

  if (elo < 1700) return 'Gold III';
  if (elo < 1800) return 'Gold II';
  if (elo < 1900) return 'Gold I';

  if (elo < 2000) return 'Platinum III';
  if (elo < 2100) return 'Platinum II';
  if (elo < 2200) return 'Platinum I';

  if (elo < 2300) return 'Diamond III';
  if (elo < 2400) return 'Diamond II';
  if (elo < 2500) return 'Diamond I';

  if (elo < 2700) return 'Master';
  return 'Grandmaster';
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
  statistics: [7, 19],
  expressions: [11, 18],
  powers: [4, 13],
  graphing: [8, 21],
  inequalities: [7, 15],
  functions: [7, 15],
  sequences: [7, 15],
  equations: [7, 15],
  rates: [7, 15],
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
    return index >= 8 ? 19 : 11 + index;
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

module.exports = { calculateRank, calculateRankFromElo, getRankValue, normalizeLevelForGenerator };
