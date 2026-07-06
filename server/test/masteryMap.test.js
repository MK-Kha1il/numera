// Mathematical Mastery Profile (mastery map): the two-layer domains × competencies model.
// Unit-tests the pure engine invariants (full curriculum coverage, anti-grind weighting,
// evidence gating) and smoke-tests GET /api/mastery/profile end-to-end, including the
// once-per-day snapshot write that powers growth trends.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

const MasteryMap = require('../mathEngine/masteryMap');
const { CONCEPT_TO_LEVEL } = require('../mathGenerator');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbGet = (sql, params) =>
  new Promise((resolve, reject) => ctx.mod.db.get(sql, params, (e, r) => (e ? reject(e) : resolve(r))));

// A well-practiced learner_profiles row for pure-engine tests.
const strongProfile = (conceptId, overrides = {}) => ({
  concept_id: conceptId,
  exposure_count: 10,
  accuracy_rate: 0.9,
  avg_response_ms: 6000,
  retention_score: 0.9,
  hint_usage_rate: 0.1,
  calculator_usage_rate: 0,
  retry_rate: 0.1,
  correct_first_try: 8,
  transfer_exposure: 0,
  transfer_success: 0,
  ...overrides,
});

// ── Pure engine invariants ───────────────────────────────────────────────────────────────

test('every playable concept maps to exactly one of the 8 domains', () => {
  let mapped = 0;
  for (const conceptId of Object.keys(CONCEPT_TO_LEVEL)) {
    const dom = MasteryMap.domainOf(conceptId, CONCEPT_TO_LEVEL[conceptId].category);
    assert.ok(dom, `unmapped concept: ${conceptId} (${CONCEPT_TO_LEVEL[conceptId].category})`);
    assert.ok(MasteryMap.DOMAINS.some((d) => d.key === dom), `unknown domain ${dom} for ${conceptId}`);
    mapped += 1;
  }
  const totals = MasteryMap.buildDomains([], CONCEPT_TO_LEVEL).reduce((s, d) => s + d.total, 0);
  assert.equal(totals, mapped, 'domain concept totals partition the curriculum');
});

test('anti-grind: massive volume on one concept cannot beat balanced mastery', () => {
  const arithmeticIds = Object.keys(CONCEPT_TO_LEVEL)
    .filter((id) => MasteryMap.domainOf(id, CONCEPT_TO_LEVEL[id].category) === 'arithmetic')
    .slice(0, 5);
  assert.ok(arithmeticIds.length === 5, 'have 5 arithmetic concepts to test with');

  // Grinder: 500 reps on ONE concept. Learner: solid mastery across five.
  const grinder = [strongProfile(arithmeticIds[0], { exposure_count: 500, correct_first_try: 400 })];
  const spread = arithmeticIds.map((id) => strongProfile(id));

  const domScore = (profiles) =>
    MasteryMap.buildDomains(profiles, CONCEPT_TO_LEVEL).find((d) => d.key === 'arithmetic').score;
  assert.ok(domScore(spread) > domScore(grinder), 'breadth of demonstrated mastery outranks grinding');
});

test('domain stages: unexplored, future-ready, and the progression ladder', () => {
  const domains = MasteryMap.buildDomains([], CONCEPT_TO_LEVEL);
  const trig = domains.find((d) => d.key === 'trigonometry');
  assert.equal(trig.comingSoon, true, 'trigonometry ships future-ready');
  assert.equal(trig.stage, 'On the horizon');
  for (const d of domains.filter((x) => !x.comingSoon)) {
    assert.equal(d.stage, 'Unexplored', `${d.key} starts unexplored`);
  }
});

