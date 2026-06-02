// Grants the cumulative cosmetic + badge rewards a user is entitled to at a given rank
// (idempotent via INSERT OR IGNORE; coins credited only on a newly-granted badge).
const { db } = require('../db');

function grantRankRewards(userId, rank, callback) {
  const rewards = [];
  const badgesWithCoins = [];

  if (rank.includes('Silver')) {
    rewards.push('avatar_hypatia', 'banner_fibonacci');
    badgesWithCoins.push({ id: 'badge_rank_silver', coins: 100 });
  }
  if (rank.includes('Gold')) {
    rewards.push('avatar_hypatia', 'banner_fibonacci', 'avatar_newton', 'banner_calculus');
    badgesWithCoins.push({ id: 'badge_rank_silver', coins: 100 });
    badgesWithCoins.push({ id: 'badge_rank_gold', coins: 200 });
  }
  if (rank.includes('Platinum')) {
    rewards.push('avatar_hypatia', 'banner_fibonacci', 'avatar_newton', 'banner_calculus', 'avatar_lovelace', 'banner_matrix');
    badgesWithCoins.push({ id: 'badge_rank_silver', coins: 100 });
    badgesWithCoins.push({ id: 'badge_rank_gold', coins: 200 });
    badgesWithCoins.push({ id: 'badge_rank_platinum', coins: 300 });
  }
  if (rank.includes('Diamond')) {
    rewards.push('avatar_hypatia', 'banner_fibonacci', 'avatar_newton', 'banner_calculus', 'avatar_lovelace', 'banner_matrix', 'avatar_euler', 'banner_geometry');
    badgesWithCoins.push({ id: 'badge_rank_silver', coins: 100 });
    badgesWithCoins.push({ id: 'badge_rank_gold', coins: 200 });
    badgesWithCoins.push({ id: 'badge_rank_platinum', coins: 300 });
    badgesWithCoins.push({ id: 'badge_rank_diamond', coins: 400 });
  }
  if (rank.includes('Master')) {
    rewards.push('avatar_hypatia', 'banner_fibonacci', 'avatar_newton', 'banner_calculus', 'avatar_lovelace', 'banner_matrix', 'avatar_euler', 'banner_geometry', 'avatar_einstein', 'banner_cosmos');
    badgesWithCoins.push({ id: 'badge_rank_silver', coins: 100 });
    badgesWithCoins.push({ id: 'badge_rank_gold', coins: 200 });
    badgesWithCoins.push({ id: 'badge_rank_platinum', coins: 300 });
    badgesWithCoins.push({ id: 'badge_rank_diamond', coins: 400 });
    badgesWithCoins.push({ id: 'badge_rank_master', coins: 500 });
  }
  if (rank.includes('Grandmaster')) {
    rewards.push('avatar_hypatia', 'banner_fibonacci', 'avatar_newton', 'banner_calculus', 'avatar_lovelace', 'banner_matrix', 'avatar_euler', 'banner_geometry', 'avatar_einstein', 'banner_cosmos');
    badgesWithCoins.push({ id: 'badge_rank_silver', coins: 100 });
    badgesWithCoins.push({ id: 'badge_rank_gold', coins: 200 });
    badgesWithCoins.push({ id: 'badge_rank_platinum', coins: 300 });
    badgesWithCoins.push({ id: 'badge_rank_diamond', coins: 400 });
    badgesWithCoins.push({ id: 'badge_rank_master', coins: 500 });
    badgesWithCoins.push({ id: 'badge_rank_grandmaster', coins: 600 });
  }

  badgesWithCoins.forEach((b) => {
    if (!rewards.includes(b.id)) {
      rewards.push(b.id);
    }
  });

  if (rewards.length === 0) {
    if (callback) callback();
    return;
  }

  let completed = 0;
  rewards.forEach((itemId) => {
    db.run(`INSERT OR IGNORE INTO user_inventory (user_id, item_id) VALUES (?, ?)`, [userId, itemId], function (errRun) {
      if (!errRun && this.changes > 0) {
        const badgeMatch = badgesWithCoins.find((b) => b.id === itemId);
        if (badgeMatch) {
          db.run('UPDATE users SET coins = coins + ? WHERE id = ?', [badgeMatch.coins, userId]);
        }
      }
      completed++;
      if (completed === rewards.length && callback) {
        callback();
      }
    });
  });
}

module.exports = { grantRankRewards };
