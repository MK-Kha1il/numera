// Centralized password hashing + strength validation. Single seam so the rest of the
// app never touches argon2/bcrypt directly.
//
// Hashing: Argon2id is the algorithm for all NEW hashes (OWASP-recommended memory-hard
// KDF). Existing accounts were hashed with bcrypt (cost 10); `verifyPassword` transparently
// verifies BOTH ($argon2* and $2* prefixes) and `needsRehash` flags legacy/weak hashes so
// callers can re-hash on the next successful login — a zero-downtime migration with no forced
// reset. If argon2 ever fails to load (native addon), we fall back to bcrypt cost 12 so the
// app still runs (mission: "if Argon2id unavailable, use bcrypt with strong cost factors").
const bcrypt = require('bcryptjs');
const logger = require('../logger');
const { isCommonPassword } = require('./commonPasswords');

let argon2 = null;
try {
  argon2 = require('argon2');
} catch (err) {
  logger.error('[passwords] argon2 native module unavailable — falling back to bcrypt(12). ' + err.message);
}

// OWASP Argon2id baseline (2024): 19 MiB memory, 2 iterations, parallelism 1.
const ARGON2_OPTS = argon2
  ? { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 }
  : null;
const BCRYPT_FALLBACK_COST = 12;

async function hashPassword(plain) {
  if (argon2) return argon2.hash(plain, ARGON2_OPTS);
  return bcrypt.hash(plain, BCRYPT_FALLBACK_COST);
}

// Verifies against either an argon2 or a legacy bcrypt hash. Never throws on a malformed
// hash — returns false so a corrupt row can't 500 the login path.
async function verifyPassword(hash, plain) {
  if (!hash || typeof hash !== 'string') return false;
  try {
    if (hash.startsWith('$argon2')) {
      return argon2 ? await argon2.verify(hash, plain) : false;
    }
    // bcrypt ($2a/$2b/$2y) — always available (pure JS).
    return bcrypt.compareSync(plain, hash);
  } catch (err) {
    logger.error('[passwords] verify error: ' + err.message);
    return false;
  }
}

// True when the stored hash should be upgraded after a successful login: any legacy bcrypt
// hash (migrate to argon2), or — if we're in bcrypt-fallback mode — a hash below target cost.
function needsRehash(hash) {
  if (!hash || typeof hash !== 'string') return false;
  if (argon2) return !hash.startsWith('$argon2');
  // bcrypt fallback mode: "$2b$10$..." -> cost is the field after the 2nd '$'.
  const m = /^\$2[aby]\$(\d{2})\$/.exec(hash);
  return m ? parseInt(m[1], 10) < BCRYPT_FALLBACK_COST : true;
}

const MIN_PASSWORD_LENGTH = 10;
const MAX_PASSWORD_LENGTH = 100;

// NIST 800-63B-aligned strength policy: length + blocklist of common/breached-style
// passwords, NO arbitrary composition rules. Also rejects passwords that are just the
// username (a trivial credential-stuffing target). Returns { ok } or { ok:false, error }.
function validatePasswordStrength(password, username) {
  if (typeof password !== 'string') {
    return { ok: false, error: 'Password is required.' };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return { ok: false, error: `Password must be at most ${MAX_PASSWORD_LENGTH} characters.` };
  }
  if (isCommonPassword(password)) {
    return { ok: false, error: 'That password is too common or has appeared in breaches. Choose a less predictable one.' };
  }
  if (username && typeof username === 'string') {
    const u = username.trim().toLowerCase();
    const p = password.toLowerCase();
    if (u.length >= 3 && (p.includes(u) || u.includes(p))) {
      return { ok: false, error: 'Password must not contain your username.' };
    }
  }
  return { ok: true };
}

module.exports = {
  hashPassword,
  verifyPassword,
  needsRehash,
  validatePasswordStrength,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  usingArgon2: !!argon2,
};
