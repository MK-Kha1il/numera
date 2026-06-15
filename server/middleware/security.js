// Security primitives shared across the app: HTTP hardening headers, the audit-log
// writer, and the private/loopback IP check used to exempt LAN/dev traffic from limits.
const { db } = require('../db');
const logger = require('../logger');

// Defense-in-depth HTTP response headers, applied to every request.
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' ws: wss:; frame-ancestors 'none';"
  );
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  next();
}

// Single point of control for server-error leakage (ultra review #71): hundreds of routes do
// `res.status(500).json({ error: err.message })`, which leaks DB/internal details and shows the
// user unhelpful copy. Rather than hand-editing every call site, we wrap res.json once: any 5xx
// response carrying an `error` string is logged in full server-side and replaced with a generic,
// friendly message + stable code. Intentional 4xx messages (e.g. "Username already exists") pass
// through untouched — only server faults are sanitized.
function sanitizeServerErrors(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 500 && body && typeof body === 'object' && typeof body.error === 'string') {
      logger.error(`[server-error] ${req.method} ${req.originalUrl} -> ${body.error}`);
      return originalJson({ error: 'Something went wrong on our end. Please try again.', code: 'server_error' });
    }
    return originalJson(body);
  };
  next();
}

// Append a row to security_audit_logs and mirror it to stderr.
function securityLog(userId, eventType, ip, details) {
  const now = Math.floor(Date.now() / 1000);
   
  logger.warn(`[SECURITY AUDIT] Event: ${eventType} | User: ${userId} | IP: ${ip} | Details: ${details}`);
  db.run(
    'INSERT INTO security_audit_logs (timestamp, user_id, event_type, ip_address, details) VALUES (?, ?, ?, ?, ?)',
    [now, userId, eventType, ip, details],
    (err) => {
       
      if (err) logger.error('[SECURITY] Failed to write audit log:', err.message);
    }
  );
}

// True for loopback and RFC-1918 private ranges (development, emulators, LAN clients).
function isLocalIp(ip) {
  if (!ip) return false;
  const cleanIp = ip.replace(/^::ffff:/, '');
  if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp === 'localhost') {
    return true;
  }
  if (/^10\./.test(cleanIp)) return true;
  if (/^192\.168\./.test(cleanIp)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(cleanIp)) return true;
  return false;
}

module.exports = { securityHeaders, sanitizeServerErrors, securityLog, isLocalIp };
