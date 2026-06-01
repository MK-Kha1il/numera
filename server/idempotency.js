'use strict';

/**
 * Idempotency middleware (Stripe-style).
 *
 * Mobile networks retry. Without protection, a retried "I bought this" or
 * "I finished the level" request grants the reward twice. This middleware lets
 * a client send an `Idempotency-Key` header (a per-action UUID); the first
 * request runs normally and its successful response is stored, and any later
 * request with the same key replays that stored response instead of re-running
 * the handler.
 *
 * Backward compatible: a request WITHOUT the header flows through untouched, so
 * existing clients keep working (just without replay protection).
 *
 * Must be mounted AFTER `authenticateToken` so `req.user` is available — keys
 * are scoped per user. Uses the MAIN connection (not dbx's transaction
 * connection, which is reserved for BEGIN..COMMIT) so its autocommit writes
 * never land inside an in-flight money transaction.
 */

const { db } = require('./db');

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function idempotency(req, res, next) {
  const key = req.header('Idempotency-Key');
  if (!key) return next(); // no key → normal flow

  const userId = (req.user && req.user.id) || 0;
  const now = Math.floor(Date.now() / 1000);

  // Reserve the key first (atomic INSERT OR IGNORE on the PK).
  run(
    `INSERT OR IGNORE INTO idempotency_keys (idem_key, user_id, endpoint, created_at)
     VALUES (?, ?, ?, ?)`,
    [key, userId, req.path, now]
  )
    .then((stmt) => {
      if (stmt.changes === 1) {
        // We own this key. Capture the response and persist it on success.
        const originalJson = res.json.bind(res);
        res.json = (body) => {
          const status = res.statusCode || 200;
          if (status >= 200 && status < 300) {
            run(
              `UPDATE idempotency_keys SET response_status = ?, response_json = ?
               WHERE user_id = ? AND idem_key = ?`,
              [status, JSON.stringify(body), userId, key]
            ).catch(() => {});
          } else {
            // Non-2xx: release the reservation so a legitimate retry can proceed.
            run(
              `DELETE FROM idempotency_keys WHERE user_id = ? AND idem_key = ?`,
              [userId, key]
            ).catch(() => {});
          }
          return originalJson(body);
        };
        return next();
      }

      // Key already exists → replay (completed) or concurrent (still in-flight).
      get(
        `SELECT response_status, response_json FROM idempotency_keys
         WHERE user_id = ? AND idem_key = ?`,
        [userId, key]
      )
        .then((row) => {
          if (row && row.response_json != null) {
            return res
              .status(row.response_status)
              .json(JSON.parse(row.response_json));
          }
          // Reserved but not finished yet — the original request is still running.
          return res
            .status(409)
            .json({ error: 'Duplicate request still in progress. Retry shortly.' });
        })
        .catch(() =>
          res.status(500).json({ error: 'Idempotency lookup failed' })
        );
    })
    .catch((err) => {
      // Fail open: never block gameplay because the idempotency layer hiccuped.
      console.error('[idempotency]', err.message);
      next();
    });
}

module.exports = { idempotency };
