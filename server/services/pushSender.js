// Firebase Cloud Messaging (HTTP v1) push sender. Credential-gated: with a service account it mints
// an OAuth2 access token (cached, refreshed before expiry) and POSTs to FCM; WITHOUT one it is a
// logged no-op, so the app, dev, and CI run with push simply disabled. Device tokens that FCM
// reports as gone (UNREGISTERED / invalid) are pruned so we stop retrying them.
//
// Wiring the real device side (FCM SDK + google-services.json + a FirebaseMessagingService that
// registers tokens via POST /api/notifications/push-token) is the one remaining manual step — see
// docs/specs/Spec-LifecycleNotifications.md.
const crypto = require('crypto');
const fs = require('fs');
const { db } = require('../db');
const logger = require('../logger');
const { FCM_SERVICE_ACCOUNT } = require('../config');

let serviceAccount = null; // { client_email, private_key, project_id }
let resolved = false; // we only attempt to parse the credential once

// Parse the configured service-account credential (inline JSON or a file path) exactly once.
function loadServiceAccount() {
  if (resolved) return serviceAccount;
  resolved = true;
  const raw = (FCM_SERVICE_ACCOUNT || '').trim();
  if (!raw) return null;
  try {
    const json = raw.startsWith('{') ? raw : fs.readFileSync(raw, 'utf8');
    const parsed = JSON.parse(json);
    if (!parsed.client_email || !parsed.private_key || !parsed.project_id) {
      throw new Error('service account missing client_email/private_key/project_id');
    }
    serviceAccount = parsed;
    logger.info(`[push] FCM enabled for project ${parsed.project_id}`);
  } catch (e) {
    logger.warn(`[push] FCM_SERVICE_ACCOUNT present but invalid (${e.message}); push disabled.`);
    serviceAccount = null;
  }
  return serviceAccount;
}

function isPushConfigured() {
  return !!loadServiceAccount();
}

// ── OAuth2 access token via the service-account JWT-bearer grant, cached until ~5 min pre-expiry ──
let cachedToken = null; // { token, exp }
const b64url = (buf) => Buffer.from(buf).toString('base64url');

async function getAccessToken() {
  const sa = loadServiceAccount();
  if (!sa) return null;
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 300 > now) return cachedToken.token;

  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  );
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${claim}`);
  const signature = signer.sign(sa.private_key, 'base64url');
  const assertion = `${header}.${claim}.${signature}`;

  try {
    const form =
      `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}` +
      `&assertion=${encodeURIComponent(assertion)}`;
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    if (!res.ok) {
      logger.warn(`[push] OAuth token exchange failed: ${res.status}`);
      return null;
    }
    const body = await res.json();
    cachedToken = { token: body.access_token, exp: now + (body.expires_in || 3600) };
    return cachedToken.token;
  } catch (e) {
    logger.warn(`[push] OAuth token exchange error: ${e.message}`);
    return null;
  }
}

function getTokens(userId) {
  return new Promise((resolve) => {
    db.all('SELECT token FROM push_tokens WHERE user_id = ?', [userId], (e, rows) =>
      resolve(rows ? rows.map((r) => r.token) : [])
    );
  });
}

function pruneToken(userId, token) {
  db.run('DELETE FROM push_tokens WHERE user_id = ? AND token = ?', [userId, token]);
}

/**
 * Send a push to every device a user has registered. Returns the count delivered. Safe no-op
 * (returns 0) when FCM isn't configured or the user has no tokens.
 */
async function sendPushToUser(userId, { title, body, data = {} }) {
  const sa = loadServiceAccount();
  if (!sa) return 0;
  const accessToken = await getAccessToken();
  if (!accessToken) return 0;
  const tokens = await getTokens(userId);
  if (!tokens.length) return 0;

  const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
  // FCM data values must be strings.
  const stringData = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]));
  let sent = 0;
  for (const token of tokens) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: { token, notification: { title, body }, data: stringData } }),
      });
      if (res.ok) {
        sent += 1;
        continue;
      }
      // 404 UNREGISTERED / 400 invalid-argument → the token is dead; stop retrying it.
      if (res.status === 404 || res.status === 400) pruneToken(userId, token);
      logger.warn(`[push] send failed user=${userId} status=${res.status}`);
    } catch (e) {
      logger.warn(`[push] send error user=${userId}: ${e.message}`);
    }
  }
  return sent;
}

module.exports = { isPushConfigured, sendPushToUser };
