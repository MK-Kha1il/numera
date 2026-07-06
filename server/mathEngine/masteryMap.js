// Mastery Map — the Mathematical Mastery Profile model (domains × competencies).
//
// This is NOT another XP system. Every number here is a *rate* derived from demonstrated
// understanding (the masteryEngine dimensions), never a counter — so repetition without
// learning moves nothing, and a profile only grows when the underlying competence does.
//
// Two layers:
//  1. DOMAINS  — the 8 mathematical territories (Arithmetic … Number Theory). A domain score
//     blends DEPTH (how well you know what you've touched) with BREADTH (how much of the
//     territory you've made proficient), so grinding one concept cannot max a domain.
//  2. COMPETENCIES — 10 cross-cutting thinking skills (Mental Math, Logic, Pattern
//     Recognition …) computed from the per-concept dimension vectors plus habit history.
//     Each is EVIDENCE-GATED: it stays hidden ("emerging") until enough genuine attempts
//     exist to make the estimate honest.
//
// Pure & deterministic (no DB / IO) — the DB-facing wrapper lives in
// services/masteryMapService.js; unit tests in test/masteryMap.test.js.

const MasteryEngine = require('./masteryEngine');

const clamp01 = (x) => Math.min(1, Math.max(0, Number.isFinite(x) ? x : 0));

// Exposure cap for weighting: beyond this many attempts a concept's weight stops growing,
// so volume on one concept can't dominate an aggregate (anti-grind invariant).
const WEIGHT_CAP = 15;
const weightOf = (p) => Math.min(WEIGHT_CAP, Math.max(1, p.exposure_count || 1));

// A concept counts toward domain BREADTH once its overall mastery clears this bar.
const PROFICIENT_BAR = 0.6;

// ── Layer 1: Mathematical Domains ────────────────────────────────────────────────────────
//
// The 20 curriculum categories collapse into 8 learner-facing domains. `probability`
// concepts live inside the `statistics` category, so they're split out by concept id.

const CATEGORY_TO_DOMAIN = {
  arithmetic: 'arithmetic',
  integers: 'arithmetic',
  decimals: 'arithmetic',
  fractions: 'arithmetic',
  number_sense: 'arithmetic',
  rates: 'arithmetic',
  expressions: 'algebra',
  equations: 'algebra',
  inequalities: 'algebra',
  functions: 'algebra',
  graphing: 'algebra',
  sequences: 'algebra',
  algebra: 'algebra',
  powers: 'algebra',
  geometry: 'geometry',
  statistics: 'statistics', // minus the probability concepts below
  combinatorics: 'probability', // counting is the engine room of probability
  calculus: 'calculus',
  number_theory: 'number_theory',
  factors: 'number_theory', // primes, divisibility, GCD — genuinely number theory
};

// Probability concepts that live in the `statistics` curriculum category.
const PROBABILITY_CONCEPTS = new Set([
  'stat_probability',
  'compound_probability',
  'probability_complement',
  'prob_without_replacement',
  'stat_theoretical_prob',
  'stat_experimental_prob',
  'stat_sample_space',
]);

const DOMAINS = [
  { key: 'arithmetic',    name: 'Arithmetic',    blurb: 'Numbers, operations & proportional reasoning' },
  { key: 'algebra',       name: 'Algebra',       blurb: 'Symbols, equations, functions & graphs' },
  { key: 'geometry',      name: 'Geometry',      blurb: 'Shape, space, angle & measure' },
  { key: 'trigonometry',  name: 'Trigonometry',  blurb: 'Triangles, circles & periodic motion' }, // future-ready
  { key: 'calculus',      name: 'Calculus',      blurb: 'Change, limits & accumulation' },
  { key: 'statistics',    name: 'Statistics',    blurb: 'Data, centre, spread & inference' },
  { key: 'probability',   name: 'Probability',   blurb: 'Chance, counting & uncertainty' },
  { key: 'number_theory', name: 'Number Theory', blurb: 'Primes, divisibility & structure' },
];

// Which domain a playable concept belongs to.
function domainOf(conceptId, category) {
  if (PROBABILITY_CONCEPTS.has(conceptId)) return 'probability';
  return CATEGORY_TO_DOMAIN[category] || null;
}

