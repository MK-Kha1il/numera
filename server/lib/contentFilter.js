// Pure, unit-tested content moderation for user-visible free text (usernames, public
// collection names). This is a first-line blocklist filter, NOT a complete moderation system —
// it pairs with the report/block endpoints (routes/moderation.js) for human-in-the-loop review.
//
// Design notes:
//  - Catches the obvious cases: a curated profanity/slur seed list, leet-speak normalization
//    (4->a, 3->e, 1/!->i, 0->o, $->s, @->a), and separator stripping so "f.u.c.k" / "f_u_c_k"
//    can't trivially bypass it.
//  - Deliberately conservative on substring matching to limit the "Scunthorpe problem": only a
//    small set of standalone slurs are matched as substrings; the rest must appear as a token
//    (word-boundary) so legitimate names like "assassin" or "passage" are not rejected.
//  - No external dependency, no network — safe to call on the hot signup path.

'use strict';

// Seed list. Kept intentionally small and obvious; extend via ops as needed. Lower-case.
// `word`  → matched on a normalized token boundary (default).
// `sub`   → matched anywhere in the normalized string (use only for unambiguous slurs).
const BLOCKLIST = [
  { t: 'fuck', mode: 'sub' },
  { t: 'shit', mode: 'word' },
  { t: 'bitch', mode: 'sub' },
  { t: 'cunt', mode: 'sub' },
  { t: 'asshole', mode: 'sub' },
  { t: 'dick', mode: 'word' },
  { t: 'pussy', mode: 'sub' },
  { t: 'cock', mode: 'word' },
  { t: 'whore', mode: 'sub' },
  { t: 'slut', mode: 'word' },
  { t: 'nigger', mode: 'sub' },
  { t: 'nigga', mode: 'sub' },
  { t: 'faggot', mode: 'sub' },
  { t: 'fag', mode: 'word' },
  { t: 'retard', mode: 'sub' },
  { t: 'rape', mode: 'word' },
  { t: 'nazi', mode: 'sub' },
  { t: 'kkk', mode: 'word' },
  { t: 'porn', mode: 'sub' },
  { t: 'sex', mode: 'word' },
  { t: 'admin', mode: 'word' }, // impersonation of staff
  { t: 'moderator', mode: 'word' },
  { t: 'numerastaff', mode: 'sub' },
];

const LEET_MAP = { '4': 'a', '@': 'a', '3': 'e', '1': 'i', '!': 'i', '0': 'o', '$': 's', '5': 's', '7': 't' };

// Lower-case, map leet glyphs to letters, then drop every non-alphanumeric character so that
// separator-spaced evasions ("f u c k", "f.u.c.k") collapse to a matchable token stream.
function normalize(input) {
  const lowered = String(input || '').toLowerCase();
  let out = '';
  for (const ch of lowered) out += LEET_MAP[ch] || ch;
  return out.replace(/[^a-z0-9]/g, '');
}

// Tokenized form (keeps word boundaries) for `word`-mode matches.
function tokenize(input) {
  const lowered = String(input || '').toLowerCase();
  let mapped = '';
  for (const ch of lowered) mapped += LEET_MAP[ch] || ch;
  return mapped.split(/[^a-z0-9]+/).filter(Boolean);
}

// Returns { ok: true } or { ok: false, error } if the text contains blocked content.
// `label` customizes the error ("Username"/"Collection name") for the client message.
function checkText(text, label = 'Text') {
  const collapsed = normalize(text);
  const tokens = tokenize(text);
  const tokenSet = new Set(tokens);
  // Also collapse each token individually so "sh1t" -> "shit" matches a word-mode entry.
  const collapsedTokens = new Set(tokens.map((t) => normalize(t)));

  for (const entry of BLOCKLIST) {
    if (entry.mode === 'sub') {
      if (collapsed.includes(entry.t)) {
        return { ok: false, error: `${label} contains inappropriate language. Please choose another.` };
      }
    } else {
      if (tokenSet.has(entry.t) || collapsedTokens.has(entry.t)) {
        return { ok: false, error: `${label} contains inappropriate language. Please choose another.` };
      }
    }
  }
  return { ok: true };
}

module.exports = { checkText, normalize, tokenize };
