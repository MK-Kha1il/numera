// Shop & inventory: catalog with daily/featured rotation + dynamic discount, ACID-safe
// purchase, equip (with ownership checks), and utility consumption. Reward mutations are
// idempotent + transactional.
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { idempotency } = require('../idempotency');
const { withTransaction, httpError } = require('../dbx');
const cache = require('../cache');
const { getRankValue } = require('../lib/progression');
const { securityLog } = require('../middleware/security');

const router = express.Router();

// Cosmetic price multiplier (1.0 = full price). The ONLY discount is a gentle affordability
// help for engaged players who are low on coins. The old "hoarder discount" (cheaper the richer
// you are) was removed: it accelerated coin inflation and was a dark pattern (ultra-review #32 /
// docs/EconomyModel.md). Shared by the catalog (display) and purchase (charge) paths so the two
// can never drift — they used to be hand-duplicated.
function affordabilityDiscount(currentCoins, solvedCount) {
  if (currentCoins < 200 && solvedCount > 50) return 0.9;
  return 1.0;
}

// --- Seasonal sink (ultra-review #66/#75 / docs/EconomyModel.md) -----------------------------
// A fixed pool of season-exclusive cosmetics rotates across ranked seasons: the slot on sale is
// `activeSeasonId % SEASON_SLOTS`, so each season surfaces a different set and they are scarce.
// Surplus coins also convert into Season Tokens (a deep end-game sink) that buy token-only items.
const SEASON_SLOTS = 3;
const COIN_TO_TOKEN_RATE = 500;   // coins per 1 season token
const MAX_TOKENS_PER_CONVERT = 20; // anti-fat-finger cap per request

// The active ranked season, or null if none has started yet. Read-only (never rolls over — that
// is rating.js's job); the shop only needs the id (→ current slot) and the end time.
function activeSeason() {
  return new Promise((resolve, reject) => {
    db.get('SELECT id, name, end_at FROM seasons WHERE is_active = 1 LIMIT 1', (err, row) =>
      err ? reject(err) : resolve(row || null)
    );
  });
}

const currentSeasonSlot = (season) => (season ? season.id % SEASON_SLOTS : null);

