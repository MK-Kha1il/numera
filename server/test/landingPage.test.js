// The public root page: says what Numera is, links to the no-login pages, and shows server status.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

test('the root page describes the app and links to the public pages', async () => {
  const r = await api(ctx.base, 'GET', '/');
  assert.equal(r.status, 200);
  const html = String(r.body);
  assert.match(html, /math practice game/i);
  assert.match(html, /No ads/i);
  assert.match(html, /href="\/learn"/);
  assert.match(html, /href="\/worksheet"/);
  assert.match(html, /href="\/download-apk"/);
});

test('the root page shows a live server status line', async () => {
  const r = await api(ctx.base, 'GET', '/');
  const html = String(r.body);
  assert.match(html, /\d+ accounts?/);
  assert.match(html, /\d+ live duels?/);
  assert.match(html, /href="\/healthz"/);
});
