// RFC 6238 TOTP + RFC 4648 base32, implemented on Node's built-in crypto — no third-party
// dependency. Used for authenticator-app MFA (Google Authenticator, Authy, 1Password, etc.).
// SMS is deliberately not offered (SIM-swap risk); this is app-based only.
const crypto = require('crypto');

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// Encodes raw bytes to RFC 4648 base32 (no padding) — the format authenticator apps expect.
function base32Encode(buf) {
  let bits = 0;
  let value = 0;
  let out = '';
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return out;
}

function base32Decode(str) {
  const clean = str.replace(/=+$/, '').toUpperCase().replace(/\s/g, '');
  let bits = 0;
  let value = 0;
  const out = [];
  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

// 20 random bytes -> base32 secret (160-bit, the TOTP recommendation).
function generateSecret() {
  return base32Encode(crypto.randomBytes(20));
}

// Computes the 6-digit TOTP for a given base32 secret at `timeStep` (default: current 30s window).
function generateToken(secretBase32, timeStep = Math.floor(Date.now() / 1000 / 30), digits = 6) {
  const key = base32Decode(secretBase32);
  const buf = Buffer.alloc(8);
  // 64-bit big-endian counter. Bit-shifts overflow 32-bit ints, so write hi/lo halves.
  buf.writeUInt32BE(Math.floor(timeStep / 0x100000000), 0);
  buf.writeUInt32BE(timeStep >>> 0, 4);
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 10 ** digits).toString().padStart(digits, '0');
}

// Verifies a user-supplied token, allowing ±`window` steps of clock drift (default ±1 = ±30s).
// Constant-time compare per candidate window to avoid leaking which step matched.
function verifyToken(token, secretBase32, window = 1) {
  if (!token || !secretBase32) return false;
  const clean = String(token).replace(/\s/g, '');
  if (!/^\d{6}$/.test(clean)) return false;
  const current = Math.floor(Date.now() / 1000 / 30);
  for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
    const candidate = generateToken(secretBase32, current + errorWindow);
    const a = Buffer.from(candidate);
    const b = Buffer.from(clean);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
  }
  return false;
}

// Builds the otpauth:// URI an authenticator app consumes (typically rendered as a QR code).
function buildOtpAuthUri(secretBase32, accountName, issuer = 'Numera') {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  const params = [
    `secret=${encodeURIComponent(secretBase32)}`,
    `issuer=${encodeURIComponent(issuer)}`,
    'algorithm=SHA1',
    'digits=6',
    'period=30',
  ].join('&');
  return `otpauth://totp/${label}?${params}`;
}

module.exports = {
  base32Encode,
  base32Decode,
  generateSecret,
  generateToken,
  verifyToken,
  buildOtpAuthUri,
};