router.get('/api/shop', authenticateToken, (req, res) => {
  // The shop catalog (shop_items) is identical for every user and only changes
  // on a server restart re-seed, so cache it. Everything below (inventory,
  // utilities, coins, discount) stays per-user and uncached.
  const buildShop = (allItems) => {
    db.all(`SELECT item_id FROM user_inventory WHERE user_id = ?`, [req.user.id], (errInv, inventoryRows) => {
      if (errInv) return res.status(500).json({ error: errInv.message });
      const inventory = inventoryRows.map((i) => i.item_id);

      db.all(`SELECT item_id, quantity FROM user_utilities WHERE user_id = ?`, [req.user.id], (errUtil, utilityRows) => {
        if (errUtil) return res.status(500).json({ error: errUtil.message });
        const utilities = utilityRows.map((u) => ({ item_id: u.item_id, quantity: u.quantity }));

        db.get(`SELECT coins, total_coins_earned, solved_count, rank, season_tokens FROM users WHERE id = ?`, [req.user.id], (errUser, user) => {
          if (errUser || !user) return res.status(500).json({ error: 'User data not found' });

          activeSeason().then((season) => {
          const slot = currentSeasonSlot(season);
          const totalEarned = user.total_coins_earned || 100;
          const currentCoins = user.coins || 0;
          const saveRate = currentCoins / totalEarned;

          const discountFactor = affordabilityDiscount(currentCoins, user.solved_count);

          const nowMs = Date.now();
          const todayStamp = Math.floor(nowMs / (86400 * 1000));
          const threeDayStamp = Math.floor(nowMs / (3 * 86400 * 1000));

          const secondsUntilMidnight = Math.ceil((new Date().setHours(24, 0, 0, 0) - nowMs) / 1000);
          const secondsUntilThreeDays = Math.ceil((((threeDayStamp + 1) * 3 * 86400 * 1000) - nowMs) / 1000);

          // Season-exclusive and token-only items live in their own rows, never the normal catalog.
          const purchaseableItems = allItems.filter((item) => item.cost > 0 && item.season_slot == null);

          const featuredPool = purchaseableItems.filter((item) => !item.is_utility && (item.rarity === 'Epic' || item.rarity === 'Legendary' || item.rarity === 'Mythic'));
          const dailyPool = purchaseableItems.filter((item) => !item.is_utility && (item.rarity === 'Common' || item.rarity === 'Rare' || item.rarity === 'Epic'));
          const utilityPool = purchaseableItems.filter((item) => item.is_utility === 1);

          const featured = [];
          if (featuredPool.length > 0) {
            const idx1 = threeDayStamp % featuredPool.length;
            const idx2 = (threeDayStamp + 3) % featuredPool.length;
            featured.push(featuredPool[idx1]);
            if (featuredPool.length > 1 && idx1 !== idx2) {
              featured.push(featuredPool[idx2]);
            } else if (featuredPool.length > 1) {
              featured.push(featuredPool[(idx1 + 1) % featuredPool.length]);
            }
          }

          const daily = [];
          if (dailyPool.length > 0) {
            for (let i = 0; i < 4; i++) {
              const idx = (todayStamp + i * 13) % dailyPool.length;
              const selectedItem = dailyPool[idx];
              if (!featured.some((f) => f.id === selectedItem.id)) {
                daily.push(selectedItem);
              }
            }
            let offset = 1;
            while (daily.length < 4 && dailyPool.length > daily.length) {
              const idx = (todayStamp + offset) % dailyPool.length;
              const selectedItem = dailyPool[idx];
              if (!featured.some((f) => f.id === selectedItem.id) && !daily.some((d) => d.id === selectedItem.id)) {
                daily.push(selectedItem);
              }
              offset++;
            }
          }

          const processRotatedItem = (item) => {
            if (item.is_utility) return { ...item, originalCost: item.cost, discountActive: false };

            const discountedCost = Math.round(item.cost * discountFactor);
            const hasDiscount = discountedCost < item.cost;
            return {
              ...item,
              cost: discountedCost,
              originalCost: item.cost,
              discountActive: hasDiscount,
            };
          };

          const featuredItems = featured.map((item) => processRotatedItem(item));
          const dailyItems = daily.map((item) => processRotatedItem(item));
          const utilityItems = utilityPool.map((item) => processRotatedItem(item));

          // Full catalog of every purchasable cosmetic so nothing is permanently
          // gated behind the daily/featured rotation. Sorted by rarity then cost.
          const rarityRank = { Common: 0, Rare: 1, Epic: 2, Legendary: 3, Mythic: 4 };
          const catalogItems = purchaseableItems
            .filter((item) => item.is_utility !== 1)
            .map((item) => processRotatedItem(item))
            .sort((a, b) => {
              const r = (rarityRank[a.rarity] ?? 0) - (rarityRank[b.rarity] ?? 0);
              return r !== 0 ? r : a.cost - b.cost;
            });

          // Concatenate all active items for backward compatibility
          const items = [...featuredItems, ...dailyItems, ...utilityItems];

          // This season's rotating cosmetics (coin-priced, discount applies), minus what's owned.
          const seasonItems = slot == null
            ? []
            : allItems
                .filter((item) => item.season_slot === slot && !inventory.includes(item.id))
                .map((item) => processRotatedItem(item));

          // Token-only prestige cosmetics (paid in season tokens), minus what's owned.
          const tokenItems = allItems
            .filter((item) => item.token_cost > 0 && !inventory.includes(item.id))
            .map((item) => ({ ...item, originalCost: item.cost, discountActive: false }));

          // EVERY owned cosmetic with full metadata — so the client can equip ANY of them anytime,
          // including earn-only items (badges, rank rewards, season Champion banners) that never appear
          // in a buyable list. Fixes "owned earn-only cosmetics only re-equip at grant time".
          const ownedItems = allItems.filter((item) => inventory.includes(item.id) && item.is_utility !== 1);

          // Earn-only prestige NOT yet owned — the "Earnable" showcase (docs/ShopOverhaul.md §9): badges,
          // mastery frames, relics, rank rewards. Cost 0 + no token price + not season-gated + unowned.
          // Their description carries the requirement, so the tab reads as "things to chase."
          const earnableItems = allItems.filter((item) =>
            item.is_utility !== 1 &&
            (!item.cost || item.cost <= 0) &&
            (!item.token_cost || item.token_cost <= 0) &&
            item.season_slot == null &&
            !inventory.includes(item.id)
          );

          res.json({
            items,
            featuredItems,
            dailyItems,
            utilityItems,
            catalogItems,
            seasonItems,
            tokenItems,
            ownedItems,
            earnableItems,
            seasonInfo: season
              ? { seasonId: season.id, seasonName: season.name, slot, endsAt: season.end_at }
              : null,
            seasonTokens: user.season_tokens || 0,
            inventory,
            utilities,
            expiresInSeconds: secondsUntilMidnight,
            featuredExpiresInSeconds: secondsUntilThreeDays,
            saveRate,
            discountApplied: discountFactor < 1.0,
          });
          }).catch((e) => res.status(500).json({ error: e.message }));
        });
      });
    });
  };

  const cachedCatalog = cache.get('shop:catalog');
  if (cachedCatalog) return buildShop(cachedCatalog);
  db.all(`SELECT * FROM shop_items`, (err, allItems) => {
    if (err) return res.status(500).json({ error: err.message });
    cache.set('shop:catalog', allItems, 5 * 60 * 1000); // catalog changes only on restart
    buildShop(allItems);
  });
});