// Learner-facing stage ladder for a domain score (0..1). "Mastered" a whole domain is a
// months-long achievement by design — this system is the long game.
function domainStage(score, started, total) {
  if (total === 0) return 'On the horizon';
  if (!started) return 'Unexplored';
  if (score < 0.15) return 'Exploring';
  if (score < 0.35) return 'Developing';
  if (score < 0.55) return 'Proficient';
  if (score < 0.75) return 'Advanced';
  return 'Mastered';
}

const STAGE_ORDER = ['Unexplored', 'Exploring', 'Developing', 'Proficient', 'Advanced', 'Mastered'];
// Score thresholds that OPEN each stage (index-aligned with STAGE_ORDER from 'Exploring' up).
const STAGE_FLOOR = { Exploring: 0, Developing: 0.15, Proficient: 0.35, Advanced: 0.55, Mastered: 0.75 };

/**
 * Build the 8 domain summaries.
 * @param {Array} profiles learner_profiles rows (exposure_count > 0 rows carry signal)
 * @param {Object} conceptToLevel CONCEPT_TO_LEVEL from mathGenerator ({ conceptId: {category, level} })
 * @param {Object} conceptNames { conceptId: name } (from the knowledge graph)
 */
function buildDomains(profiles, conceptToLevel, conceptNames = {}) {
  const byConcept = {};
  for (const p of profiles || []) byConcept[p.concept_id] = p;

  // Group the playable curriculum by domain.
  const groups = {};
  for (const d of DOMAINS) groups[d.key] = [];
  for (const conceptId of Object.keys(conceptToLevel || {})) {
    const meta = conceptToLevel[conceptId];
    const dom = domainOf(conceptId, meta.category);
    if (dom && groups[dom]) groups[dom].push({ conceptId, ...meta });
  }

  return DOMAINS.map((d) => {
    const concepts = groups[d.key];
    const total = concepts.length;
    let weightSum = 0;
    let depthSum = 0;
    let started = 0;
    let proficient = 0;
    let top = null;
    let weakest = null;
    for (const c of concepts) {
      const p = byConcept[c.conceptId];
      if (!p || !(p.exposure_count > 0)) continue;
      started += 1;
      const overall = MasteryEngine.computeMasteryProfile(p).overall;
      const w = weightOf(p);
      depthSum += overall * w;
      weightSum += w;
      if (overall >= PROFICIENT_BAR) proficient += 1;
      if (!top || overall > top.overall) {
        top = { conceptId: c.conceptId, name: conceptNames[c.conceptId] || c.conceptId, overall };
      }
      if (overall < PROFICIENT_BAR && (!weakest || overall < weakest.overall)) {
        weakest = { conceptId: c.conceptId, name: conceptNames[c.conceptId] || c.conceptId, category: c.category, level: c.level, overall };
      }
    }
    const depth = weightSum > 0 ? clamp01(depthSum / weightSum) : 0;
    const breadth = total > 0 ? clamp01(proficient / total) : 0;
    // Half how-well, half how-wide: deep-but-narrow and wide-but-shallow both read as partial.
    const score = clamp01(0.5 * depth + 0.5 * breadth);
    return {
      key: d.key,
      name: d.name,
      blurb: d.blurb,
      comingSoon: total === 0,
      total,
      started,
      proficient,
      depth: round2(depth),
      breadth: round2(breadth),
      score: round2(score),
      stage: domainStage(score, started > 0, total),
      topConcept: top ? { name: top.name, overall: round2(top.overall) } : null,
      // Internal (not for display): the concrete next concept to lift this domain.
      focusConcept: weakest,
    };
  });
}

// ── Layer 2: Mathematical Competencies ───────────────────────────────────────────────────
//
// Cross-cutting thinking skills. Each definition names the signal it is computed from so
// the number stays interpretable; `minEvidence` is the honesty gate.