test('competencies are evidence-gated: thin data stays hidden, enough data reveals', () => {
  const someId = Object.keys(CONCEPT_TO_LEVEL)[0];
  const thin = MasteryMap.buildCompetencies([strongProfile(someId, { exposure_count: 2 })], CONCEPT_TO_LEVEL, {});
  const accuracyThin = thin.find((c) => c.key === 'accuracy');
  assert.equal(accuracyThin.unlocked, false, '2 attempts is not evidence');
  assert.equal(accuracyThin.value, 0, 'locked competencies expose no number');

  const rich = MasteryMap.buildCompetencies(
    Object.keys(CONCEPT_TO_LEVEL).slice(0, 3).map((id) => strongProfile(id)),
    CONCEPT_TO_LEVEL,
    {}
  );
  const accuracyRich = rich.find((c) => c.key === 'accuracy');
  assert.equal(accuracyRich.unlocked, true, '30 attempts across 3 concepts is evidence');
  assert.ok(accuracyRich.value > 0.8, 'and the value reflects the demonstrated accuracy');
});

test('problem solving is EARNED only through transfer attempts', () => {
  const ids = Object.keys(CONCEPT_TO_LEVEL).slice(0, 3);
  const noTransfer = MasteryMap.buildCompetencies(ids.map((id) => strongProfile(id)), CONCEPT_TO_LEVEL, {});
  assert.equal(noTransfer.find((c) => c.key === 'problem_solving').unlocked, false);

  const withTransfer = MasteryMap.buildCompetencies(
    ids.map((id) => strongProfile(id, { transfer_exposure: 2, transfer_success: 2 })),
    CONCEPT_TO_LEVEL,
    {}
  );
  const ps = withTransfer.find((c) => c.key === 'problem_solving');
  assert.equal(ps.unlocked, true);
  assert.equal(ps.value, 1);
});

test('balanced growth is celebrated: Polymath needs breadth ACROSS domains, not one spike', () => {
  // Deep mastery of arithmetic alone: strong rows across many arithmetic concepts.
  const arithmeticIds = Object.keys(CONCEPT_TO_LEVEL)
    .filter((id) => MasteryMap.domainOf(id, CONCEPT_TO_LEVEL[id].category) === 'arithmetic');
  const specialist = arithmeticIds.map((id) => strongProfile(id, { exposure_count: 15, correct_first_try: 13 }));

  // The same effort spread over four domains.
  const domainsWanted = ['arithmetic', 'algebra', 'geometry', 'statistics'];
  const generalist = [];
  for (const dom of domainsWanted) {
    const ids = Object.keys(CONCEPT_TO_LEVEL)
      .filter((id) => MasteryMap.domainOf(id, CONCEPT_TO_LEVEL[id].category) === dom);
    for (const id of ids) generalist.push(strongProfile(id, { exposure_count: 15, correct_first_try: 13 }));
  }

  const titlesOf = (profiles) => {
    const doms = MasteryMap.buildDomains(profiles, CONCEPT_TO_LEVEL);
    const comps = MasteryMap.buildCompetencies(profiles, CONCEPT_TO_LEVEL, {});
    return MasteryMap.buildTitles(doms, comps);
  };
  const polymathFor = (profiles) => titlesOf(profiles).find((t) => t.id === 'balance_polymath');

  assert.equal(polymathFor(specialist).earned, false, 'one deep domain is not balance');
  assert.equal(polymathFor(generalist).earned, true, 'four proficient domains earn Polymath');
});

// ── Route smoke ──────────────────────────────────────────────────────────────────────────

test('a fresh learner gets an honest empty profile', async () => {
  const u = await registerUser(ctx.base);
  const r = await api(ctx.base, 'GET', '/api/mastery/profile', { token: u.token });
  assert.equal(r.status, 200);
  assert.equal(r.body.domains.length, 8);
  assert.equal(r.body.competencies.length, 10);
  assert.ok(r.body.competencies.every((c) => !c.unlocked), 'no competency pretends to know a new learner');
  assert.match(r.body.identity.headline, /unwritten/i);
  assert.equal(r.body.titles.filter((t) => t.earned).length, 0, 'no unearned titles');
  // Internal steering data must not leak to the client.
  assert.ok(r.body.domains.every((d) => !('focusConcept' in d)), 'focusConcept stays server-side');
});

