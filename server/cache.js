'use strict';

/**
 * Tiny in-process TTL cache.
 *
 * Single-instance only. It lives in this Node process's memory, so it is
 * perfect while Numera runs as ONE server. If you ever scale to multiple
 * server processes/machines, replace this with Redis (or similar) so all
 * instances share one cache and invalidation is consistent — the get/set/del
 * surface below is intentionally Redis-shaped to make that swap easy.
 *
 * Use it only for data that is either immutable for the cache window or where a
 * little staleness is acceptable (catalogs, leaderboards). Never cache a
 * user's coin balance or anything you just mutated transactionally.
 */

const store = new Map(); // key -> { value, expiresAt (0 = never) }

function get(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

function set(key, value, ttlMs = 0) {
  store.set(key, { value, expiresAt: ttlMs > 0 ? Date.now() + ttlMs : 0 });
}

function del(key) {
  store.delete(key);
}

function clear() {
  store.clear();
}

module.exports = { get, set, del, clear };