const COMPETENCIES = [
  { key: 'mental_math',         name: 'Mental Math',         blurb: 'Computing in your head, no crutches', minEvidence: 12 },
  { key: 'accuracy',            name: 'Accuracy',            blurb: 'Getting it right',                    minEvidence: 12 },
  { key: 'speed',               name: 'Speed',               blurb: 'Answering quickly',                   minEvidence: 12 },
  { key: 'logic',               name: 'Logic',               blurb: 'Deduction: proofs, constraints, structure', minEvidence: 8 },
  { key: 'visualization',       name: 'Visualization',       blurb: 'Thinking in shapes and graphs',       minEvidence: 8 },
  { key: 'pattern_recognition', name: 'Pattern Recognition', blurb: 'Seeing the rule behind the numbers',  minEvidence: 8 },
  { key: 'problem_solving',     name: 'Problem Solving',     blurb: 'Applying ideas in unfamiliar contexts', minEvidence: 3 },
  { key: 'consistency',         name: 'Consistency',         blurb: 'Showing up and keeping skills warm',  minEvidence: 5 },
  { key: 'adaptability',        name: 'Adaptability',        blurb: 'Learning new ideas quickly',          minEvidence: 3 },
  { key: 'strategic_thinking',  name: 'Strategic Thinking',  blurb: 'First-try success and self-correction', minEvidence: 12 },
];

// Category groups feeding the domain-flavoured competencies.
const LOGIC_CATEGORIES = new Set(['number_theory', 'combinatorics', 'inequalities', 'equations']);
const VISUAL_CATEGORIES = new Set(['geometry', 'graphing']);
const PATTERN_CATEGORIES = new Set(['sequences', 'factors', 'powers', 'number_sense']);

/**
 * Compute the 10 competencies.
 * @param {Array} profiles learner_profiles rows
 * @param {Object} conceptToLevel CONCEPT_TO_LEVEL (for category lookups)
 * @param {Object} habits { activeDays28, historyDays, streak } from user_commitment_history/users
 */
function buildCompetencies(profiles, conceptToLevel, habits = {}) {
  const rows = (profiles || []).filter((p) => (p.exposure_count || 0) > 0);

  // Weighted-mean accumulator over a filtered set of concepts.
  const agg = (filter, valueOf) => {
    let sum = 0;
    let wSum = 0;
    let evidence = 0;
    for (const p of rows) {
      const meta = conceptToLevel[p.concept_id];
      if (!meta) continue;
      if (filter && !filter(p, meta)) continue;
      const dims = MasteryEngine.computeDimensions(p);
      const w = weightOf(p);
      sum += valueOf(p, dims) * w;
      wSum += w;
      evidence += p.exposure_count || 0;
    }
    return { value: wSum > 0 ? clamp01(sum / wSum) : 0, evidence };
  };

  const inDomain = (dom) => (p, meta) => domainOf(p.concept_id, meta.category) === dom;
  const inCategories = (set) => (p, meta) => set.has(meta.category);

  const mentalMath = agg(inDomain('arithmetic'), (p, d) => d.fluency);
  const accuracy = agg(null, (p, d) => d.accuracy);
  const speed = agg(null, (p) => (p.avg_response_ms > 0 ? clamp01(1 - p.avg_response_ms / 30000) : 0));
  const logic = agg(inCategories(LOGIC_CATEGORIES), (p) => MasteryEngine.computeMasteryProfile(p).overall);
  const visualization = agg(inCategories(VISUAL_CATEGORIES), (p) => MasteryEngine.computeMasteryProfile(p).overall);
  const pattern = agg(inCategories(PATTERN_CATEGORIES), (p) => MasteryEngine.computeMasteryProfile(p).overall);
  // Strategic thinking: unaided first-try success plus low retry churn — knowing how to attack
  // a problem, not just whether the fact is memorised.
  const strategic = agg(null, (p, d) => clamp01(0.7 * d.independence + 0.3 * (1 - clamp01(p.retry_rate))));

  // Problem solving: EARNED only through transfer attempts (novel-context success).
  let tSuccess = 0;
  let tExposure = 0;
  for (const p of rows) {
    tSuccess += p.transfer_success || 0;
    tExposure += p.transfer_exposure || 0;
  }
  const problemSolving = { value: tExposure > 0 ? clamp01(tSuccess / tExposure) : 0, evidence: tExposure };

  // Consistency: habit regularity over the last 28 days + current streak. Evidence = recorded
  // active days, so a brand-new account isn't judged on an empty calendar.
  const activeDays28 = habits.activeDays28 || 0;
  const streak = habits.streak || 0;
  const consistency = {
    value: clamp01(0.7 * clamp01(activeDays28 / 20) + 0.3 * clamp01(streak / 14)),
    evidence: habits.historyDays || 0,
  };

  // Adaptability: how well NEW ideas land — accuracy while a concept is still fresh
  // (≤6 attempts), plus range across domains.
  let newSum = 0;
  let newCount = 0;
  const domainsTouched = new Set();
  for (const p of rows) {
    const meta = conceptToLevel[p.concept_id];
    if (!meta) continue;
    const dom = domainOf(p.concept_id, meta.category);
    if (dom) domainsTouched.add(dom);
    if ((p.exposure_count || 0) <= 6) {
      newSum += clamp01(p.accuracy_rate);
      newCount += 1;
    }
  }
  const adaptability = {
    value: clamp01(0.7 * (newCount > 0 ? newSum / newCount : 0) + 0.3 * clamp01(domainsTouched.size / 6)),
    evidence: newCount,
  };

  const computed = {
    mental_math: mentalMath,
    accuracy,
    speed,
    logic,
    visualization,
    pattern_recognition: pattern,
    problem_solving: problemSolving,
    consistency,
    adaptability,
    strategic_thinking: strategic,
  };

  return COMPETENCIES.map((c) => {
    const r = computed[c.key];
    const unlocked = r.evidence >= c.minEvidence;
    return {
      key: c.key,
      name: c.name,
      blurb: c.blurb,
      // An estimate built on thin evidence is noise, not insight — hide the number until earned.
      value: unlocked ? round2(r.value) : 0,
      unlocked,
      evidence: r.evidence,
      minEvidence: c.minEvidence,
    };
  });
}

