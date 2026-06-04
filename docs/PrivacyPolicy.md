# Numera — Privacy Policy

> **DRAFT — requires review by qualified counsel before publication.** This is a good-faith
> first draft that matches what the code actually does (see `docs/ComplianceAudit.md`). It is
> not legal advice. Fill in the bracketed `[…]` placeholders (legal entity, contact, governing
> law) before publishing, and keep it in sync with the Play Data Safety / App Store privacy
> labels.

**Last updated:** [DATE] · **Effective:** [DATE]

## Who we are
Numera ("we", "us") is a gamified math-learning application operated by [LEGAL ENTITY].
Contact: [PRIVACY CONTACT EMAIL]. [If applicable: Data Protection Officer / EU-UK
representative: [DETAILS].]

## The short version
- You must be **13 or older** to use Numera. We block accounts that report an age under 13.
- We collect the minimum needed to run your account and the learning features.
- **Behavioral/learning analytics are OFF by default.** They turn on only if you opt in.
- We don't sell your data, run third-party ads, or use third-party analytics/tracking SDKs.
- You can **export** or **delete** all your data at any time from the app.

## What we collect

**You give us:**
- **Account:** username, password (stored only as an Argon2id hash — never in plaintext),
  and your **birth year** (derived from the date of birth you enter for age verification; we
  keep the year only).
- **Optional email address** (only if you add one) — used for password reset and email
  verification.
- **User-generated content:** your username and any collection names you create (these may be
  shown to other users, e.g. on leaderboards or public collections).

**Created as you use the app:**
- **Game/progression data:** XP, level, coins, rank, streak, achievements, inventory, league.
- **Security data:** session records and a security audit log, which include your **IP address**
  and device user-agent, used to protect your account and detect abuse.

**Behavioral / learning analytics — collected only if you opt in:**
- Per-concept mastery, confidence, response times, hesitation, retry/hint usage, inferred
  misconceptions, learning-style signals, skill ratings, and related engagement signals used to
  personalize practice. This processing is **off by default** and controlled by the privacy
  toggle in Settings.

We do **not** collect precise location, contacts, photos, or device identifiers for advertising,
and we do **not** integrate third-party advertising or analytics SDKs.

## Why we use it (lawful bases under GDPR)
- **Provide the service / perform our contract with you:** account, progression, social
  features, security.
- **Legitimate interests:** securing accounts, preventing fraud/abuse (security logs).
- **Consent:** behavioral/learning analytics (opt-in); you can withdraw consent anytime in
  Settings.

## Children
Numera is intended for users **13 and older**. We use a neutral age screen at signup and refuse
accounts reporting an age under 13. We do not knowingly collect data from children under 13.
If you believe a child under 13 has created an account, contact [PRIVACY CONTACT EMAIL] and we
will delete it. For users who are minors above 13, behavioral analytics remain off unless
explicitly enabled.

## How we share it
We do **not** sell or rent personal data. We share only with:
- **Email delivery provider** (SMTP) — to send password-reset/verification emails, if you use an
  email address. [NAME PROVIDER once finalized.]
- **Hosting/infrastructure** — [HOSTING PROVIDER].
- **Legal** — where required by law or to protect rights and safety.
- A content-delivery network (jsDelivr) serves the open-source KaTeX math-rendering library to
  the app; this may expose your IP to that CDN as part of normal content loading.

## Retention
- **Security audit logs:** retained up to **365 days**, then purged (configurable).
- **Sessions / refresh tokens:** removed when expired or revoked.
- **Password-reset tokens:** deleted when used or expired.
- **Account & learning data:** kept while your account exists; erased on account deletion.
We run an automated retention sweep to enforce these windows.

## Your rights
Depending on where you live (GDPR/UK GDPR, CCPA/CPRA, and others) you can:
- **Access / export** your data — Settings → Export My Data (a complete JSON copy).
- **Delete** your account and all associated personal data — Settings → Delete Account.
- **Correct** your username/email; **object to / withdraw consent** for analytics (privacy
  toggle).
- Lodge a complaint with your supervisory authority.
We do not "sell" or "share" personal information for cross-context behavioral advertising as
defined by the CCPA/CPRA.

## Security
Passwords are hashed with Argon2id; optional two-factor authentication (TOTP) is available;
sessions can be reviewed and revoked; traffic is served over TLS in production. No system is
perfectly secure, but we apply layered safeguards (see `docs/Security.md`).

## Changes
We'll update this policy as the app evolves and revise the "Last updated" date. Material changes
will be surfaced in-app.

## Contact
[PRIVACY CONTACT EMAIL] · [POSTAL ADDRESS]
