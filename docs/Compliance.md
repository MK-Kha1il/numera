# Privacy, safety and compliance controls

What the app does today to handle user data and younger players. None of this is legal advice;
it needs a review by counsel before a public release.

## Accounts and age

- **Age gate (13+).** Registration asks for a date of birth and the server rejects anyone under
  13 (`routes/auth.js`, `MIN_AGE_YEARS`). Only the birth year is stored.
- **Minors** (under 18 by birth year) get in-app notifications only, never email
  (`isMinor` in `services/notificationService.js`).
- **Telemetry is opt-in.** New accounts start with `telemetry_enabled = 0`; learning-profile
  features that depend on it stay off until the player turns it on.

## Data rights

- **Export.** `GET /api/user/export-data` returns every user-scoped table, including the
  behavioural/mastery tables, not just the profile row (`routes/account.js`).
- **Deletion.** Account deletion clears every table in `USER_SCOPED_TABLES`;
  `test/compliance.test.js` checks every table with a user column for leftovers afterwards.
- **Retention.** `services/retention.js` runs daily and purges expired sessions and refresh
  tokens, used password-reset tokens, security-log rows older than a year (they hold IPs) and
  stale idempotency keys.

## Safety

- **No private messaging.** Friend nudges are a fixed server-side catalog (`routes/friends.js`).
- **Moderation.** Usernames, collection names and concept-discussion posts go through the
  blocklist in `lib/contentFilter.js`; players can block and report each other, and reports land
  in an admin queue (`routes/moderation.js`).
- **Generated content** is labelled as such on the lesson screen and in the Terms of Service.

## Transport and storage

- Release builds refuse cleartext HTTP (`android/app/src/main/res/xml/network_security_config.xml`);
  only the listed dev hosts are exempt in debug.
- `android:allowBackup="false"`, so tokens aren't copied into device backups.
- Auth details (argon2id, MFA, refresh-token rotation, lockouts) are in [Security.md](Security.md).

## Not done yet

- Accessibility pass (TalkBack labels exist on icons; no full WCAG review).
- Publishing and linking the [Privacy Policy](PrivacyPolicy.md) and [Terms](TermsOfService.md),
  and filling in the Play Data Safety form.
- There are no ads, third-party analytics SDKs or real-money purchases. Adding any of these
  means revisiting this page first.