// ── Identity, titles, milestones, recommendations ────────────────────────────────────────

// Competitor-voiced identity words per domain / competency (docs/BrandIdentity.md).
const DOMAIN_TITLES = {
  arithmetic:    { name: 'Number Cruncher',  desc: 'Reach Advanced in Arithmetic' },
  algebra:       { name: 'Equation Tamer',   desc: 'Reach Advanced in Algebra' },
  geometry:      { name: 'Shape Master',     desc: 'Reach Advanced in Geometry' },
  trigonometry:  { name: 'Angle Whisperer',  desc: 'Reach Advanced in Trigonometry' },
  calculus:      { name: 'Limit Breaker',    desc: 'Reach Advanced in Calculus' },
  statistics:    { name: 'Data Whisperer',   desc: 'Reach Advanced in Statistics' },
  probability:   { name: 'Odds Maker',       desc: 'Reach Advanced in Probability' },
  number_theory: { name: 'Prime Hunter',     desc: 'Reach Advanced in Number Theory' },
};

const COMPETENCY_TITLES = {
  mental_math:         { name: 'Lightning Calculator', desc: 'Mental Math at 75%+' },
  accuracy:            { name: 'Precision Instrument', desc: 'Accuracy at 75%+' },
  speed:               { name: 'Quick Draw',           desc: 'Speed at 75%+' },
  logic:               { name: 'Cold Logician',        desc: 'Logic at 75%+' },
  visualization:       { name: "Mind's Eye",           desc: 'Visualization at 75%+' },
  pattern_recognition: { name: 'Pattern Seeker',       desc: 'Pattern Recognition at 75%+' },
  problem_solving:     { name: 'Problem Slayer',       desc: 'Problem Solving at 75%+' },
  consistency:         { name: 'Iron Habit',           desc: 'Consistency at 75%+' },
  adaptability:        { name: 'Shape Shifter',        desc: 'Adaptability at 75%+' },
  strategic_thinking:  { name: 'Grandmaster Mindset',  desc: 'Strategic Thinking at 75%+' },
};

const TITLE_BAR = 0.75;
const ADVANCED_STAGES = new Set(['Advanced', 'Mastered']);
const PROFICIENT_STAGES = new Set(['Proficient', 'Advanced', 'Mastered']);

