// Solo "serve tickets" — the server-side anchor for client-graded solo play (lib/soloRewards.js).
//
// Solo modes are graded on the device (instant feedback, hints, retries), so the server can't see
// each answer. What it CAN guarantee is that a paid completion corresponds to problems it actually
// served: every problem-serving endpoint issues a ticket here, and POST /api/math/complete must
// consume one for the same mode (and level, in level mode) inside its reward transaction. A ticket
// pays at most `uses` completions (1 for a session, N for an N-item archive page) and caps the
// solves a completion may claim at the number of problems served. Posting /complete without a
// serve — the scripted-farming path — earns nothing.
'use strict';

const { db } = require('../db');
const logger = require('../logger');

const SESSION_TTL_SECS = 3 * 60 * 60; // a served session must be finished within 3h
const LIST_TTL_SECS = 12 * 60 * 60; // a browsed archive/legacy list stays playable for 12h

const nowSec = () => Math.floor(Date.now() / 1000);

/**
 * Record that problems were served. Resolves when the ticket is stored (callers await it before
 * responding, so a fast client can never complete ahead of its own ticket). Never rejects.
 *   mode         solo game mode ('level', 'word_problems', 'archive_puzzle', …)
 *   level        level-mode only: the level the problems were generated for
 *   servedCount  problems served in one sitting (solve cap per completion)
 *   uses         completions this serve can pay for (default 1)
 */
function issueSoloTicket(userId, { mode, level = null, servedCount, uses = 1, ttlSecs } = {}) {
  const now = nowSec();
  const ttl = ttlSecs || (uses > 1 ? LIST_TTL_SECS : SESSION_TTL_SECS);
  const count = Math.max(0, parseInt(servedCount, 10) || 0);
  if (!userId || !mode || count === 0) return Promise.resolve();
  return new Promise((resolve) => {
    // Opportunistic cleanup of this learner's expired tickets (indexed on user_id).
    db.run('DELETE FROM solo_sessions WHERE user_id = ? AND expires_at <= ?', [userId, now], () => {
      db.run(
        'INSERT INTO solo_sessions (user_id, mode, level, served_count, remaining, served_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, mode, level == null ? null : parseInt(level, 10) || null, count, Math.max(1, uses), now, now + ttl],
        (err) => {
          if (err) logger.warn(`[solo] ticket insert failed for user ${userId}: ${err.message}`);
          resolve();
        }
      );
    });
  });
}

/**
 * Consume the newest live ticket for (mode[, level]) INSIDE the caller's transaction `tx`.
 * Returns { id, servedCount } or null when there is nothing to consume.
 */
async function consumeSoloTicket(tx, userId, mode, level = null) {
  const now = nowSec();
  const params = [userId, mode, now];
  let levelClause = '';
  if (mode === 'level') {
    levelClause = 'AND level = ?';
    params.push(parseInt(level, 10) || 0);
  }
  const ticket = await tx.get(
    `SELECT id, served_count FROM solo_sessions
      WHERE user_id = ? AND mode = ? AND remaining > 0 AND expires_at > ? ${levelClause}
      ORDER BY served_at DESC, id DESC LIMIT 1`,
    params
  );
  if (!ticket) return null;
  const used = await tx.run('UPDATE solo_sessions SET remaining = remaining - 1 WHERE id = ? AND remaining > 0', [ticket.id]);
  if (used.changes === 0) return null;
  return { id: ticket.id, servedCount: ticket.served_count };
}

module.exports = { issueSoloTicket, consumeSoloTicket, SESSION_TTL_SECS, LIST_TTL_SECS };
