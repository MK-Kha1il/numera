// One-off introspection audit: loads every learning-science engine and computes
// real cross-coverage + graph integrity. Run: node scripts/contentGraphAudit.js
const path = require('path');
const ME = (f) => require(path.join(__dirname, '..', 'mathEngine', f));

const { concepts, getDependencies } = ME('knowledgeGraph');
const { CONCEPT_LESSONS } = ME('conceptLessons');
const { templates } = ME('templates');
const { TRANSFER_TEMPLATES } = ME('transferEngine');

// selfExplain / workedExample expose builder fns, not raw maps — introspect via require cache.
function rawKeys(file, varName) {
  const src = require('fs').readFileSync(path.join(__dirname, '..', 'mathEngine', file), 'utf8');
  const re = new RegExp(`const ${varName} = \\{([\\s\\S]*?)\\n\\};`, 'm');
  const m = src.match(re);
  if (!m) return [];
  return Array.from(m[1].matchAll(/^\s{2}([a-z0-9_]+):/gm)).map((x) => x[1]);
}
const selfExplainKeys = rawKeys('selfExplainEngine.js', 'SELF_EXPLAIN');
const workedKeys = rawKeys('workedExampleEngine.js', 'WORKED_EXAMPLES');

const graphIds = Object.keys(concepts);
const lessonIds = Object.keys(CONCEPT_LESSONS);
const templateIds = Object.keys(templates);
const transferIds = Object.keys(TRANSFER_TEMPLATES);

const setG = new Set(graphIds);
const setL = new Set(lessonIds);
const setT = new Set(templateIds);

// --- Graph integrity ---
const danglingPrereqs = [];
for (const id of graphIds) {
  for (const p of concepts[id].prereqs || []) {
    if (!setG.has(p)) danglingPrereqs.push(`${id} -> ${p}`);
  }
}

// cycle detection (DFS)
const cycles = [];
{
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = {};
  graphIds.forEach((id) => (color[id] = WHITE));
  const stack = [];
  function dfs(id) {
    color[id] = GRAY; stack.push(id);
    for (const p of (concepts[id] && concepts[id].prereqs) || []) {
      if (!setG.has(p)) continue;
      if (color[p] === GRAY) cycles.push([...stack.slice(stack.indexOf(p)), p].join(' -> '));
      else if (color[p] === WHITE) dfs(p);
    }
    color[id] = BLACK; stack.pop();
  }
  graphIds.forEach((id) => { if (color[id] === WHITE) dfs(id); });
}

// dependents (reverse edges)
const dependents = {};
graphIds.forEach((id) => (dependents[id] = []));
for (const id of graphIds) {
  for (const p of concepts[id].prereqs || []) {
    if (dependents[p]) dependents[p].push(id);
  }
}

// --- Coverage cross-product ---
const orphanTemplatesNotInGraph = templateIds.filter((id) => !setG.has(id));
const graphNotInTemplates = graphIds.filter((id) => !setT.has(id));
const graphNotInLessons = graphIds.filter((id) => !setL.has(id));
const lessonsNotInGraph = lessonIds.filter((id) => !setG.has(id));

// per-concept profile
const profiles = graphIds.map((id) => {
  const c = concepts[id];
  const lesson = CONCEPT_LESSONS[id];
  const reps = lesson && Array.isArray(lesson.representations) ? lesson.representations.length : 0;
  const repKinds = lesson && Array.isArray(lesson.representations)
    ? lesson.representations.map((r) => r.kind) : [];
  const lessonMistakes = lesson && Array.isArray(lesson.commonMistakes) ? lesson.commonMistakes.length : 0;
  const lessonConnections = lesson && Array.isArray(lesson.connections) ? lesson.connections.length : 0;
  return {
    id,
    name: c.name,
    prereqs: (c.prereqs || []).length,
    dependents: dependents[id].length,
    misconceptions: (c.misconceptions || []).length,
    standard: c.standard && c.standard !== 'Unmapped' ? c.standard : null,
    hasLesson: setL.has(id),
    representations: reps,
    repKinds,
    lessonMistakes,
    lessonConnections,
    hasTemplate: setT.has(id),
    hasTransfer: transferIds.includes(id),
    hasSelfExplain: selfExplainKeys.includes(id),
    hasWorkedExample: workedKeys.includes(id),
    intuitionHook: lesson ? !!lesson.intuitionHook : false,
    whyItWorks: lesson ? !!lesson.whyItWorks : false,
  };
});

const pct = (n) => `${((n / graphIds.length) * 100).toFixed(0)}%`;
const count = (fn) => profiles.filter(fn).length;

const repKindHistogram = {};
profiles.forEach((p) => p.repKinds.forEach((k) => (repKindHistogram[k] = (repKindHistogram[k] || 0) + 1)));

const report = {
  totals: {
    graphConcepts: graphIds.length,
    lessons: lessonIds.length,
    templateGenerators: templateIds.length,
    transferTemplates: transferIds.length,
    selfExplain: selfExplainKeys.length,
    workedExamples: workedKeys.length,
  },
  graphIntegrity: {
    danglingPrereqCount: danglingPrereqs.length,
    danglingPrereqs: danglingPrereqs.slice(0, 30),
    cycleCount: cycles.length,
    cycles: cycles.slice(0, 10),
    roots: graphIds.filter((id) => (concepts[id].prereqs || []).length === 0).length,
    leaves: graphIds.filter((id) => dependents[id].length === 0).length,
    maxDepth: Math.max(...graphIds.map((id) => getDependencies(id).length)),
  },
  coverageGaps: {
    orphanTemplatesNotInGraph,
    graphConceptsWithoutTemplate: graphNotInTemplates,
    graphConceptsWithoutLesson: graphNotInLessons,
    lessonsNotInGraph,
  },
  coverageStats: {
    withLesson: `${count((p) => p.hasLesson)} (${pct(count((p) => p.hasLesson))})`,
    withTransfer: `${count((p) => p.hasTransfer)} (${pct(count((p) => p.hasTransfer))})`,
    withSelfExplain: `${count((p) => p.hasSelfExplain)} (${pct(count((p) => p.hasSelfExplain))})`,
    withWorkedExample: `${count((p) => p.hasWorkedExample)} (${pct(count((p) => p.hasWorkedExample))})`,
    withStandard: `${count((p) => p.standard)} (${pct(count((p) => p.standard))})`,
    withZeroMisconceptions: count((p) => p.misconceptions === 0),
    withOneMisconception: count((p) => p.misconceptions === 1),
    lessonsWithLT2Representations: count((p) => p.hasLesson && p.representations < 2),
    lessonsWith3PlusRepresentations: count((p) => p.representations >= 3),
    lessonsWithZeroConnections: count((p) => p.hasLesson && p.lessonConnections === 0),
    repKindHistogram,
  },
  // The worst-covered concepts: have a lesson+template but no transfer/selfexplain/worked + few misconceptions
  thinnestConcepts: profiles
    .map((p) => ({
      id: p.id,
      thinScore:
        (p.hasTransfer ? 0 : 1) +
        (p.hasSelfExplain ? 0 : 1) +
        (p.hasWorkedExample ? 0 : 1) +
        (p.misconceptions === 0 ? 2 : p.misconceptions === 1 ? 1 : 0) +
        (p.representations < 2 ? 2 : 0) +
        (p.lessonConnections === 0 ? 1 : 0),
      misconceptions: p.misconceptions,
      reps: p.representations,
    }))
    .sort((a, b) => b.thinScore - a.thinScore)
    .slice(0, 25),
};

console.log(JSON.stringify(report, null, 2));
