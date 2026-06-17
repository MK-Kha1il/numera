// Printable practice worksheets (ultra review opp#40). The generator already produces unlimited,
// vetted problems — this exposes them as a clean, printable HTML page (problems + an answer key)
// for the parent/teacher persona the product otherwise under-serves. Public + rate-limited: a
// teacher can bookmark a URL and print a fresh sheet, no account needed (no user data is touched).
const express = require('express');
const { generateProblem } = require('../mathGenerator');
const { normalizeLevelForGenerator } = require('../lib/progression');
const { rateLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// The curated, learner-facing strands (friendly label -> generator category). Mirrors the
// checkpoint-exam strand list so worksheets only ever offer well-supported content.
const CATEGORIES = [
  { key: 'arithmetic', label: 'Arithmetic' },
  { key: 'fractions', label: 'Fractions' },
  { key: 'decimals', label: 'Decimals' },
  { key: 'integers', label: 'Integers' },
  { key: 'algebra', label: 'Algebra' },
  { key: 'geometry', label: 'Geometry' },
  { key: 'number_theory', label: 'Number Theory' },
  { key: 'statistics', label: 'Statistics' },
];

// Minimal HTML escape — generated content is trusted (our own generator), but a stray < or & must
// never break the page structure. LaTeX delimiters ($, \) are left intact for MathJax.
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// GET /worksheet?category=arithmetic&level=5&count=12 — a printable practice sheet.
router.get('/worksheet', rateLimiter(30, 10 * 60 * 1000), (req, res) => {
  const cat = CATEGORIES.find((c) => c.key === String(req.query.category || '').toLowerCase()) || CATEGORIES[0];
  let level = parseInt(req.query.level, 10);
  if (!Number.isFinite(level) || level < 1) level = 5;
  if (level > 60) level = 60;
  let count = parseInt(req.query.count, 10);
  if (!Number.isFinite(count)) count = 12;
  count = Math.min(30, Math.max(5, count));

  const normLevel = normalizeLevelForGenerator(cat.key, level);
  const problems = [];
  let guard = 0;
  while (problems.length < count && guard < count * 5) {
    const p = generateProblem(cat.key, normLevel, problems.length * 7 + guard, 1000);
    if (p && p.question && p.correctAnswer != null) {
      problems.push({ question: p.question, answer: String(p.correctAnswer) });
    }
    guard++;
  }

  const today = new Date().toISOString().slice(0, 10);
  const otherCats = CATEGORIES
    .map((c) => `<a href="/worksheet?category=${c.key}&level=${level}&count=${count}"${c.key === cat.key ? ' class="cur"' : ''}>${c.label}</a>`)
    .join('');

  const items = problems
    .map((p, i) => `
      <li class="prob">
        <div class="q"><span class="num">${i + 1}.</span> ${esc(p.question)}</div>
        <div class="work"></div>
      </li>`)
    .join('');

  const key = problems
    .map((p, i) => `<span class="ans"><b>${i + 1}.</b> ${esc(p.answer)}</span>`)
    .join('');

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Numera Worksheet — ${cat.label} (Level ${level})</title>
  <script>
    window.MathJax = { tex: { inlineMath: [['$', '$'], ['\\\\(', '\\\\)']] }, svg: { fontCache: 'global' } };
  </script>
  <script async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Georgia, 'Times New Roman', serif; color: #111; max-width: 800px; margin: 0 auto; padding: 32px 24px; }
    header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #111; padding-bottom: 10px; margin-bottom: 6px; }
    h1 { font-size: 1.5rem; margin: 0; }
    .brand { font-weight: 700; letter-spacing: 1px; }
    .meta { color: #555; font-size: 0.9rem; margin-bottom: 22px; }
    .name-line { margin: 14px 0 24px; color: #333; font-size: 0.95rem; }
    ol.problems { list-style: none; padding: 0; margin: 0; }
    .prob { margin-bottom: 22px; page-break-inside: avoid; }
    .q { font-size: 1.05rem; line-height: 1.5; }
    .num { font-weight: 700; margin-right: 6px; }
    .work { height: 46px; border-bottom: 1px dotted #bbb; margin: 8px 0 0 22px; }
    .answer-key { margin-top: 40px; border-top: 2px dashed #999; padding-top: 14px; page-break-before: always; }
    .answer-key h2 { font-size: 1rem; }
    .ans { display: inline-block; min-width: 110px; margin: 0 14px 8px 0; font-size: 0.95rem; }
    .picker { margin: 0 0 20px; font-size: 0.85rem; }
    .picker a { color: #2a52be; text-decoration: none; margin-right: 12px; }
    .picker a.cur { font-weight: 700; text-decoration: underline; color: #111; }
    footer { margin-top: 30px; color: #777; font-size: 0.8rem; text-align: center; }
    @media print { .picker, footer .noprint { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <header>
    <h1>${cat.label} Practice</h1>
    <div class="brand">NUMERA</div>
  </header>
  <div class="meta">Level ${level} · ${problems.length} problems · ${today}</div>
  <div class="picker noprint">Switch topic: ${otherCats}</div>
  <div class="name-line">Name: ____________________________&nbsp;&nbsp;&nbsp;&nbsp;Date: ______________</div>

  <ol class="problems">${items}</ol>

  <section class="answer-key">
    <h2>Answer Key</h2>
    <div>${key}</div>
  </section>

  <footer>
    Generated by <strong>Numera</strong> — free, private math practice.
    <span class="noprint">· <a href="/">numera</a></span>
  </footer>
</body>
</html>`);
});

module.exports = router;
