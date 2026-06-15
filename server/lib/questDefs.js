// The four rotating daily quests — single source of truth for routes/quests.js (list + claim)
// and routes/today.js (the "Today" session composer). Progress lives in the user_quests row;
// `progressCol`/`claimCol` name its columns.
const QUEST_DEFS = [
  {
    type: 'solved',
    name: 'Daily Solver',
    description: 'Solve 5 math problems to warm up.',
    target: 5,
    progressCol: 'solved_today',
    claimCol: 'solved_claimed',
    rewardCoins: 20,
    rewardXp: 30,
  },
  {
    type: 'duels',
    name: 'Arena Duelist',
    description: 'Win or play 2 Arena duels.',
    target: 2,
    progressCol: 'duels_today',
    claimCol: 'duels_claimed',
    rewardCoins: 30,
    rewardXp: 50,
  },
  {
    type: 'mistakes',
    name: 'Focus Practice',
    description: 'Solve or review 3 growth equations.',
    target: 3,
    progressCol: 'mistakes_today',
    claimCol: 'mistakes_claimed',
    rewardCoins: 25,
    rewardXp: 40,
  },
  {
    type: 'daily_puzzle',
    name: 'Daily Puzzle Master',
    description: 'Solve the rotating Daily Puzzle.',
    target: 1,
    progressCol: 'daily_puzzle_today',
    claimCol: 'daily_puzzle_claimed',
    rewardCoins: 40,
    rewardXp: 60,
  },
  {
    type: 'puzzle_rush',
    name: 'Rush Hour',
    description: 'Play a Puzzle Rush run.',
    target: 1,
    progressCol: 'puzzle_rush_today',
    claimCol: 'puzzle_rush_claimed',
    rewardCoins: 30,
    rewardXp: 45,
  },
  {
    type: 'srs_review',
    name: 'Memory Tune-Up',
    description: 'Clear 3 spaced reviews.',
    target: 3,
    progressCol: 'srs_review_today',
    claimCol: 'srs_review_claimed',
    rewardCoins: 25,
    rewardXp: 40,
  },
];

module.exports = { QUEST_DEFS };
