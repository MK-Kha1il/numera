// Mastery Map service — assembles the Mathematical Mastery Profile for a user.
//
// Pure math lives in mathEngine/masteryMap.js; this layer gathers the DB signals
// (learner profiles, habit history, records), persists the once-a-day snapshot that
// powers growth trends and milestones, and shapes the HTTP response.
//
// HIDDEN ANALYTICS INVARIANT: the engine computes more than the client sees. Internal
// fields (per-domain focusConcept, dimension vectors) drive recommendations and future
// adaptation but are stripped from the public payload — use getInternalMasteryMap()
// server-side when adaptation needs the full picture.

const MasteryMap = require('../mathEngine/masteryMap');
const LearnerModel = require('../mathEngine/learnerModel');
const MasteryEngine = require('../mathEngine/masteryEngine');
const KnowledgeGraph = require('../mathEngine/knowledgeGraph');
const { CONCEPT_TO_LEVEL } = require('../mathGenerator');

const dbGet = (db, sql, params = []) =>
  new Promise((resolve, reject) => db.get(sql, params, (e, r) => (e ? reject(e) : resolve(r))));
const dbAll = (db, sql, params = []) =>
  new Promise((resolve, reject) => db.all(sql, params, (e, r) => (e ? reject(e) : resolve(r || []))));
const dbRun = (db, sql, params = []) =>
  new Promise((resolve, reject) => db.run(sql, params, (e) => (e ? reject(e) : resolve())));

const isoDate = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => isoDate(new Date(Date.now() - n * 86400000));

const conceptNames = () => {
  const names = {};
  for (const id of Object.keys(KnowledgeGraph.concepts)) names[id] = KnowledgeGraph.concepts[id].name;
  return names;
};

// Full internal picture — domains keep focusConcept, competencies keep raw evidence.
async function getInternalMasteryMap(db, userId) {
  const profiles = await LearnerModel.getLearnerSnapshot(db, userId);
  const user = await dbGet(db, 'SELECT streak, max_streak, solved_count FROM users WHERE id = ?', [userId]);
  const habitsRow = await dbGet(
    db,
    `SELECT COUNT(DISTINCT date) AS historyDays,
            COUNT(DISTINCT CASE WHEN date >= ? THEN date END) AS activeDays28
       FROM user_commitment_history WHERE user_id = ? AND solved_count > 0`,
    [daysAgo(27), userId]
  );

  const habits = {
    activeDays28: (habitsRow && habitsRow.activeDays28) || 0,
    historyDays: (habitsRow && habitsRow.historyDays) || 0,
    streak: (user && user.streak) || 0,
  };

  const names = conceptNames();
  const domains = MasteryMap.buildDomains(profiles, CONCEPT_TO_LEVEL, names);
  const competencies = MasteryMap.buildCompetencies(profiles, CONCEPT_TO_LEVEL, habits);
  const overall = MasteryMap.overallMastery(profiles);

  return { profiles, user, habits, domains, competencies, overall };
}

// Personal records — every one is a genuine already-earned fact from existing tables.
async function getRecords(db, userId, internal) {
  const rush = await dbGet(
    db,
    "SELECT MAX(score) AS best FROM puzzle_rush_runs WHERE user_id = ? AND status = 'finished' AND integrity_flag = 0",
    [userId]
  );
  const mastered = internal.profiles.filter(
    (p) => (p.exposure_count || 0) > 0 && MasteryEngine.computeMasteryProfile(p).overall >= 0.8
  ).length;
  const activeDomains = internal.domains.filter((d) => d.started > 0);
  const sharpest = activeDomains.length > 0 ? activeDomains.reduce((a, b) => (b.score > a.score ? b : a)) : null;

  const records = [
    { key: 'solved', label: 'Problems solved', value: (internal.user && internal.user.solved_count) || 0 },
    { key: 'max_streak', label: 'Longest climb', value: (internal.user && internal.user.max_streak) || 0, unit: 'days' },
    { key: 'mastered', label: 'Concepts mastered', value: mastered },
  ];
  if (rush && rush.best) records.push({ key: 'puzzle_rush', label: 'Puzzle Rush best', value: rush.best });
  if (sharpest) records.push({ key: 'sharpest', label: 'Sharpest domain', value: Math.round(sharpest.score * 100), unit: '%', detail: sharpest.name });
  return records;
}

