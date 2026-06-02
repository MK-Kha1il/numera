#!/usr/bin/env node
/*
 * Claude Code PreToolUse(Bash) hook — server quality gate.
 *
 * Purpose: keep the decomposed server green by refusing to let a `git commit`
 * that stages server/*.js changes go through if `npm test` or `npm run lint`
 * fails. It's a "don't commit red" guard — no noise while editing, the check
 * runs only at the commit checkpoint.
 *
 * Contract: receives the hook payload as JSON on stdin. Exits 0 to allow the
 * tool call; exits 2 to BLOCK it (PreToolUse semantics), printing the failure
 * to stderr so the assistant sees what to fix.
 *
 * Fast no-op for: any Bash command that isn't a git commit, commits that don't
 * stage server/*.js, or anything that can't be evaluated (never gets in the way).
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.dirname(__dirname); // scripts/ lives at repo root
const SERVER = path.join(ROOT, 'server');

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

let cmd = '';
try {
  const input = JSON.parse(readStdin() || '{}');
  cmd = (input.tool_input && input.tool_input.command) || '';
} catch {
  // no/invalid stdin → treat as non-commit, don't interfere
}

// 1. Only gate real commits.
if (!/\bgit\s+commit\b/.test(cmd)) process.exit(0);

// 2. Only gate when server JS is actually staged.
let staged = '';
try {
  staged = execSync('git diff --cached --name-only', { cwd: ROOT, encoding: 'utf8' });
} catch {
  process.exit(0); // not a git repo / no index → stay out of the way
}
const touchesServerJs = staged
  .split('\n')
  .map((f) => f.trim())
  .some((f) => /^server\/.*\.js$/.test(f) && !f.includes('node_modules'));
if (!touchesServerJs) process.exit(0);

// 3. Run the gate in server/.
function run(label, command) {
  try {
    execSync(command, { cwd: SERVER, encoding: 'utf8', stdio: 'pipe' });
    return null;
  } catch (e) {
    const out = `${e.stdout || ''}\n${e.stderr || ''}`.trim();
    return `${label} FAILED:\n${out.split('\n').slice(-25).join('\n')}`;
  }
}

const failure = run('npm test', 'npm test') || run('npm run lint', 'npm run lint');
if (failure) {
  process.stderr.write(
    '\n[server quality gate] Commit blocked — server checks failed. Fix these, then commit again:\n\n' +
      failure +
      '\n\n(This guard runs npm test + npm run lint in server/ whenever a commit stages server/*.js.)\n'
  );
  process.exit(2); // PreToolUse exit 2 → block the commit
}
process.exit(0);
