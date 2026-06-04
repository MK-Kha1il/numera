// Pluggable outbound mailer. Two transports, chosen at boot from config:
//   - SMTP (nodemailer) when SMTP_HOST is configured — real delivery in production.
//   - Log transport otherwise — the message is written to the structured log so dev/CI runs
//     never need an email server and the code is still observable.
// Callers don't care which is active; sendMail() always resolves (delivery failures are logged,
// never thrown to the request path — an email hiccup must not 500 a password-reset request).
const { SMTP, MAIL_FROM } = require('../config');
const logger = require('../logger');

let transport = null;
let mode = 'log';

function getTransport() {
  if (transport || mode === 'log-only') return transport;
  if (SMTP.host) {
    try {
      const nodemailer = require('nodemailer');
      transport = nodemailer.createTransport({
        host: SMTP.host,
        port: SMTP.port,
        secure: SMTP.secure,
        auth: SMTP.user ? { user: SMTP.user, pass: SMTP.pass } : undefined,
      });
      mode = 'smtp';
      logger.info(`[mailer] SMTP transport ready (${SMTP.host}:${SMTP.port}).`);
    } catch (err) {
      logger.error('[mailer] SMTP configured but nodemailer unavailable; falling back to log: ' + err.message);
      mode = 'log-only';
    }
  } else {
    logger.warn('[mailer] No SMTP_HOST configured — emails will be logged, not delivered.');
    mode = 'log-only';
  }
  return transport;
}

// In-memory ring of recently-sent messages (last 50). Purely in-process — never exposed over
// HTTP. Lets tests assert what would be delivered without an SMTP server. Harmless in prod.
const sentMessages = [];
function recordSent(msg) {
  sentMessages.push({ to: msg.to, subject: msg.subject, text: msg.text, at: Date.now() });
  if (sentMessages.length > 50) sentMessages.shift();
}

/**
 * Sends an email (or logs it in no-SMTP mode). Resolves to a small status object; never rejects.
 * @param {{to:string, subject:string, text:string, html?:string}} msg
 */
async function sendMail(msg) {
  recordSent(msg);
  const t = getTransport();
  if (!t) {
    // Log transport: record metadata + body so the flow is testable/observable without SMTP.
    logger.info(`[mailer:log] to=${msg.to} subject="${msg.subject}"\n${msg.text}`);
    return { delivered: false, logged: true };
  }
  try {
    await t.sendMail({ from: MAIL_FROM, to: msg.to, subject: msg.subject, text: msg.text, html: msg.html });
    return { delivered: true };
  } catch (err) {
    logger.error(`[mailer] send failed to ${msg.to}: ${err.message}`);
    return { delivered: false, error: err.message };
  }
}

module.exports = { sendMail, sentMessages };
