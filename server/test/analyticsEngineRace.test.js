// Regression test for the get-then-insert race in AnalyticsEngine.recordLessonEvent.
//
// The old code did a SELECT-then-INSERT-or-UPDATE: under concurrency, several calls for the SAME
// template_type all found no row and all tried to INSERT, so the second failed with
// `SQLITE_CONSTRAINT: UNIQUE constraint failed: lesson_analytics.template_type` and its increment
// was lost. It surfaced when feeding the engine from competitive play (several bot-duel answers for
// one template type feeding in parallel — see services/engineFeed.js). The fix is a single atomic
// UPSERT. This test fires many concurrent calls for one template_type and asserts that none reject
// and that every event is counted (attempt_count == number of calls).
const { test } = require('node:test');
const assert = require('node:assert');
const sqlite3 = require('sqlite3').verbose();
const AnalyticsEngine = require('../mathEngine/analyticsEngine');

// A throwaway in-memory DB with just the lesson_analytics table (template_type is its PRIMARY KEY —
// the unique constraint the race used to trip). Mirrors the baseline in db.js.
function freshDb() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(':memory:');
    db.run(
      `CREATE TABLE lesson_analytics (
         template_type  TEXT PRIMARY KEY,
         attempt_count  INTEGER DEFAULT 0,
         success_count  INTEGER DEFAULT 0,
         abandon_count  INTEGER DEFAULT 0,
         avg_time_ms    REAL    DEFAULT 0,
         hint_rate      REAL    DEFAULT 0,
         confusion_score REAL   DEFAULT 0,
         last_updated   INTEGER DEFAULT 0
       )`,
      (e) => (e ? reject(e) : resolve(db))
    );
  });
}

const get = (db, sql, p = []) => new Promise((res, rej) => db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));

test('recordLessonEvent: many concurrent calls for the same template_type never reject and count every event', async () => {
  const db = await freshDb();
  const N = 50;
  const events = Array.from({ length: N }, (_, i) => ({
    correct: i % 2 === 0,          // 25 correct
    timeTaken: 1000,
    usedHint: false,
    abandoned: i % 5 === 0,        // 10 abandons (i = 0,5,...,45)
  }));

  // Fire them all at once at the same template_type — this is the race window.
  await Promise.all(events.map((ev) => AnalyticsEngine.recordLessonEvent(db, 'race_template', ev)));

  const row = await get(db, 'SELECT * FROM lesson_analytics WHERE template_type = ?', ['race_template']);
  assert.ok(row, 'a row exists');
  assert.equal(row.attempt_count, N, 'every concurrent event was counted (no lost increment)');
  assert.equal(row.success_count, events.filter((e) => e.correct).length, 'success_count totals correctly');
  assert.equal(row.abandon_count, events.filter((e) => e.abandoned).length, 'abandon_count totals correctly');

  await new Promise((r) => db.close(r));
});

test('recordLessonEvent: a single event seeds the row with the expected initial values', async () => {
  const db = await freshDb();
  await AnalyticsEngine.recordLessonEvent(db, 'solo_template', {
    correct: true, timeTaken: 2000, usedHint: true, abandoned: false,
  });
  const row = await get(db, 'SELECT * FROM lesson_analytics WHERE template_type = ?', ['solo_template']);
  assert.equal(row.attempt_count, 1);
  assert.equal(row.success_count, 1);
  assert.equal(row.abandon_count, 0);
  assert.equal(row.avg_time_ms, 2000);
  assert.equal(row.hint_rate, 1);
  assert.equal(row.confusion_score, 0.5, 'used a hint, not abandoned → 0.5 seed (preserved math)');
  await new Promise((r) => db.close(r));
});

test('recordLessonEvent: second event folds into the EWMA exactly as the old JS computed', async () => {
  const db = await freshDb();
  // Seed: correct, 2000ms, no hint, not abandoned → avg_time=2000, hint_rate=0, confusion=0.
  await AnalyticsEngine.recordLessonEvent(db, 't', { correct: true, timeTaken: 2000, usedHint: false, abandoned: false });
  // Second: wrong, 4000ms, hint used, not abandoned. n=2, alpha=0.5.
  await AnalyticsEngine.recordLessonEvent(db, 't', { correct: false, timeTaken: 4000, usedHint: true, abandoned: false });

  const row = await get(db, 'SELECT * FROM lesson_analytics WHERE template_type = ?', ['t']);
  assert.equal(row.attempt_count, 2);
  assert.equal(row.success_count, 1);
  assert.equal(row.abandon_count, 0);
  // avg_time = 2000 + 0.5*(4000-2000) = 3000
  assert.equal(row.avg_time_ms, 3000);
  // hint_rate = 0 + 0.5*(1-0) = 0.5
  assert.equal(row.hint_rate, 0.5);
  // confusion = 0.4*0.5 + 0.6*(0/2) = 0.2
  assert.ok(Math.abs(row.confusion_score - 0.2) < 1e-9, 'confusion score preserved');
  await new Promise((r) => db.close(r));
});
