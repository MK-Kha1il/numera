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
  // Purchasable cosmetic titles (docs/ShopOverhaul.md §8). Bought in the Vault (shop_items type
  // 'title', value = these ids); "earned" = owned. They resolve to display names here the same way
  // earned titles do, so a bought title shows on the profile/public card just like a climbed one.
  { id: 'pattern_seeker', name: 'Pattern Seeker', desc: 'A Vault title for the eternally curious.', purchasable: true },
  { id: 'equation_apprentice', name: 'Equation Apprentice', desc: 'A Vault title for the rising solver.', purchasable: true },
  { id: 'the_geometer', name: 'The Geometer', desc: 'A Vault title for lovers of shape and proof.', purchasable: true },
  { id: 'proof_explorer', name: 'Proof Explorer', desc: 'A Vault title for the relentlessly rigorous.', purchasable: true },
  { id: 'the_strategist', name: 'The Strategist', desc: 'A Vault title for the calculating mind.', purchasable: true },
  { id: 'legend_of_numbers', name: 'Legend of Numbers', desc: 'A Vault title for the truly devoted.', purchasable: true },
];

// Titles you buy rather than climb to — "earned" means owned in inventory (see computeTitleStats).
const PURCHASABLE_TITLES = new Set(TITLE_CATALOG.filter((t) => t.purchasable).map((t) => t.id));

// Tier indices match NRS.RANK_TIERS (Gold=2, Diamond=4, Grandmaster=6).
function isTitleEarned(id, s) {
  if (PURCHASABLE_TITLES.has(id)) return !!(s.ownedTitles && s.ownedTitles.includes(id));
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
