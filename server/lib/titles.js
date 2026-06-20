'use strict';
// Pure competitive-title catalog + earn rules (no DB/IO), shared by routes/rating.js (the player's
// own title management) and routes/publicProfile.js (showing a title on someone else's profile). The
// earned SET is computed from a `stats` object the caller gathers; only the chosen title id is stored.

const TITLE_CATALOG = [
  { id: 'novice', name: 'Novice', desc: 'Welcome to the arena.' },
  { id: 'ranked', name: 'Ranked Competitor', desc: 'Complete your 5 placement results.' },
  { id: 'duelist', name: 'Duelist', desc: 'Play 10 ranked duels.' },
  { id: 'thinker', name: 'Deep Thinker', desc: 'Finish 10 reasoning rounds.' },
  { id: 'goldmind', name: 'Goldmind', desc: 'Reach Gold.' },
  { id: 'diamondmind', name: 'Diamond Mind', desc: 'Reach Diamond.' },
  { id: 'numerist', name: 'Numerist', desc: 'Reach Grandmaster — the apex.' },
  { id: 'nemesis', name: 'Nemesis', desc: 'Beat one rival 3 times.' },
];

// Tier indices match NRS.RANK_TIERS (Gold=2, Diamond=4, Grandmaster=6).
function isTitleEarned(id, s) {
  switch (id) {
    case 'novice': return true;
    case 'ranked': return !!s.placed;
    case 'duelist': return s.duels >= 10;
    case 'thinker': return s.reasoning >= 10;
    case 'goldmind': return s.peakTier >= 2;
    case 'diamondmind': return s.peakTier >= 4;
    case 'numerist': return s.peakTier >= 6;
    case 'nemesis': return s.maxH2HWins >= 3;
    default: return false;
  }
}

// Display name for a stored title id ('' or unknown → '').
function titleName(id) {
  const t = TITLE_CATALOG.find((x) => x.id === id);
  return t ? t.name : '';
}

module.exports = { TITLE_CATALOG, isTitleEarned, titleName };
