// Tiny dependency-free leveled logger. Drop-in for console.* (same varargs), but:
//   - gates output by level (error < warn < info < debug) via LOG_LEVEL
//     (default: 'info' in production, 'debug' otherwise; 'silent' disables all),
//   - emits machine-parseable JSON lines in production (NODE_ENV=production) and
//     readable timestamped lines in dev,
//   - expands Error args to their stack so failures are never swallowed,
//   - routes error/warn to stderr and info/debug to stdout (console semantics).
//
// Usage:  const logger = require('./logger');  logger.error('[Auth]', err);
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const isProd = process.env.NODE_ENV === 'production';

function thresholdFor() {
  const configured = (process.env.LOG_LEVEL || (isProd ? 'info' : 'debug')).toLowerCase();
  if (configured === 'silent') return -1;
  return LEVELS[configured] != null ? LEVELS[configured] : LEVELS.info;
}

function stringify(arg) {
  if (arg instanceof Error) return arg.stack || `${arg.name}: ${arg.message}`;
  if (typeof arg === 'string') return arg;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

function emit(level, args) {
  if (LEVELS[level] > thresholdFor()) return;
  const msg = args.map(stringify).join(' ');
  const toStderr = level === 'error' || level === 'warn';
  const stream = toStderr ? process.stderr : process.stdout;
  if (isProd) {
    stream.write(JSON.stringify({ ts: new Date().toISOString(), level, msg }) + '\n');
  } else {
    stream.write(`${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} ${msg}\n`);
  }
}

module.exports = {
  error: (...args) => emit('error', args),
  warn: (...args) => emit('warn', args),
  info: (...args) => emit('info', args),
  debug: (...args) => emit('debug', args),
};
