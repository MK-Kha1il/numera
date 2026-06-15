// Require helpers FIRST so db.js (pulled in transitively by security.js) binds the throwaway DB
// rather than the live numera.db. See helpers.js for why env must be set at module load.
require('./helpers');
const { test } = require('node:test');
const assert = require('node:assert');
const { sanitizeServerErrors } = require('../middleware/security');

// Builds a fake res whose statusCode we can set and whose json() we capture.
function fakeReqRes(statusCode) {
  const req = { method: 'GET', originalUrl: '/api/whatever' };
  const res = { statusCode, sent: undefined, json(body) { this.sent = body; return this; } };
  return { req, res };
}

test('5xx error bodies are replaced with a generic message + code', () => {
  const { req, res } = fakeReqRes(500);
  sanitizeServerErrors(req, res, () => {});
  res.json({ error: 'SQLITE_ERROR: no such column: secret_internal_detail' });
  assert.equal(res.sent.error, 'Something went wrong on our end. Please try again.');
  assert.equal(res.sent.code, 'server_error');
  assert.ok(!/SQLITE|secret_internal_detail/.test(JSON.stringify(res.sent)), 'no internals leak');
});

test('4xx error messages pass through untouched (intentional user-facing copy)', () => {
  const { req, res } = fakeReqRes(400);
  sanitizeServerErrors(req, res, () => {});
  res.json({ error: 'Username already exists' });
  assert.equal(res.sent.error, 'Username already exists');
});

test('successful 2xx bodies pass through untouched', () => {
  const { req, res } = fakeReqRes(200);
  sanitizeServerErrors(req, res, () => {});
  res.json({ success: true, value: 42 });
  assert.deepEqual(res.sent, { success: true, value: 42 });
});

test('a 5xx body without an error string is left alone', () => {
  const { req, res } = fakeReqRes(503);
  sanitizeServerErrors(req, res, () => {});
  res.json({ status: 'down' });
  assert.deepEqual(res.sent, { status: 'down' });
});