router.post('/api/shop/purchase', authenticateToken, idempotency, (req, res) => {
  const { itemId } = req.body;
  if (!itemId) return res.status(400).json({ error: 'Item ID required' });
  const userId = req.user.id;

  // Whole purchase runs as one ACID transaction: deduct coins + grant item
  // commit or roll back together. A throw anywhere below restores the coins
  // automatically (ROLLBACK), so there is no manual refund code to get wrong.
  withTransaction(async (tx) => {
    const item = await tx.get(`SELECT * FROM shop_items WHERE id = ?`, [itemId]);
    if (!item) throw httpError(404, 'Item not found');

    const user = await tx.get(`SELECT * FROM users WHERE id = ?`, [userId]);
    if (!user) throw httpError(404, 'User not found');

    // Token-only prestige cosmetics: paid in Season Tokens, not coins. Atomic conditional
    // deduction mirrors the coin path so it can't overdraw or double-spend on concurrent taps.
    if (item.token_cost > 0) {
      const deduct = await tx.run(
        'UPDATE users SET season_tokens = season_tokens - ? WHERE id = ? AND season_tokens >= ?',
        [item.token_cost, userId, item.token_cost]
      );
      if (deduct.changes === 0) throw httpError(400, 'Not enough Season Tokens');
      try {
        await tx.run(`INSERT INTO user_inventory (user_id, item_id) VALUES (?, ?)`, [userId, itemId]);
      } catch (e) {
        if (e.message && e.message.includes('UNIQUE')) throw httpError(400, 'Item already purchased');
        throw e;
      }
      return { success: true, message: 'Prestige item claimed', tokensLeft: (user.season_tokens || 0) - item.token_cost };
    }

    // Earn-only trophies (achievement/rank/commitment badges and relics) are seeded with
    // cost 0 and are excluded from the catalog — but without this guard a direct API call
    // could "buy" them for 0 coins. They are granted by their reward services, never sold.
    if (!item.cost || item.cost <= 0) {
      throw httpError(400, 'This item is earned through play, not purchased');
    }

    // Rank locks for prestigious cosmetic items
    const requiredRank = item.required_rank;
    if (requiredRank && getRankValue(user.rank) < getRankValue(requiredRank)) {
      throw httpError(400, `Locked: Requires competitive rank ${requiredRank}`);
    }

    // Season-exclusive cosmetics are only purchasable while their slot is the active season's —
    // the scarcity that makes the seasonal rotation a recurring sink rather than a one-time buy.
    if (item.season_slot != null) {
      const season = await tx.get('SELECT id FROM seasons WHERE is_active = 1 LIMIT 1');
      const slot = season ? season.id % SEASON_SLOTS : null;
      if (item.season_slot !== slot) {
        throw httpError(400, 'This season-exclusive item is not available right now');
      }
    }

    // Cost with the affordability discount (the only discount; see affordabilityDiscount).
    const currentCoins = user.coins || 0;
    const discountFactor = affordabilityDiscount(currentCoins, user.solved_count);

    const finalCost = item.is_utility ? item.cost : Math.round(item.cost * discountFactor);

    // Atomic conditional deduction — guards against overspend / double-spend.
    const deduct = await tx.run(
      `UPDATE users SET coins = coins - ?, total_coins_spent = total_coins_spent + ? WHERE id = ? AND coins >= ?`,
      [finalCost, finalCost, userId, finalCost]
    );
    if (deduct.changes === 0) {
      throw httpError(400, 'Insufficient coins');
    }

    if (item.is_utility === 1) {
      const utilRow = await tx.get('SELECT quantity FROM user_utilities WHERE user_id = ? AND item_id = ?', [userId, itemId]);
      if (utilRow) {
        await tx.run('UPDATE user_utilities SET quantity = quantity + 1 WHERE user_id = ? AND item_id = ?', [userId, itemId]);
      } else {
        await tx.run('INSERT INTO user_utilities (user_id, item_id, quantity) VALUES (?, ?, 1)', [userId, itemId]);
      }
      if (itemId === 'item_xp_booster') {
        await tx.run('UPDATE users SET xp_booster_uses_left = xp_booster_uses_left + 3 WHERE id = ?', [userId]);
      }
      return { success: true, message: 'Booster purchased successfully', coinsLeft: currentCoins - finalCost };
    }

    // Cosmetic item: UNIQUE(user_id, item_id) enforces "buy once". A duplicate
    // INSERT throws, rolling back the deduction — i.e. idempotent re-purchase.
    try {
      await tx.run(`INSERT INTO user_inventory (user_id, item_id) VALUES (?, ?)`, [userId, itemId]);
    } catch (e) {
      if (e.message && e.message.includes('UNIQUE')) {
        throw httpError(400, 'Item already purchased');
      }
      throw e;
    }
    return { success: true, message: 'Item purchased successfully', coinsLeft: currentCoins - finalCost };
  })
    .then((payload) => res.json(payload))
    .catch((err) => res.status(err.status || 500).json({ error: err.message }));
});

