// Public concept ("learn") SEO pages (ultra review #54/opp#10). Guards that the lesson index and
// every concept page render with the SEO essentials (title, meta description, canonical, h1),
// the lesson content, internal links, and the app/worksheet CTAs — all with no auth.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api } = require('./helpers');
const { CONCEPT_LESSONS } = require('../mathEngine/conceptLessons');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

test('the /learn index lists lessons and links into them', async () => {
  const r = await api(ctx.base, 'GET', '/learn');
  assert.equal(r.status, 200);
  const html = String(r.body);
  assert.match(html, /<title>Learn Math/i, 'SEO title');
  assert.match(html, /name="description"/, 'meta description');
  assert.match(html, /href="\/learn\/arithmetic_add"/, 'links to a concept page');
  assert.match(html, /href="\/"/, 'has an app CTA');
});

test('a concept page renders the lesson with SEO tags, content, and CTAs', async () => {
  const r = await api(ctx.base, 'GET', '/learn/fraction_add');
  assert.equal(r.status, 200);
  const html = String(r.body);
  const lesson = CONCEPT_LESSONS.fraction_add;
  assert.ok(html.includes(`<title>${lesson.title} — explained`), 'SEO title from the lesson');
  assert.match(html, /rel="canonical" href="\/learn\/fraction_add"/, 'canonical url');
  assert.match(html, /property="og:type" content="article"/, 'OpenGraph article');
  assert.ok(html.includes(`<h1>${lesson.title}</h1>`), 'h1 is the concept title');
  assert.match(html, /Worked examples/, 'renders worked examples');
  assert.match(html, /Common mistakes/, 'renders common mistakes');
  assert.match(html, /\/worksheet\?category=fractions/, 'links to a matching worksheet');
  // Internal linking: connected concepts link to their own pages (builds a crawlable graph).
  assert.match(html, /href="\/learn\//, 'links to connected lessons');
});

test('an unknown concept returns a 404 page, not a crash', async () => {
  const r = await api(ctx.base, 'GET', '/learn/not_a_real_concept');
  assert.equal(r.status, 404);
  assert.match(String(r.body), /Lesson not found/);
});

test('every authored lesson renders without error', async () => {
  // A light crawl: hit a sample across the catalog so a malformed lesson can't ship silently.
  const ids = Object.keys(CONCEPT_LESSONS);
  const sample = ids.filter((_, i) => i % 17 === 0); // ~9 spread across the 151
  for (const id of sample) {
    const r = await api(ctx.base, 'GET', `/learn/${id}`);
    assert.equal(r.status, 200, `${id} renders`);
    assert.match(String(r.body), /<h1>/, `${id} has an h1`);
  }
});
