# Numera — Legal, Privacy, Safety, IP & Compliance Audit

> Scope: full application (Android client + Node/Express/SQLite server) as of 2026-06-04.
> Lens: privacy, child safety, consumer protection, IP/licensing, accessibility, platform
> policy, and required legal documents. This is **not** legal advice — it flags risk and
> remediation for review by qualified counsel before any public/Play Store release.
>
> Companion docs: engineering audit `AUDIT.md`, auth security `SecurityAudit-Auth.md`,
> `Security.md`. This file covers the legal/compliance surface those don't.

## Remediation status (updated 2026-06-04)

A first remediation pass has landed. Status of the flagged items:

| ID | Item | Status |
|---|---|---|
| C1 | Privacy Policy + ToS | ✅ Drafted (`docs/PrivacyPolicy.md`, `docs/TermsOfService.md`) — **needs counsel review + publishing/linking** |
| C2 | Age gate (13+) | ✅ Server enforces neutral DOB gate at registration; client collects DOB (signup + Google dialog) with instant 13+ feedback; birth year stored (minimized) |
| C3 | Cleartext traffic | ✅ Global cleartext removed; `network_security_config.xml` forces TLS except an explicit dev-host allowlist |
| C4 | Account deletion | ✅ Now deletes **all** user-scoped tables (driven off `USER_SCOPED_TABLES`); message corrected; completeness test added |
| H1 | UGC moderation | ✅ Content blocklist filter (usernames + collection names); block/report endpoints + admin queue; client Block/Report on profile; friends respect blocks |
| H2 | Profiling opt-in | ✅ New accounts default `telemetry_enabled = 0` (opt-in); existing privacy toggle unchanged |
| M1 | Data export completeness | ✅ Export now includes behavioral/psychometric tables |
| M2 | Retention | ✅ `services/retention.js` purges expired sessions/tokens + old audit logs on a daily sweep |
| M3 | Licenses | ✅ `LICENSE` (proprietary default) + `THIRD_PARTY_NOTICES.md` added |
| L1 | AI/generated-content disclaimer | ✅ In ToS §7 + in-app note on the lesson screen |
| L2 | Backup | ✅ `allowBackup=false`; backup-rule files wired |
| M4 | Accessibility | ⬜ Not addressed this pass (WCAG/TalkBack audit still pending) |
| M5 | Engagement mechanics review | ⬜ Policy/product review still pending |
| L3 | Admin access / DPIA | ⬜ Documentation/DPIA still pending |

Verification: `server/` `npm test` 64 passing (incl. new `test/compliance.test.js`), `npm run lint`
0 errors; Android `assembleDebug` green. Items still requiring **human/legal action**: publish &
link the policies, complete the Play Data Safety / Apple privacy forms, counsel review, and the
accessibility + DPIA work (M4/M5/L3).

---

## 0. Executive summary

Numera is technically solid (strong auth, transactional economy, audit logging) but is
**not release-ready from a legal/compliance standpoint**. The dominant risks:

1. **No Privacy Policy and no Terms of Service exist anywhere** — a hard blocker for any app
   store and for GDPR/CCPA/COPPA.
2. **No age gating or child-safety controls**, despite a math-learning product that plainly
   appeals to minors — and the app performs **behavioral/psychometric profiling**, which is
   exactly what COPPA and the UK Children's Code restrict for kids.
3. **Cleartext (HTTP) traffic is enabled**, sending credentials, tokens, and behavioral data
   unencrypted.
4. **"Delete account" does not delete all personal data** and the success message
   ("All data wiped") is factually false — a GDPR erasure failure and a consumer-deception risk.
5. **User-generated content (usernames, public collections) has zero moderation, reporting,
   or blocking.**

None of these are deep architectural problems — most are bounded, well-understood fixes. But
several are launch blockers and must be resolved before the app is distributed.

---

## 1. Data inventory (what is collected & stored)

Derived from `server/db.js` schema + route handlers.

| Category | Fields / tables | Sensitivity |
|---|---|---|
| Account identifiers | `username` (public), `password_hash` (argon2id), `email` (optional, default empty) | PII |
| Auth/security | `user_sessions` (IP address, user-agent, timestamps), `security_audit_logs` (IP, event, details), `refresh_tokens`, `user_mfa_recovery_codes`, `mfa_secret` | PII + secrets |
| Game/progression | xp, level, coins, rank, streak, achievements, inventory, league/elo | Low |
| **Behavioral / psychometric** | `learner_profiles` (confidence, response-ms, retention, hint/calc/retry rates), `user_misconceptions`, `learning_style_signals`, `user_concept_analytics` (hesitation_index), `problem_pedagogical_feedback` (frustration_index), `tilt_tracking` (tilt_score), `users.burnout_risk`/`consistency_index`/`burnout_counter`, `smurf_signals`, `user_calculator_analytics`, `user_ratings`/`rating_history`, `learning_velocity`, `retention_schedule`, `competitive_profiles` | **Sensitive** — inferred cognitive/emotional state, especially when the user may be a child |
| UGC | `username`, `saved_collections.name` (+ `is_public`), saved exercise content | Public-exposed, unmoderated |

