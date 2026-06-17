// Public concept ("learn") pages — the SEO / web-presence lever (ultra review #54 / opp#10).
// The app already holds 151 rich, concept-first lessons; this renders them as crawlable web pages
// ("how addition works, with examples") that can rank in search and funnel readers into the app and
// the printable worksheets. Public, no auth, no user data — pure content + internal linking.
const express = require('express');
const { CONCEPT_LESSONS } = require('../mathEngine/conceptLessons');

const router = express.Router();

// conceptId → printable-worksheet strand (best-effort, by id prefix) for the "practice" CTA.
function categoryFor(id) {
  const s = String(id);
  if (/^fraction/.test(s)) return 'fractions';
  if (/^decimal/.test(s)) return 'decimals';
  if (/^integer/.test(s)) return 'integers';
  if (/^geo|pythag|area|perimeter|angle|circle|volume|coordinate|transform/.test(s)) return 'geometry';
  if (/^stat|mean|median|mode|probab|data|histogram/.test(s)) return 'statistics';
  if (/gcf|lcm|prime|factor|multiple|divisib|number_theory/.test(s)) return 'number_theory';
  if (/linear|quadratic|algebra|expr|eqn|equation|distribute|combine|slope|inequality|exponent|polynomial|sequence/.test(s)) return 'algebra';
  return 'arithmetic';
}

const STRANDS = [
  ['arithmetic', 'Arithmetic'], ['integers', 'Integers'], ['fractions', 'Fractions'],
  ['decimals', 'Decimals'], ['algebra', 'Algebra'], ['geometry', 'Geometry'],
  ['number_theory', 'Number Theory'], ['statistics', 'Statistics'],
];

// HTML-escape only the structural characters; leave $…$ LaTeX for MathJax.
function escHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Render lesson prose: escape + light markdown (**bold**, *italic*) on the NON-math segments only,
// so a stray * inside $…$ never becomes emphasis and math is handed to MathJax untouched.
function renderText(s) {
  return String(s == null ? '' : s)
    .split(/(\$[^$]*\$)/)
    .map((seg, i) => {
      if (i % 2 === 1) return seg; // a $…$ math segment — leave for MathJax
      return escHtml(seg)
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>');
    })
    .join('');
}

const BASE_CSS = `
  *{box-sizing:border-box;}
  body{font-family:-apple-system,'Segoe UI',Roboto,sans-serif;color:#1a1a2e;max-width:760px;margin:0 auto;padding:28px 22px;line-height:1.6;}
  a{color:#5b2a86;}
  header.site{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #eee;padding-bottom:10px;margin-bottom:18px;}
  header.site .brand{font-weight:800;letter-spacing:1px;color:#5b2a86;text-decoration:none;}
  header.site nav a{margin-left:16px;font-size:.9rem;text-decoration:none;}
  h1{font-size:1.9rem;line-height:1.25;margin:.2em 0;}
  .lede{font-size:1.1rem;color:#444;}
  .hook{background:#f6f2fb;border-left:4px solid #5b2a86;padding:12px 16px;border-radius:6px;margin:18px 0;}
  h2{font-size:1.25rem;margin-top:1.6em;border-bottom:1px solid #eee;padding-bottom:4px;}
  .card{background:#faf9fc;border:1px solid #eee;border-radius:8px;padding:12px 16px;margin:10px 0;}
  .card .label{font-weight:700;}
  .mistake .label{color:#b00020;}
  .ex{border:1px solid #e3e0ee;border-radius:8px;padding:14px 16px;margin:12px 0;}
  .ex .ans{font-weight:700;color:#0a7d32;}
  .cta{display:block;background:linear-gradient(135deg,#7b2ff7,#f107a3);color:#fff;text-align:center;font-weight:700;padding:14px;border-radius:50px;text-decoration:none;margin:14px 0;}
  .cta.alt{background:#fff;color:#5b2a86;border:2px solid #5b2a86;}
  .chips a{display:inline-block;background:#f0ecf7;color:#5b2a86;border-radius:50px;padding:5px 12px;margin:3px;font-size:.85rem;text-decoration:none;}
  .strand{margin:18px 0;}
  .strand h3{margin:0 0 6px;font-size:1.05rem;}
  footer{margin-top:34px;border-top:1px solid #eee;padding-top:14px;color:#888;font-size:.82rem;text-align:center;}
`;

function pageShell({ title, description, canonical, body, math = true }) {
  const mathJax = math
    ? `<script>window.MathJax={tex:{inlineMath:[['$','$'],['\\\\(','\\\\)']]},svg:{fontCache:'global'}};</script>
  <script async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(description)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:title" content="${escHtml(title)}">
  <meta property="og:description" content="${escHtml(description)}">
  <meta property="og:type" content="article">
  ${mathJax}
  <style>${BASE_CSS}</style>
</head>
<body>
  <header class="site">
    <a class="brand" href="/">NUMERA</a>
    <nav><a href="/learn">All lessons</a><a href="/worksheet">Worksheets</a></nav>
  </header>
  ${body}
  <footer>Free, private math learning from <a href="/">Numera</a>. No ads, no trackers.</footer>
</body>
</html>`;
}