// Convert surplus coins into Season Tokens — the deep end-game sink that keeps coins meaningful
// once a player owns the cosmetic catalog (docs/EconomyModel.md). The single atomic UPDATE spends
// coins and credits tokens together (conditional on coins >= cost), so it can't overdraw.
router.post('/api/shop/convert-coins', authenticateToken, idempotency, (req, res) => {
  const userId = req.user.id;
  let tokens = parseInt(req.body.tokens, 10);
  if (!Number.isFinite(tokens) || tokens <= 0) {
    return res.status(400).json({ error: 'tokens must be a positive integer' });
  }
  tokens = Math.min(tokens, MAX_TOKENS_PER_CONVERT);
  const coinCost = tokens * COIN_TO_TOKEN_RATE;

  withTransaction(async (tx) => {
    const deduct = await tx.run(
      'UPDATE users SET coins = coins - ?, total_coins_spent = total_coins_spent + ?, season_tokens = season_tokens + ? WHERE id = ? AND coins >= ?',
      [coinCost, coinCost, tokens, userId, coinCost]
    );
    if (deduct.changes === 0) {
      throw httpError(400, `Not enough coins — ${tokens} token(s) cost ${coinCost} coins.`);
    }
    const u = await tx.get('SELECT coins, season_tokens FROM users WHERE id = ?', [userId]);
    return { success: true, tokensGained: tokens, coinsSpent: coinCost, coins: u.coins, seasonTokens: u.season_tokens };
  })
    .then((payload) => res.json(payload))
    .catch((err) => res.status(err.status || 500).json({ error: err.message }));
});

router.post('/api/shop/equip', authenticateToken, (req, res) => {
  const { type, value } = req.body;
  if (!type || !value) return res.status(400).json({ error: 'Type and value required' });

  // type → user column. Stage D adds title/effect/victory/tap/frame slots (docs/ShopOverhaul.md §8).
  const COLUMN_BY_TYPE = {
    theme: 'theme',
    avatar: 'avatar',
    badge: 'active_badge',
    banner: 'active_banner',
    title: 'active_title',
    effect: 'active_effect',
    victory: 'active_victory',
    tap: 'active_tap',
    frame: 'active_frame',
  };
  const column = COLUMN_BY_TYPE[type];
  if (!column) return res.status(400).json({ error: 'Invalid configuration type' });

  // "none" unequips the slot (effects/title/etc. are optional). Stored as empty string.
  const clearing = value === 'none';
  const finalValue = clearing ? '' : value;

  // Allow equipping default starter items (and clearing) without ownership checks.
  const isDefault =
    clearing ||
    type === 'theme' ||
    (type === 'avatar' && value === 'avatar_pythagoras') ||
    (type === 'badge' && value === 'Math Novice') ||
    (type === 'banner' && value === 'banner_default');

  if (isDefault) {
    db.run(`UPDATE users SET ${column} = ? WHERE id = ?`, [finalValue, req.user.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, equipped: column, value: finalValue });
    });
  } else {
    // Verify user owns the item in user_inventory
    db.get(
      `SELECT 1 FROM user_inventory ui
       JOIN shop_items s ON ui.item_id = s.id
       WHERE ui.user_id = ? AND (s.value = ? OR s.id = ?)`,
      [req.user.id, value, value],
      (errInv, row) => {
        if (errInv) return res.status(500).json({ error: errInv.message });
        if (!row) {
          securityLog(req.user.id, 'economy_manipulation_attempt', req.ip, `Attempted to equip unowned item of type ${type} with value: ${value}`);
          return res.status(403).json({ error: 'You do not own this customization item.' });
        }

        db.run(`UPDATE users SET ${column} = ? WHERE id = ?`, [value, req.user.id], (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true, equipped: column, value });
        });
      }
    );
  }
});

router.post('/api/shop/consume-retry', authenticateToken, idempotency, (req, res) => {
  const userId = req.user.id;
  db.get("SELECT quantity FROM user_utilities WHERE user_id = ? AND item_id = 'item_retry_token'", [userId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row || row.quantity <= 0) {
      return res.status(400).json({ error: 'No Retry Tokens left' });
    }
    db.run(
      "UPDATE user_utilities SET quantity = quantity - 1 WHERE user_id = ? AND item_id = 'item_retry_token'",
      [userId],
      (errUpdate) => {
        if (errUpdate) return res.status(500).json({ error: errUpdate.message });
        res.json({ success: true, message: 'Retry token consumed successfully' });
      }
    );
  });
});

module.exports = router;
