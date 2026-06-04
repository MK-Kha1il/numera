// Data-retention enforcement (see docs/ComplianceAudit.md M2). IP addresses in session and
// audit rows are personal data; we don't keep them forever. This purges:
//   - expired sessions and their refresh tokens,
//   - consumed/expired password-reset tokens,
//   - security audit logs older than the retention window,
//   - idempotency keys past their usefulness.
// Retention windows are conservative defaults; tune via env if needed and document in the
// Privacy Policy.
'use strict';

const logger = require('../logger');

const SECURITY_LOG_RETENTION_DAYS = Number(process.env.SECURITY_LOG_RETENTION_DAYS || 365);
const IDEMPOTENCY_RETENTION_DAYS = Number(process.env.IDEMPOTENCY_RETENTION_DAYS || 7);

// Run one purge pass. Best-effort: a failure on any statement is logged, never thrown, so a
// purge problem can't take down the server.
function purgeOnce(db) {
  const now = Math.floor(Date.now() / 1000);
  const securityCutoff = now - SECURITY_LOG_RETENTION_DAYS * 86400;
  const idemCutoff = now - IDEMPOTENCY_RETENTION_DAYS * 86400;

  const safeRun = (sql, params) =>
    db.run(sql, params, (err) => {
      if (err) logger.warn('[retention] purge statement failed:', err.message);
    });

  // Expired sessions + their refresh tokens.
  safeRun('DELETE FROM refresh_tokens WHERE expires_at < ?', [now]);
  safeRun('DELETE FROM user_sessions WHERE expires_at < ?', [now]);
  // Spent/expired reset tokens.
  safeRun('DELETE FROM password_reset_tokens WHERE expires_at < ? OR used_at > 0', [now]);
  // Old audit logs (keep recent for security investigations, drop the long tail of IPs).
  safeRun('DELETE FROM security_audit_logs WHERE timestamp < ?', [securityCutoff]);
  // Old idempotency keys.
  safeRun('DELETE FROM idempotency_keys WHERE created_at < ?', [idemCutoff]);
}

// Start a periodic purge (every 24h) and run one pass immediately. Returns the timer so a
// caller could clear it; the timer is unref'd so it never keeps the process alive on its own.
function startRetentionSweeper(db, intervalMs = 24 * 60 * 60 * 1000) {
  purgeOnce(db);
  const timer = setInterval(() => purgeOnce(db), intervalMs);
  if (timer.unref) timer.unref();
  return timer;
}

module.exports = { purgeOnce, startRetentionSweeper };
