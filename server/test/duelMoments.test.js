// Unit tests for the pure clutch-moment engine (lib/duelMoments.js).
const { test } = require('node:test');
const assert = require('node:assert');
const { computeClutchTags } = require('../lib/duelMoments');

const keys = (tags) => tags.map((t) => t.key);

test('a loss earns no clutch tags', () => {
  const tags = computeClutchTags({ didWin: false, myScore: 100, maxScore: 100 });
  assert.deepStrictEqual(tags, []);
});

test('perfect game when winner scores the max', () => {
  const tags = computeClutchTags({ didWin: true, myScore: 100, oppScore: 60, maxScore: 100 });
  assert.ok(keys(tags).includes('perfect'));
});

test('not a perfect game when a problem was missed', () => {
  const tags = computeClutchTags({ didWin: true, myScore: 80, oppScore: 60, maxScore: 100 });
  assert.ok(!keys(tags).includes('perfect'));
});

test('upset only when meaningfully lower-rated and winning', () => {
  assert.ok(keys(computeClutchTags({ didWin: true, myRating: 1000, oppRating: 1200 })).includes('upset'));
  assert.ok(!keys(computeClutchTags({ didWin: true, myRating: 1000, oppRating: 1050 })).includes('upset'));
});

test('promotion when the rank tier increases', () => {
  const tags = computeClutchTags({ didWin: true, oldRank: 'Silver I', newRank: 'Gold III' });
  const promo = tags.find((t) => t.key === 'promotion');
  assert.ok(promo);
  assert.match(promo.label, /Gold III/);
});

test('no promotion tag when rank is unchanged', () => {
  const tags = computeClutchTags({ didWin: true, oldRank: 'Gold III', newRank: 'Gold III' });
  assert.ok(!keys(tags).includes('promotion'));
});

test('streak breaker when ending a hot opponent run', () => {
  assert.ok(keys(computeClutchTags({ didWin: true, oppPriorStreak: 5 })).includes('streak_break'));
  assert.ok(!keys(computeClutchTags({ didWin: true, oppPriorStreak: 1 })).includes('streak_break'));
});

test('comeback only when the client flags a trailing-then-won match', () => {
  assert.ok(keys(computeClutchTags({ didWin: true, wasTrailing: true })).includes('comeback'));
  assert.ok(!keys(computeClutchTags({ didWin: true, wasTrailing: false })).includes('comeback'));
});

test('win streak surfaces at the milestone and is labeled with the count', () => {
  assert.ok(!keys(computeClutchTags({ didWin: true, winStreak: 2 })).includes('streak'));
  const tags = computeClutchTags({ didWin: true, winStreak: 7 });
  const s = tags.find((t) => t.key === 'streak');
  assert.ok(s);
  assert.match(s.label, /7-Win Streak/);
});

test('promotion is headlined (ordered first) over lesser tags', () => {
  const tags = computeClutchTags({
    didWin: true, myScore: 100, maxScore: 100, oldRank: 'Silver I', newRank: 'Gold III',
    myRating: 1000, oppRating: 1300, winStreak: 4, newPeak: true,
  });
  assert.strictEqual(tags[0].key, 'promotion');
  // and the big upset+perfect+peak+streak all still register
  const k = keys(tags);
  assert.ok(k.includes('upset') && k.includes('perfect') && k.includes('new_peak') && k.includes('streak'));
});