// Balanced-growth titles — the system celebrates RANGE, not just spikes, so an all-rounder's
// development is as visible as a specialist's. Stage-based (rates), never volume-based.
function balancedGrowthTitles(domains, competencies) {
  const developingPlus = domains.filter((d) => !d.comingSoon && d.stage !== 'Unexplored' && d.stage !== 'Exploring').length;
  const proficientPlus = domains.filter((d) => PROFICIENT_STAGES.has(d.stage)).length;
  const solidComps = competencies.filter((c) => c.unlocked && c.value >= 0.6).length;
  return [
    { id: 'balance_explorer', name: 'Curriculum Explorer', desc: 'Reach Developing in 4 domains', earned: developingPlus >= 4 },
    { id: 'balance_polymath', name: 'Polymath', desc: 'Reach Proficient in 4 domains', earned: proficientPlus >= 4 },
    { id: 'balance_renaissance', name: 'Renaissance Mind', desc: 'Reach Proficient in 6 domains with 6 competencies at 60%+', earned: proficientPlus >= 6 && solidComps >= 6 },
  ];
}

function buildTitles(domains, competencies) {
  const titles = [];
  for (const d of domains) {
    const t = DOMAIN_TITLES[d.key];
    if (!t) continue;
    titles.push({ id: `domain_${d.key}`, name: t.name, desc: t.desc, earned: ADVANCED_STAGES.has(d.stage) });
  }
  for (const c of competencies) {
    const t = COMPETENCY_TITLES[c.key];
    if (!t) continue;
    titles.push({ id: `comp_${c.key}`, name: t.name, desc: t.desc, earned: c.unlocked && c.value >= TITLE_BAR });
  }
  titles.push(...balancedGrowthTitles(domains, competencies));
  // Earned first, then nearest-to-earned locked ones — a trophy shelf, not a wall of locks.
  return titles.sort((a, b) => (b.earned ? 1 : 0) - (a.earned ? 1 : 0));
}

// The one-line mathematical identity: strongest competency flavour + strongest domain.
function buildIdentity(domains, competencies, overall) {
  const active = domains.filter((d) => d.started > 0);
  const unlockedComps = competencies.filter((c) => c.unlocked);
  if (active.length === 0) {
    return { headline: 'An unwritten mathematician', subline: 'Your profile takes shape as you play.', stage: 'New', overall: 0 };
  }
  const topDomain = active.reduce((a, b) => (b.score > a.score ? b : a));
  const topComp = unlockedComps.length > 0 ? unlockedComps.reduce((a, b) => (b.value > a.value ? b : a)) : null;

  const FLAVOR = {
    mental_math: 'quick-headed', accuracy: 'precise', speed: 'fast', logic: 'logical',
    visualization: 'visual', pattern_recognition: 'pattern-seeking', problem_solving: 'resourceful',
    consistency: 'relentless', adaptability: 'adaptable', strategic_thinking: 'strategic',
  };
  const DOMAIN_NOUN = {
    arithmetic: 'arithmetician', algebra: 'algebraist', geometry: 'geometer', trigonometry: 'trigonometrist',
    calculus: 'analyst', statistics: 'statistician', probability: 'probabilist', number_theory: 'number theorist',
  };
  const flavor = topComp ? FLAVOR[topComp.key] : 'developing';
  const noun = DOMAIN_NOUN[topDomain.key] || 'mathematician';
  const article = /^[aeiou]/i.test(flavor) ? 'An' : 'A';
  return {
    headline: `${article} ${flavor} ${noun}`,
    subline: topComp
      ? `${topComp.name} is your sharpest edge; ${topDomain.name} is your territory.`
      : `${topDomain.name} is your territory. Keep playing to reveal your thinking style.`,
    stage: MasteryEngine.masteryStage(overall),
    overall: round2(overall),
  };
}

// Overall = exposure-weighted mean concept mastery across every started concept.
function overallMastery(profiles) {
  const rows = (profiles || []).filter((p) => (p.exposure_count || 0) > 0);
  let sum = 0;
  let wSum = 0;
  for (const p of rows) {
    const w = weightOf(p);
    sum += MasteryEngine.computeMasteryProfile(p).overall * w;
    wSum += w;
  }
  return wSum > 0 ? clamp01(sum / wSum) : 0;
}

