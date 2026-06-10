# Security Policy

## Supported versions

Numera is under active development. Security fixes are applied only to the latest code on the
`main` branch; there are no separately maintained release branches.

| Version | Supported |
|---|---|
| `main` (latest) | ✅ |
| Anything older | ❌ |

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report vulnerabilities privately through GitHub's
[private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability):

1. Go to the **Security** tab of this repository.
2. Click **Report a vulnerability** to open a private advisory.

> Maintainer note: this requires *Private vulnerability reporting* to be enabled under
> **Settings → Code security and analysis**.

When reporting, please include:

- A description of the vulnerability and its impact.
- Steps to reproduce (proof-of-concept where possible).
- Affected component(s) — e.g. server route/service, Android client, auth, duel/socket layer.

You can expect an initial acknowledgement within a few days. Please give a reasonable window to
investigate and ship a fix before any public disclosure.

## Scope

This project handles user accounts and progression server-side and is the authoritative source
for all rewards. Areas of particular interest:

- **Authentication** — Argon2id hashing, JWT/refresh-token rotation, TOTP MFA, password reset
  (see [docs/SecurityAudit-Auth.md](docs/SecurityAudit-Auth.md)).
- **Reward integrity** — idempotent reward endpoints, transactional balance mutations, and the
  server-authoritative duel scoring / anti-cheat path.
- **Transport & headers** — CORS and security middleware (see [docs/Security.md](docs/Security.md)).

Out of scope: vulnerabilities in third-party dependencies should be reported upstream (see
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)), though we appreciate a heads-up if one
materially affects Numera.
