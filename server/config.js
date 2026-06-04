// Centralized runtime configuration. Reads process.env once and exposes typed-ish
// constants so the rest of the server never touches process.env directly.
const crypto = require('crypto');
const logger = require('./logger');

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// JWT signing secret. In production it MUST be provided explicitly — otherwise every
// server restart would mint a new random secret and silently invalidate all sessions
// (and a guessable/ephemeral secret is a security risk). In dev/test we fall back to a
// random secret with a loud warning so local runs still work.
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (isProduction) {
     
    logger.error('[FATAL] JWT_SECRET is required in production. Refusing to start.');
    process.exit(1);
  }
  JWT_SECRET = crypto.randomBytes(32).toString('hex');
   
  logger.warn(
    '[config] JWT_SECRET not set — generated an ephemeral dev secret. ' +
      'Sessions will not survive a restart. Set JWT_SECRET in .env for stable sessions.'
  );
}

// Comma-separated allow-list of additional CORS origins (e.g. "https://app.example.com").
const EXTRA_CORS_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Reverse-proxy trust. When the app runs behind a proxy/load balancer (nginx, Cloudflare,
// Heroku, etc.), Express must be told to trust X-Forwarded-For or `req.ip` becomes the proxy's
// IP — which silently collapses ALL per-IP rate limiting into one shared bucket. Set
// TRUST_PROXY to the number of trusted proxy hops (e.g. "1") or a value Express accepts
// ("loopback", a subnet, "true"). Left unset in dev so `req.ip` is the real socket address.
// Do NOT blanket-enable "true" in production — that lets clients spoof X-Forwarded-For.
const rawTrustProxy = process.env.TRUST_PROXY;
let TRUST_PROXY = false;
if (rawTrustProxy !== undefined && rawTrustProxy !== '') {
  if (/^\d+$/.test(rawTrustProxy)) TRUST_PROXY = parseInt(rawTrustProxy, 10);
  else if (rawTrustProxy === 'true') TRUST_PROXY = true;
  else TRUST_PROXY = rawTrustProxy; // 'loopback', a subnet, etc.
}

module.exports = {
  NODE_ENV,
  isProduction,
  JWT_SECRET,
  PORT: process.env.PORT || 3000,
  EXTRA_CORS_ORIGINS,
  TRUST_PROXY,
};