// The next stage a domain is climbing toward, with honest progress toward its floor.
function nextMilestone(domains) {
  let best = null;
  for (const d of domains) {
    if (d.comingSoon || d.started === 0 || d.stage === 'Mastered') continue;
    const idx = STAGE_ORDER.indexOf(d.stage);
    const nextStage = STAGE_ORDER[idx + 1];
    if (!nextStage) continue;
    const floor = STAGE_FLOOR[nextStage];
    const prevFloor = STAGE_FLOOR[d.stage] || 0;
    const progress = clamp01((d.score - prevFloor) / Math.max(0.001, floor - prevFloor));
    if (!best || progress > best.progress) {
      best = { domain: d.name, domainKey: d.key, from: d.stage, to: nextStage, progress: round2(progress) };
    }
  }
  return best;
}

// Gameplay integration: turn the weakest signals into concrete next moves that all map to
// modes the app already has — the profile personalises play instead of decorating it.
function buildRecommendations(domains, competencies) {
  const recs = [];

  // Weakest unlocked competency → a mode that trains exactly that skill.
  const MODE_FOR = {
    mental_math: { gameMode: 'estimation', title: 'Estimation drills', reason: 'Sharpen head-math without the keypad.' },
    accuracy: { gameMode: 'mistakes_practice', title: 'Rework your misses', reason: 'Accuracy grows fastest where you last slipped.' },
    speed: { gameMode: 'level', title: 'Timed reps', reason: 'You know it — now make it automatic.' },
    logic: { gameMode: 'error_detection', title: 'Spot the mistake', reason: 'Auditing flawed reasoning builds deduction.' },
    visualization: { gameMode: 'level', category: 'geometry', title: 'Geometry reps', reason: 'Train the mind’s eye where it matters.' },
    pattern_recognition: { gameMode: 'level', category: 'sequences', title: 'Sequence hunting', reason: 'Find the rule before the numbers do.' },
    problem_solving: { gameMode: 'transfer_challenge', title: 'Transfer challenge', reason: 'Prove it works outside the textbook framing.' },
    consistency: { gameMode: 'checkpoint_exam', title: 'Daily check-in', reason: 'Small, regular sessions beat weekend marathons.' },
    adaptability: { gameMode: 'checkpoint_exam', title: 'Mixed checkpoint', reason: 'Interleaved practice builds flexible recall.' },
    strategic_thinking: { gameMode: 'error_detection', title: 'Spot the mistake', reason: 'Strategy is knowing where solutions break.' },
  };
  const weakComps = competencies
    .filter((c) => c.unlocked)
    .sort((a, b) => a.value - b.value)
    .slice(0, 2);
  for (const c of weakComps) {
    const m = MODE_FOR[c.key];
    if (!m) continue;
    recs.push({
      kind: 'competency',
      target: c.name,
      gameMode: m.gameMode,
      category: m.category || 'General',
      level: 0,
      title: m.title,
      reason: m.reason,
    });
  }

  // Weakest started domain → the concrete concept-level session that lifts it.
  const started = domains.filter((d) => d.started > 0 && d.focusConcept);
  if (started.length > 0) {
    const weakest = started.reduce((a, b) => (b.score < a.score ? b : a));
    recs.push({
      kind: 'domain',
      target: weakest.name,
      gameMode: 'level',
      category: weakest.focusConcept.category,
      level: weakest.focusConcept.level,
      title: `Push ${weakest.name}`,
      reason: `${weakest.focusConcept.name} is the next brick in this wall.`,
    });
  }

  return recs.slice(0, 3);
}

// Compact snapshot payload persisted daily — the substrate for trends and milestones.
function snapshotPayload(domains, competencies, overall) {
  const d = {};
  for (const dom of domains) d[dom.key] = { score: dom.score, stage: dom.stage };
  const c = {};
  for (const comp of competencies) if (comp.unlocked) c[comp.key] = comp.value;
  return { overall: round2(overall), domains: d, competencies: c };
}

function round2(x) {
  return Math.round((Number.isFinite(x) ? x : 0) * 100) / 100;
}

module.exports = {
  DOMAINS,
  COMPETENCIES,
  CATEGORY_TO_DOMAIN,
  PROBABILITY_CONCEPTS,
  PROFICIENT_BAR,
  STAGE_ORDER,
  domainOf,
  domainStage,
  buildDomains,
  buildCompetencies,
  buildTitles,
  buildIdentity,
  overallMastery,
  nextMilestone,
  buildRecommendations,
  snapshotPayload,
};