test('play grows the profile, and the daily snapshot is written exactly once', async () => {
  const u = await registerUser(ctx.base);
  // Demonstrate understanding on a real arithmetic-domain concept via the engine event path.
  const conceptId = Object.keys(CONCEPT_TO_LEVEL).find(
    (id) => MasteryMap.domainOf(id, CONCEPT_TO_LEVEL[id].category) === 'arithmetic'
  );
  for (let i = 0; i < 4; i++) {
    const ev = await api(ctx.base, 'POST', '/api/engine/event', {
      token: u.token,
      body: { conceptId, correct: true, responseMs: 5000 },
    });
    assert.equal(ev.status, 200);
  }

  const r = await api(ctx.base, 'GET', '/api/mastery/profile', { token: u.token });
  assert.equal(r.status, 200);
  const arithmetic = r.body.domains.find((d) => d.key === 'arithmetic');
  assert.ok(arithmetic.started >= 1, 'arithmetic domain shows the practiced concept');
  assert.ok(arithmetic.score > 0, 'domain score reflects demonstrated mastery');
  assert.notEqual(arithmetic.stage, 'Unexplored');
  assert.ok(r.body.milestones.next, 'a next milestone is proposed once play starts');

  // Second fetch the same day: still exactly one snapshot row (INSERT OR IGNORE).
  await api(ctx.base, 'GET', '/api/mastery/profile', { token: u.token });
  const snaps = await dbGet('SELECT COUNT(*) AS n FROM mastery_snapshots WHERE user_id = ?', [u.user.id]);
  assert.equal(snaps.n, 1, 'one snapshot per user per day');
});

test('the public profile carries the mastery identity (competitive profiles read as identities)', async () => {
  const viewer = await registerUser(ctx.base);
  const target = await registerUser(ctx.base);
  const conceptId = Object.keys(CONCEPT_TO_LEVEL).find(
    (id) => MasteryMap.domainOf(id, CONCEPT_TO_LEVEL[id].category) === 'geometry'
  );
  for (let i = 0; i < 4; i++) {
    await api(ctx.base, 'POST', '/api/engine/event', {
      token: target.token,
      body: { conceptId, correct: true, responseMs: 5000 },
    });
  }

  const r = await api(ctx.base, 'GET', `/api/user/${target.user.id}`, { token: viewer.token });
  assert.equal(r.status, 200);
  assert.ok(r.body.masteryIdentity, 'public profile includes the mastery identity');
  assert.ok(r.body.masteryIdentity.headline.length > 0, 'has an identity headline');
  assert.equal(r.body.masteryIdentity.topDomain.name, 'Geometry', 'strongest domain surfaces');
});

test('recommendations map to real, playable game modes', async () => {
  const u = await registerUser(ctx.base);
  const conceptId = Object.keys(CONCEPT_TO_LEVEL).find(
    (id) => MasteryMap.domainOf(id, CONCEPT_TO_LEVEL[id].category) === 'arithmetic'
  );
  // Mixed results → a weak-but-started concept the domain recommendation can target.
  for (let i = 0; i < 3; i++) {
    await api(ctx.base, 'POST', '/api/engine/event', {
      token: u.token,
      body: { conceptId, correct: i === 0, responseMs: 20000 },
    });
  }
  const r = await api(ctx.base, 'GET', '/api/mastery/profile', { token: u.token });
  assert.equal(r.status, 200);
  assert.ok(r.body.recommendations.length >= 1, 'weak signals produce a concrete next move');
  const validModes = new Set(['level', 'estimation', 'mistakes_practice', 'error_detection', 'transfer_challenge', 'checkpoint_exam']);
  for (const rec of r.body.recommendations) {
    assert.ok(validModes.has(rec.gameMode), `playable mode: ${rec.gameMode}`);
    assert.ok(rec.title && rec.reason, 'every recommendation explains itself');
  }
});