**Notable positives:** no analytics/ads/crash SDKs (no Firebase, Crashlytics, AdMob, Meta,
Sentry); no third-party AI APIs (math content is generated locally); tokens stored client-side
via `androidx.security:security-crypto`; no real-money payments or IAP anywhere.

---

## 2. Risk assessment (ranked)

Severity = legal/regulatory exposure × likelihood × user-harm. **CRITICAL** items are
release blockers.

### CRITICAL

**C1 — No Privacy Policy / no Terms of Service.**
Neither document exists in the repo or app. GDPR (Arts 12–14), CCPA/CPRA, and both Google Play
and Apple App Store *require* a published, linked privacy policy. Play also requires a Data
Safety form that must match actual behavior. Without these, the app is non-distributable and
all processing lacks a lawful-basis disclosure.

**C2 — No age gating / child-safety regime.**
A gamified math app self-evidently appeals to children, yet there is no age screen, no date of
birth, no parental-consent flow, and no "mixed audience" neutral age gate. Combined with the
behavioral profiling in §1, this implicates:
- **COPPA** (US, under-13): behavioral tracking and profiling of under-13s requires verifiable
  parental consent; the app does neither.
- **GDPR-K / Art 8** (EU, digital consent age 13–16 by member state) and **UK Age Appropriate
  Design Code ("Children's Code")**: the Children's Code specifically restricts profiling and
  "detrimental" engagement nudges for children, and mandates high-privacy defaults.
- **Google Play Families / Designed for Families** policy and Apple "Kids" category rules.
This is the single largest regulatory exposure. Either (a) gate to 13+/16+ with a neutral age
screen and block under-age signups, or (b) build a compliant child mode (parental consent,
profiling off, high-privacy defaults). Until decided, do not market to or onboard children.

**C3 — Cleartext traffic enabled.**
`AndroidManifest.xml` sets `android:usesCleartextTraffic="true"`, so the client will speak
plain HTTP — transmitting usernames, passwords, JWT access/refresh tokens, and behavioral data
in the clear and exposing them to network interception. (The server even sets an HSTS header,
so client and server disagree about transport security.) Enforce HTTPS/TLS and remove the
cleartext flag (or scope it to a debug-only network-security config for localhost).

**C4 — "Delete account" is incomplete and its confirmation is false.**
`POST /api/user/delete-account` deletes 17 tables but **leaves user-linked rows in at least:**
`user_ratings`, `rating_history`, `smurf_signals`, `learning_velocity`, `tilt_tracking`,
`season_ratings`, `user_calculator_analytics`, `learner_profiles`, `user_misconceptions`,
`retention_schedule`, `learning_style_signals`, `competitive_profiles`, `saved_collections`,
`password_reset_tokens`, `user_mfa_recovery_codes`. The handler then returns
*"Account deleted successfully. All data wiped."* — which is untrue. This is a GDPR Art 17
("right to erasure") failure and a consumer-protection/false-statement risk. The retained rows
are the *most* sensitive (behavioral/psychometric). Fix: delete every `user_id`-keyed table in
one transaction (and add an automated test that asserts zero residual rows across all tables),
or implement documented anonymization instead of deletion if retention is justified.

### HIGH

**H1 — UGC with no moderation, reporting, or blocking.**
Usernames are shown publicly (leaderboards, friends, profiles); `saved_collections.name` is
free text exposed to others when `is_public=1`. There is:
- no profanity/blocklist filter on usernames or collection names (`username` regex permits any
  alphanumeric string, including slurs),
- no user reporting / content flagging,
- no block/mute, and friend requests cannot be declined or blocked, only accepted.
Platform policies (Play "User Generated Content", Apple §1.2) require moderation tooling,
reporting, and blocking for any app with UGC — and the bar is higher if minors are present.
This is both a policy blocker and a safety risk.

