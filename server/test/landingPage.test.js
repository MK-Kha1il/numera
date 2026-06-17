// The public landing page (ultra review #54/#70/#100): the root route must serve a
// learner/parent-facing page that states the value proposition AND the privacy story — not the
// old bare backend status dashboard. Guards against the page silently regressing to dev-only copy.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

test('the landing page leads with the product value proposition', async () => {
  const r = await api(ctx.base, 'GET', '/');
  assert.equal(r.status, 200);
  const html = String(r.body);
  assert.match(html, /competitive math platform/i, 'states what Numera is');
  assert.match(html, /An engine that learns you/i, 'shows the adaptive-engine pillar');
  assert.match(html, /Start learning/i, 'has a learner-facing call to action');
  // It is no longer fronted as a backend/status page.
  assert.doesNotMatch(html, /Backend Services/i, 'no longer a backend status page');
});

test('the landing page makes the privacy story public', async () => {
  const r = await api(ctx.base, 'GET', '/');
  const html = String(r.body);
  assert.match(html, /No ads/i, 'states the no-ads stance');
  assert.match(html, /trackers/i, 'states the no-trackers stance');
  assert.match(html, /parents can actually trust/i, 'addresses the parent persona');
  assert.match(html, /\/worksheet/, 'links parents to free printable worksheets');
  assert.match(html, /\/learn/, 'links to the free concept lessons (SEO/discovery)');
});

test('the landing page still serves live stats and the developer API section', async () => {
  const r = await api(ctx.base, 'GET', '/');
  const html = String(r.body);
  assert.match(html, /Active Learners/i, 'keeps the live stats');
  assert.match(html, /For developers/i, 'keeps a demoted API section');
  assert.match(html, /\/download-apk/, 'keeps the download CTA');
});
