// In-memory rate limiting + brute-force protection. Single-instance only (state lives in
// process memory) — move to a shared store (Redis) if the server is ever horizontally
// scaled. Loopback/LAN IPs are exempt so local dev and emulators are never throttled.
const { securityLog, isLocalIp } = require('./security');

// ---- Global per-IP API rate limit ------------------------------------------------
const apiRateLimits = {}; // ip -> timestamps[]
function globalRateLimiter(limit, windowMs) {
  return (req, res, next) => {
    const ip = req.ip;
    if (isLocalIp(ip)) return next();
    const now = Date.now();
    if (!apiRateLimits[ip]) apiRateLimits[ip] = [];
    apiRateLimits[ip] = apiRateLimits[ip].filter((t) => now - t < windowMs);
    if (apiRateLimits[ip].length >= limit) {
      securityLog(req.user ? req.user.id : null, 'rate_limit_triggered', ip, `Global rate limit exceeded (${limit} requests / ${windowMs}ms).`);
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    apiRateLimits[ip].push(now);
    next();
  };
}

// ---- Failed-login brute-force tracker --------------------------------------------
const failedLoginAttempts = {}; // ip -> timestamps[]

function checkFailedLogins(req, res, next) {
  const ip = req.ip;
  if (isLocalIp(ip)) return next();
  const now = Date.now();
  const fifteenMins = 15 * 60 * 1000;
  if (failedLoginAttempts[ip]) {
    failedLoginAttempts[ip] = failedLoginAttempts[ip].filter((t) => now - t < fifteenMins);
    if (failedLoginAttempts[ip].length >= 5) {
      const waitTime = Math.ceil((fifteenMins - (now - failedLoginAttempts[ip][0])) / 60000);
      securityLog(null, 'rate_limit_triggered', ip, `IP blocked from login due to brute-force protection. Waiting: ${waitTime}m.`);
      return res.status(429).json({ error: `Too many failed login attempts. Please wait ${waitTime} minutes.` });
    }
  }
  next();
}

function recordFailedLogin(ip) {
  if (isLocalIp(ip)) return;
  if (!failedLoginAttempts[ip]) failedLoginAttempts[ip] = [];
  failedLoginAttempts[ip].push(Date.now());
}

function clearFailedLogins(ip) {
  delete failedLoginAttempts[ip];
}

// ---- Per-ACCOUNT adaptive lockout ------------------------------------------------
// Complements the per-IP tracker above: keys on the attempted username so credential
// stuffing a single account is throttled even across rotating IPs (the per-IP limiter
// can't see that). Temporary by design — entries age out of the window, never permanent.
const ACCOUNT_MAX_FAILURES = 5;
const ACCOUNT_WINDOW_MS = 15 * 60 * 1000;
const accountFailures = {}; // normalizedUsername -> timestamps[]

function normAccount(username) {
  return typeof username === 'string' ? username.trim().toLowerCase() : '';
}

function activeFailures(key, now) {
  if (!accountFailures[key]) return [];
  accountFailures[key] = accountFailures[key].filter((t) => now - t < ACCOUNT_WINDOW_MS);
  if (accountFailures[key].length === 0) delete accountFailures[key];
  return accountFailures[key] || [];
}

// Middleware: blocks login for a locked account before the password is ever checked, so a
// locked account can't be probed. Returns a Retry-After-style minute estimate.
function checkAccountLockout(req, res, next) {
  const key = normAccount(req.body && req.body.username);
  if (!key) return next();
  const now = Date.now();
  const fails = activeFailures(key, now);
  if (fails.length >= ACCOUNT_MAX_FAILURES) {
    const waitTime = Math.ceil((ACCOUNT_WINDOW_MS - (now - fails[0])) / 60000);
    securityLog(null, 'account_locked', req.ip, `Login blocked: account '${key}' is temporarily locked. Wait ${waitTime}m.`);
    return res.status(429).json({ error: `Too many failed attempts for this account. Please wait ${waitTime} minutes.` });
  }
  next();
}

function recordAccountFailure(username) {
  const key = normAccount(username);
  if (!key) return { locked: false, count: 0 };
  if (!accountFailures[key]) accountFailures[key] = [];
  accountFailures[key].push(Date.now());
  const count = accountFailures[key].length;
  return { locked: count >= ACCOUNT_MAX_FAILURES, count };
}

function clearAccountFailures(username) {
  delete accountFailures[normAccount(username)];
}

// ---- Route-specific rate limiter --------------------------------------------------
const rateLimits = {}; // ip -> timestamps[]
function rateLimiter(limit, windowMs) {
  return (req, res, next) => {
    const ip = req.ip;
    if (isLocalIp(ip)) return next();
    const now = Date.now();
    if (!rateLimits[ip]) rateLimits[ip] = [];
    rateLimits[ip] = rateLimits[ip].filter((t) => now - t < windowMs);
    if (rateLimits[ip].length >= limit) {
      securityLog(req.user ? req.user.id : null, 'rate_limit_triggered', ip, `Route-specific rate limit exceeded (${limit} requests / ${windowMs}ms).`);
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    rateLimits[ip].push(now);
    next();
  };
}

module.exports = {
  globalRateLimiter,
  checkFailedLogins,
  recordFailedLogin,
  clearFailedLogins,
  rateLimiter,
  checkAccountLockout,
  recordAccountFailure,
  clearAccountFailures,
};