**H2 — Profiling on by default (opt-out, not opt-in).**
`users.telemetry_enabled DEFAULT 1`; the privacy toggle (`POST /api/user/privacy`) only lets a
user turn it *off* after the fact, and the sensitive behavioral tables appear to be written
regardless. GDPR Art 25 (data protection by default) and Art 22 (automated profiling) favor
opt-in consent for non-essential behavioral profiling, and the Children's Code requires
high-privacy defaults for minors. Make profiling opt-in (or at minimum honor `telemetry_enabled`
everywhere it's written and default it off for anyone under the consent age).

### MEDIUM

**M1 — Data export is incomplete (GDPR Art 15/20).**
`GET /api/user/export-data` returns profile, inventory, SRS, mistakes, favorites, and security
logs — but omits the behavioral/psychometric data (ratings, learner_profiles, misconceptions,
analytics, calculator analytics, learning style). Portability/access should cover *all* personal
data held about the user.

**M2 — No data-retention or log-purge policy.**
`security_audit_logs` and `user_sessions` store IP addresses (PII under GDPR) with no expiry or
purge job; rows accumulate indefinitely. Define retention windows and add a purge job; document
them in the privacy policy.

**M3 — Third-party license attribution missing.**
No `LICENSE` file for Numera itself and no open-source attribution/notices screen in the app.
Bundled OSS includes Apache-2.0 components (OkHttp, Retrofit, socket.io-client, ZXing,
AndroidX) whose license requires attribution, plus MIT (Express, etc.). Add a `NOTICES`/
third-party-licenses screen (Gradle's `oss-licenses` plugin or a generated list) and choose/declare
a license for the project's own code.

**M4 — Accessibility is partial and undocumented.**
`contentDescription` appears in only 12 of the UI files (42 occurrences) — many interactive
elements are unlabeled for TalkBack. Math is rendered via a KaTeX **WebView**, which is
typically opaque to screen readers (no MathML/alt text). State is signaled by color
(correct/incorrect banners, rarity tiers) without a guaranteed non-color cue. No documented
a11y testing. Relevant to ADA/Section 508 (if used in US schools), EN 301 549 (EU), and Play's
accessibility guidance. Audit against WCAG 2.1 AA: labels, focus order, contrast, touch-target
size (48dp), and an accessible math fallback.

**M5 — Engagement/"dark pattern" mechanics vs. minor wellbeing.**
Streaks, hearts/"out of hearts", commitment/relic loss, FOMO countdown timers
(`expiresInSeconds`, featured rotation), and dynamic discounts are engagement-maximizing nudges.
Ironically the app *measures* `burnout_risk` and `tilt_score` while deploying these. The
Children's Code explicitly addresses nudge techniques and features that extend engagement to a
child's detriment. Even with no real money involved, review these for minors and disclose them.

### LOW

**L1 — No AI/auto-generated-content disclosure or educational disclaimer.**
Problems, explanations, Socratic hints, and tips are algorithmically generated. There's no
disclaimer that content is auto-generated and may contain errors (a real LaTeX-corruption bug
in generated answer choices was already found — see `AUDIT.md` §9). For an educational product
this is a consumer-expectation and accuracy-liability gap. Add an "auto-generated; verify
independently; not a substitute for instruction" disclaimer.

**L2 — `android:allowBackup="true"`.**
Default allows app data (incl. the encrypted token store) to be captured in device/cloud
backups. Set `allowBackup="false"` or define `dataExtractionRules`/`fullBackupContent` excluding
credentials.

**L3 — Admin visibility into all users' IPs/events.**
`GET /api/admin/security-logs` exposes every user's IP and activity to an admin role. Justify
under least-privilege, document who holds the role, and cover internal access in the policy.

---

## 3. Compliance gaps by regime

- **GDPR (EU/UK):** missing privacy notice (Arts 12–14), no lawful basis stated, profiling by
  default vs. Art 25, incomplete erasure (Art 17 — **C4**), incomplete access/portability
  (Art 15/20 — **M1**), no retention policy (**M2**), child consent (Art 8 — **C2**), DPIA not
  done (profiling + likely children = DPIA required), no DPO/representative info.
- **UK Children's Code:** age-appropriate default-high privacy, profiling off for children,
  nudge/engagement scrutiny — all unaddressed (**C2/H2/M5**).
- **COPPA (US):** behavioral profiling of under-13s without verifiable parental consent (**C2**);
  no direct-notice mechanism.
- **CCPA/CPRA (US-CA):** no privacy policy, no "do not sell/share" (likely N/A since no selling,
  but must be stated), no disclosure of categories collected.
- **App Store / Play policy:** no privacy policy link (blocker), Data Safety form can't be
  truthfully completed yet, UGC moderation requirements (**H1**), Families policy (**C2**),
  cleartext traffic warnings (**C3**).
- **Accessibility law (ADA/§508/EN 301 549):** partial (**M4**).
- **Consumer protection:** false deletion confirmation (**C4**), engagement dark patterns
  (**M5**). (No auto-renewing subscriptions or IAP exist, so subscription/auto-renewal disclosure
  law and refund-flow requirements do **not** currently apply — keep it that way, or this whole
  area opens up.)

---

## 4. Required policies & documents (none currently exist)

1. **Privacy Policy** — categories collected (§1), purposes, lawful bases, retention, third
   parties (email/SMTP processor, jsdelivr CDN for KaTeX), user rights (access/export/delete/
   correct/object), children's section, contact/DPO. Must be linked in-app and at the store
   listing.
2. **Terms of Service / EULA** — license to use, acceptable-use (esp. UGC/usernames),
   account termination, virtual-currency terms (coins have no cash value, are non-transferable,
   non-refundable, may be revoked), disclaimers/limitation of liability, governing law.
3. **Play Data Safety form** (and Apple privacy "nutrition label") — must match the policy and
   the code.
4. **Children's policy decision record** — gate to 13+/16+ *or* build a compliant child mode;
   document the choice (extends the existing R9 decision in `SecurityAudit-Auth.md`).
5. **Community Guidelines / Acceptable Use** for UGC.
6. **Open-source NOTICES / third-party licenses** screen + a license for Numera's own code.
7. **Data Retention Policy** (internal) and a **DPIA** (profiling + children trigger it).
8. **Cookie/SDK note** — minimal (no web cookies, no ad SDKs) but state it.

---

## 5. Recommended in-app disclosures

- Privacy Policy + ToS links on the **signup screen**, with explicit accept.
- A **neutral age gate** at first launch (date of birth, not "are you 13?").
- **Consent prompt for behavioral analytics** (opt-in), separate from account creation.
- **Auto-generated-content / educational disclaimer** in lessons and problem screens (**L1**).
- **Virtual-currency disclosure** (coins are not real money, non-refundable) in the shop.
- **Open-source licenses** entry in Settings.
- **UGC notice** at the points a username or public collection name is set ("visible to others;
  keep it appropriate").

---

## 6. Missing user controls

- ❌ Complete account deletion (currently partial — **C4**).
- ❌ Complete data export (currently partial — **M1**).
- ❌ Block / mute / report another user; decline a friend request.
- ❌ Report inappropriate content (usernames, public collections).
- ❌ Opt **in** to analytics (only an after-the-fact opt-out toggle exists, of uncertain reach).
- ❌ Parental controls / consent.
- ✅ Present and good: password/email change with verification, session list + remote revoke,
   MFA (TOTP + recovery codes), per-user security log view, private-profile toggle (now
   enforced), telemetry/private toggles.

---

## 7. Priority-ranked remediation plan

**P0 — release blockers (do before any distribution):**
1. Author & publish **Privacy Policy + ToS**; link them in-app (signup) and at the store listing. (**C1**)
2. Decide and implement the **children strategy**: neutral age gate + block under-age, or a
   compliant child mode. Default behavioral profiling **off** for minors. (**C2/H2**)
3. **Disable cleartext traffic**; enforce HTTPS/TLS end to end. (**C3**)
4. Fix **account deletion** to remove *every* user-linked table in one transaction; add a test
   asserting zero residual rows; correct the success message. (**C4**)
5. Add **UGC moderation**: username/collection-name blocklist filter, report flow, and
   block/decline. (**H1**)

**P1 — pre-launch / fast-follow:**
6. Make behavioral analytics **opt-in**; honor `telemetry_enabled` at every write site. (**H2**)
7. Complete **data export** to cover all personal data. (**M1**)
8. Define & enforce **data retention** (purge old IP-bearing logs/sessions). (**M2**)
9. Add **third-party license screen** + project `LICENSE`. (**M3**)
10. Complete the **Play Data Safety / Apple privacy** forms to match.

**P2 — quality & defensibility:**
11. **Accessibility** pass to WCAG 2.1 AA, incl. accessible math fallback. (**M4**)
12. Review **engagement mechanics** for minors; disclose. (**M5**)
13. **Auto-generated-content disclaimer**. (**L1**)
14. `allowBackup="false"` / backup exclusion rules. (**L2**)
15. Document **admin access** under least-privilege; complete a **DPIA**. (**L3**)

---

## 8. Things that are already good (keep them)

- No ads, no third-party analytics/crash SDKs, no real-money IAP or subscriptions — this avoids
  a large class of IAP/auto-renewal/refund consumer-law and ad-network-privacy risk. **Do not
  add monetization without revisiting this entire audit.**
- Strong auth posture (argon2id, MFA, rotating refresh tokens, lockouts, audit log) per
  `SecurityAudit-Auth.md`.
- Self-hosted, locally-generated content — no user data sent to external AI/LLM services.
- Private-profile enforcement and session-revocation controls already shipped.
</content>
</invoke>