// Persist at most one snapshot per UTC day; first write of the day wins.
async function writeDailySnapshot(db, userId, payload) {
  await dbRun(
    db,
    'INSERT OR IGNORE INTO mastery_snapshots (user_id, snap_date, payload, created_at) VALUES (?,?,?,?)',
    [userId, isoDate(new Date()), JSON.stringify(payload), Math.floor(Date.now() / 1000)]
  );
}

const parsePayload = (row) => {
  if (!row) return null;
  try {
    return JSON.parse(row.payload);
  } catch {
    return null;
  }
};

// Growth vs the nearest snapshot at least `days` old (best-effort; null until history exists).
async function snapshotAtLeast(db, userId, days) {
  const row = await dbGet(
    db,
    'SELECT payload FROM mastery_snapshots WHERE user_id = ? AND snap_date <= ? ORDER BY snap_date DESC LIMIT 1',
    [userId, daysAgo(days)]
  );
  return parsePayload(row);
}

function buildGrowth(current, snap7, snap30, domains) {
  const delta = (now, then) => (then == null ? null : Math.round((now - then) * 100) / 100);
  const movers = [];
  if (snap7 && snap7.domains) {
    for (const d of domains) {
      const then = snap7.domains[d.key];
      if (!then) continue;
      const dd = Math.round((d.score - then.score) * 100) / 100;
      if (dd !== 0) movers.push({ name: d.name, delta: dd });
    }
    movers.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }
  return {
    overallDelta7d: snap7 ? delta(current.overall, snap7.overall) : null,
    overallDelta30d: snap30 ? delta(current.overall, snap30.overall) : null,
    movers: movers.slice(0, 3),
  };
}

// Recent milestones = domain stage-ups observed between consecutive daily snapshots.
async function recentMilestones(db, userId, currentPayload) {
  const rows = await dbAll(
    db,
    'SELECT snap_date, payload FROM mastery_snapshots WHERE user_id = ? ORDER BY snap_date DESC LIMIT 35',
    [userId]
  );
  const series = rows
    .map((r) => ({ date: r.snap_date, payload: parsePayload(r) }))
    .filter((s) => s.payload)
    .reverse(); // ascending
  // Today's live state is the final point (the stored snapshot may predate this session's play).
  series.push({ date: isoDate(new Date()), payload: currentPayload });

  const rank = (stage) => MasteryMap.STAGE_ORDER.indexOf(stage);
  const milestones = [];
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1].payload.domains || {};
    const curr = series[i].payload.domains || {};
    for (const key of Object.keys(curr)) {
      const before = prev[key];
      const after = curr[key];
      if (!before || !after) continue;
      if (rank(after.stage) > rank(before.stage) && rank(after.stage) > 0) {
        const domain = MasteryMap.DOMAINS.find((d) => d.key === key);
        milestones.push({
          date: series[i].date,
          text: `${domain ? domain.name : key} reached ${after.stage}`,
        });
      }
    }
  }
  return milestones.slice(-5).reverse(); // newest first
}

// The public Mastery Profile payload for GET /api/mastery/profile.
async function getMasteryMap(db, userId) {
  const internal = await getInternalMasteryMap(db, userId);
  const { domains, competencies, overall } = internal;

  const identity = MasteryMap.buildIdentity(domains, competencies, overall);
  const titles = MasteryMap.buildTitles(domains, competencies);
  const recommendations = MasteryMap.buildRecommendations(domains, competencies);
  const records = await getRecords(db, userId, internal);

  const payload = MasteryMap.snapshotPayload(domains, competencies, overall);
  await writeDailySnapshot(db, userId, payload);

  const [snap7, snap30] = await Promise.all([
    snapshotAtLeast(db, userId, 7),
    snapshotAtLeast(db, userId, 30),
  ]);
  const growth = buildGrowth(payload, snap7, snap30, domains);
  const milestones = {
    recent: await recentMilestones(db, userId, payload),
    next: MasteryMap.nextMilestone(domains),
  };

  return {
    identity,
    // focusConcept is internal (it steers recommendations) — strip it from the wire.
    domains: domains.map((d) => {
      const pub = { ...d };
      delete pub.focusConcept;
      return pub;
    }),
    competencies,
    growth,
    records,
    milestones,
    titles,
    recommendations,
  };
}

module.exports = { getMasteryMap, getInternalMasteryMap };