// Index: every lesson, grouped by strand — the crawlable hub that links the whole set together.
router.get('/learn', (req, res) => {
  const byStrand = {};
  for (const [id, l] of Object.entries(CONCEPT_LESSONS)) {
    const cat = categoryFor(id);
    (byStrand[cat] = byStrand[cat] || []).push({ id, title: l.title });
  }
  const sections = STRANDS.filter(([k]) => byStrand[k]).map(([k, label]) => {
    const links = byStrand[k]
      .sort((a, b) => a.title.localeCompare(b.title))
      .map((c) => `<a href="/learn/${encodeURIComponent(c.id)}">${escHtml(c.title)}</a>`)
      .join('');
    return `<div class="strand"><h3>${label}</h3><div class="chips">${links}</div></div>`;
  }).join('');

  const total = Object.keys(CONCEPT_LESSONS).length;
  const body = `
    <h1>Learn math, one clear idea at a time</h1>
    <p class="lede">${total} concept lessons — each one builds the intuition first, then the method, then the common traps. Free, and built to actually make sense.</p>
    <a class="cta" href="/">Get the Numera app &rarr;</a>
    ${sections}`;
  res.send(pageShell({
    title: `Learn Math — ${total} free concept lessons | Numera`,
    description: 'Free, concept-first math lessons that build real understanding: intuition, why it works, worked examples, and the common mistakes to avoid.',
    canonical: '/learn',
    body,
    math: false, // the index is link-only — no LaTeX, so skip the MathJax load entirely
  }));
});

router.get('/learn/:conceptId', (req, res) => {
  const id = req.params.conceptId;
  const l = CONCEPT_LESSONS[id];
  if (!l) {
    return res.status(404).send(pageShell({
      title: 'Lesson not found | Numera',
      description: 'That lesson does not exist.',
      canonical: '/learn',
      body: '<h1>Lesson not found</h1><p>Try the <a href="/learn">full list of lessons</a>.</p>',
    }));
  }

  const reps = (l.representations || []).map((r) =>
    `<div class="card"><span class="label">${escHtml(r.label)}.</span> ${renderText(r.body)}</div>`).join('');
  const mistakes = (l.commonMistakes || []).map((m) =>
    `<div class="card mistake"><span class="label">${escHtml(m.label)}.</span> ${renderText(m.why)} <em>Fix:</em> ${renderText(m.fix)}</div>`).join('');
  const examples = (l.examples || []).map((e, i) =>
    `<div class="ex"><div><strong>Example ${i + 1}.</strong> ${renderText(e.question)}</div>
     <div class="ans">Answer: ${renderText(String(e.answer))}</div>
     <div>${renderText(e.explanation)}</div></div>`).join('');
  const connections = (l.connections || [])
    .filter((c) => CONCEPT_LESSONS[c.concept])
    .map((c) => `<a href="/learn/${encodeURIComponent(c.concept)}">${escHtml(CONCEPT_LESSONS[c.concept].title)}</a>`)
    .join('');

  const cat = categoryFor(id);
  const body = `
    <h1>${escHtml(l.title)}</h1>
    <p class="lede">${renderText(l.oneLineSummary || '')}</p>
    ${l.intuitionHook ? `<div class="hook">${renderText(l.intuitionHook)}</div>` : ''}
    ${l.whatItIs ? `<h2>What it is</h2><p>${renderText(l.whatItIs)}</p>` : ''}
    ${l.whyItWorks ? `<h2>Why it works</h2><p>${renderText(l.whyItWorks)}</p>` : ''}
    ${l.whenToUse ? `<h2>When to use it</h2><p>${renderText(l.whenToUse)}</p>` : ''}
    ${reps ? `<h2>Ways to picture it</h2>${reps}` : ''}
    ${mistakes ? `<h2>Common mistakes</h2>${mistakes}` : ''}
    ${examples ? `<h2>Worked examples</h2>${examples}` : ''}
    <a class="cta" href="/">Practice ${escHtml(l.title)} in the Numera app &rarr;</a>
    <a class="cta alt" href="/worksheet?category=${cat}">Print a free ${escHtml(l.title)} worksheet</a>
    ${connections ? `<h2>Connected ideas</h2><div class="chips">${connections}</div>` : ''}`;

  res.send(pageShell({
    title: `${l.title} — explained simply, with examples | Numera`,
    description: l.oneLineSummary || `Learn ${l.title} with clear intuition, worked examples, and common mistakes to avoid.`,
    canonical: `/learn/${encodeURIComponent(id)}`,
    body,
  }));
});

module.exports = router;
