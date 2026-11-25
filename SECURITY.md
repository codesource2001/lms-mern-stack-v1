# Security Policy — Atrium LMS

| Field            | Value                      |
| ---------------- | -------------------------- |
| Project          | Atrium LMS (`lms-mern-v1`) |
| Current build    | Phase 13 — security audit  |
| Production ready | **No**                     |
| Last reviewed    | 25 November 2026           |

Atrium is being built in phases. Phase 13 closes object-level access gaps, validates every id-bearing route, adds endpoint-specific rate limits, and expands audit coverage. The full audit, OWASP mapping, and performance budgets are in [`docs/SECURITY-AUDIT.md`](docs/SECURITY-AUDIT.md). Production deployment is **not** implemented. Do not deploy this build as a public learning platform.

---

## 1. Reporting a vulnerability

Please report suspected vulnerabilities privately:

1. Prefer a **private GitHub security advisory** on `codesource2001/lms-mern-stack-v1` (Security → Report a vulnerability).
2. If advisories are unavailable, contact the repository owner directly through their GitHub profile. Do not open a public issue containing exploit details, credentials, or personal data.

Include:

- Affected commit, file, or endpoint.
- Reproduction steps and expected vs. actual behavior.
- Impact assessment (confidentiality, integrity, availability).
- Any suggested remediation.
- Whether you intend to disclose publicly and on what timeline.

**Commitments**

- Acknowledge receipt within 3 business days.
- Provide a triage decision within 10 business days.
- Credit reporters in the fix notes unless anonymity is requested.
- Avoid legal action against good-faith research that respects privacy, avoids data destruction, and does not degrade service.

**Out of scope:** reports requiring a compromised developer machine, social engineering, physical access, denial of service through raw volume against a local development instance, or issues in dependencies without a demonstrated impact on this project (still welcome as informational).

---

## 2. Supported versions

| Version            | Supported | Notes                                         |
| ------------------ | --------- | --------------------------------------------- |
| `main` (0.1.x)     | ✅        | Pre-release foundation; best-effort fixes     |
| Older snapshots    | ❌        | No backports; use the latest `main`           |
| Deployed instances | ❌        | No supported production deployment exists yet |

There is no security SLA for this phase. Once deployment exists (Phase 14), this table will list supported release lines and patch windows.

---

## 3. Security controls implemented through Phase 13

### Authentication and authorization

- **Argon2id passwords** with configured memory, time, and parallelism. Password hashes are `select: false`; verification uses constant-time comparison via Argon2.
- **Short-lived access JWTs** (15 minutes by default) are returned in the response body and held in memory by the client. They are never stored in browser storage.
- **Rotating opaque refresh tokens** are delivered in an `HttpOnly`, `Secure` (production), `SameSite=Lax` cookie scoped to the auth path. Only SHA-256 hashes are stored.
- **Reuse detection** revokes the session and all of its refresh tokens and writes an audit entry.
- **Server-side sessions** are the revocation source of truth. Logout, logout-all, password change, and password reset revoke sessions.
- **Access-token verification checks session and user state**, so suspension and revocation take effect immediately.
- **Permission-based authorization** via `requireAuth` and `requirePermission`. No role-name string checks are used in business code.
- **Four seeded roles** (Super Admin, Admin, Instructor, Student) with granular permission codes.
- **Account lockout** after repeated failed logins, with progressive backoff.
- **Email verification and password reset** use single-use, hashed, expiring tokens.
- **CSRF defense** validates `Origin` or `Referer` on cookie-authenticated mutations and uses `SameSite=Lax`.
- **Audit logging** records login, logout, reuse detection, password changes, resets, profile updates, and email delivery failures.

### Data layer

- **Authenticated connections** — MongoDB requires a username/password and Redis requires a password. Local Compose binds both to `127.0.0.1` only.
- **Fail-closed startup** — the API does not listen until MongoDB and Redis connect. Failures are retried a bounded number of times, then reported with the dependency name and the environment variable to check.
- **Bounded waits** — every startup attempt, readiness probe, and shutdown step has a timeout. No dependency can hang process boot or termination indefinitely.
- **Production placeholder rejection** — `local-dev-only-change-me` is rejected when `NODE_ENV=production`; deployments must inject real secrets.
- **Readiness without leakage** — `/health/ready` returns only per-dependency status and latency. It never returns connection strings, credentials, driver errors, or stack traces.
- **Liveness isolation** — `/health` never touches a dependency, so a database outage cannot trigger a restart loop.
- **Schema conventions** — models are built through `createBaseSchema()`, which applies timestamps and hides `_id`/`__v` from JSON. Soft delete is opt-in and never silently applied.
- **Bounded queries** — the only sanctioned list helpers cap page size at 100, allowlist sort fields, reject unknown filters, and require escaping of search terms used in regexes.
- **Idempotent seeding** — the runner executes seeds in dependency order and stops at the first failure. The RBAC catalog seeds roles and permissions idempotently.

### API transport and headers

- **Helmet 8** applies security headers to API responses, including `X-Content-Type-Options`, `X-Frame-Options`, referrer policy, and cross-origin resource policies.
- **CORS allowlist** — origins come from `CORS_ORIGINS`; credentials are enabled; unknown origins receive no CORS grant. Wildcards are not supported.
- **JSON body limit** — 1 MB, strict JSON parsing. Malformed JSON returns `400 INVALID_JSON`; oversized bodies return `413 PAYLOAD_TOO_LARGE`.
- **Global rate limiting** — `express-rate-limit` with configurable window/limit (default 120 requests per 60 seconds per IP). Health checks and preflight requests are skipped. Rate-limited responses use the standard error envelope with `429 RATE_LIMITED`.
- **Explicit proxy trust** — `TRUST_PROXY_HOPS` defaults to `0`. Client IPs are not taken from forwarded headers unless a deployment explicitly configures trusted hops.
- **Request IDs** — every response carries `x-request-id`. Client-supplied IDs must match `[A-Za-z0-9._-]{8,64}` or are replaced with a UUID, preventing log injection and unbounded values.
- **Graceful shutdown** — SIGINT/SIGTERM stop accepting connections, close idle connections, drain in-flight requests, disconnect Redis and MongoDB, and force-exit after 10 seconds.

### Application and data handling

- **Configuration validation** — all backend environment variables are parsed by Zod at startup. Invalid configuration fails fast with field-level messages and never falls back to insecure defaults.
- **Centralized error handling** — known errors use stable codes; unknown errors become a generic `500 INTERNAL_SERVER_ERROR`. Stack traces, database details, and internal paths are not returned to clients.
- **Structured logging with redaction** — Pino redacts authorization headers, cookies, `set-cookie`, passwords, tokens, and refresh tokens. API responses are not logged by default. Connection lifecycle logs contain dependency names, never connection strings.
- **Request validation** — Zod validates params, query, and body at the boundary, returning `422 VALIDATION_ERROR` with source-qualified fields. Domain routes use the middleware.
- **Generated API contract** — OpenAPI 3.1 is generated from Zod schemas. Swagger UI is mounted only outside production or with `ENABLE_API_DOCS=true`, and the relaxed CSP applies only while docs are enabled.
- **No client secrets** — only `VITE_*` variables are exposed to the bundle, and they are validated. No secrets exist in the frontend today.
- **Strict TypeScript** — `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `verbatimModuleSyntax` reduce classes of null/undefined and import defects.
- **Dependency pinning** — exact versions and a committed lockfile. `npm install` reported **0 known vulnerabilities** at the Phase 2 baseline; this is point-in-time evidence, not a guarantee.

### Certificates and public verification

- **Non-enumerable identifiers** — certificate IDs use a `CRT-` prefix plus 18 random bytes encoded as base64url (144 bits of entropy). They are not sequential and cannot be derived from a user or course ID.
- **Server-side eligibility** — issuance requires a published course, an active enrollment, and completion of every lesson. Client input cannot waive these checks.
- **Idempotent issuance** — a unique partial index enforces one active certificate per learner and course. Concurrent requests resolve to the winner instead of creating duplicates.
- **Snapshot records** — recipient name and course title are captured at issuance so verification and PDFs remain stable if profile or course titles change later.
- **Minimal public disclosure** — public verification returns only certificate ID, status, recipient name, course title, issue date, and revocation date. It does not return email addresses, user IDs, enrollment IDs, or internal database identifiers.
- **Authorized downloads** — certificate PDFs require authentication and are limited to the certificate owner or an administrator. Revoked certificates are not served.
- **Revocation audit trail** — revocation stores the actor, reason, and timestamp, writes an audit log entry, and permits a new certificate to be issued after revocation. Revoked records are retained.
- **Certificate permission split** — `certificates:read` covers self-service issuance, listing, and download; `certificates:issue` covers administrative issuance and revocation. Students do not receive the administrative permission.

### Notifications, jobs, and analytics

- **Scoped notification reads** — every notification endpoint requires `notifications:read` and filters by the authenticated user. Marking a notification read cannot affect another user's record.
- **Preference enforcement** — in-app and email channels are checked per category before a notification is created or an email job is enqueued. Notification pages are capped at 100 items.
- **Idempotent background work** — deterministic job IDs prevent duplicate enqueues. Reminders and announcement fan-out derive keys from the source entity and recipient. Failed jobs retry with exponential backoff and dead-letter after the configured limit.
- **Lease recovery** — active jobs that outlive their lease are returned to the pending set, so a crashed worker cannot strand work silently. Handlers remain idempotent because a lease expiry can cause a second execution.
- **Observable email delivery** — notifications store delivery status, attempts, last error, and sent timestamp. Provider failures are logged and retried; recipient details are not logged.
- **Authorization for announcements** — only course instructors and administrators can publish or delete; learners can only list announcements for courses they can access.
- **Role-scoped analytics** — one endpoint returns admin, instructor, or student data based on server-side role resolution. Students can read only their own progress, grades, and enrolled-course deadlines. All aggregations have hard result limits.
- **No analytics write path** — the analytics module reads through domain service methods and never imports another module's model or repository.

### Phase 13 hardening

- **Boundary validation on every id-bearing route** — `validateIdParam()` rejects malformed identifiers with `422 VALIDATION_ERROR` before a controller reads them.
- **Endpoint-specific limits** — public verification, analytics, notification reads/writes, uploads, and mutating domain routes have tighter limits in addition to the global limiter.
- **Course access enforcement** — lesson completion, published lesson assets, assignment submissions, and quiz starts check active enrollment server-side; course owners and administrators remain exempt.
- **Expanded audit trail** — enrollment state changes, grading, announcements, certificates, and auth events write non-fatal audit records with actor, action, target, and result.
- **Test-backed authorization matrix** — 18 protected routes are asserted to return `401` without credentials, `403` without permission, `422` for malformed params, and `429` for public-endpoint abuse.

### Local infrastructure

- MongoDB 8.3 requires authentication; Redis 8.12 requires a password and runs with append-only persistence.
- Both services bind to **`127.0.0.1` only**, so they are not reachable from the local network by default.
- Compose credentials are development placeholders (`local-dev-only-change-me`) defined in `.env.example`. They must never be reused outside a developer machine.
- The API rejects those placeholders when `NODE_ENV=production`.
- Containers include health checks and named volumes.
- If host ports are changed for local conflicts, `MONGODB_URI` and `REDIS_URL` must be updated to match. The API fails closed rather than silently falling back.

### Engineering process

- Formatting, linting, strict typechecking, tests, and production builds run locally and in GitHub Actions.
- Commits are gated by lint-staged, Commitlint, and Husky hooks.
- Secrets, build output, coverage, and dependencies are excluded from version control.

---

## 4. Known gaps and limitations

These are intentional for Phase 13. Do not mistake the presence of a control above for end-to-end security.

| Gap                                                  | Impact                                                                                               | Planned phase      |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------ |
| No MFA                                               | Account takeover resistance is password-only                                                         | Post-Phase 3 spike |
| Rate limiter uses in-memory store                    | Per-process limits; reset on restart; not distributed                                                | 13                 |
| Redis has no application cache yet                   | Job state uses Redis, but no cache keys or invalidation policy exists                                | 13                 |
| No TLS for MongoDB or Redis                          | Local plaintext connections only                                                                     | 14                 |
| No TLS termination                                   | Local HTTP only                                                                                      | 14                 |
| No CSP for the SPA                                   | API Helmet CSP does not protect the static frontend                                                  | 14                 |
| No WAF, bot defense, or DDoS protection              | Hosting-layer concern                                                                                | 14                 |
| No malware scanning for uploads                      | Uploads are MIME/size validated and privately stored, but not antivirus scanned                      | Post-Phase 11      |
| Local file storage only                              | No object-storage provider, signed URLs, or replication                                              | 13 / 14            |
| Certificate eligibility does not enforce assessments | Completion is required; configurable quiz/assignment or attendance policy is not implemented         | Future policy work |
| No frontend certificate page or PDF preview          | Verification, listing, and PDF download exist as API endpoints only                                  | Frontend phase     |
| No scheduled automatic issuance                      | Certificates are issued idempotently on request; no event-driven issuance when the last lesson ends  | Future             |
| PDFs are not cryptographically signed                | Validity depends on the certificate ID lookup, not a digital signature                               | Future enhancement |
| No audit log read API or UI                          | Audit records are written but only inspectable directly in MongoDB                                   | 14                 |
| Workers run in the API process                       | HTTP and job scaling are coupled; no isolated worker deployment yet                                  | 14                 |
| No quiz deadline reminders                           | Quizzes have no scheduling fields, so only assignment reminders run                                  | Future model work  |
| No announcement email fan-out                        | Bulk announcement email is intentionally deferred until rate limiting and unsubscribe handling exist | Future             |
| No backoff jitter in the job runner                  | Synchronized retries can burst after a provider outage                                               | 14                 |
| No backups or restore drills                         | No production data exists                                                                            | 14 / 15            |
| No SBOM or provenance attestation                    | Supply-chain visibility is limited to the lockfile and audit                                         | 13 / 14            |
| Dev credentials in `.env.example`                    | Safe only because they are local placeholders and documented                                         | Ongoing            |
| Access logs include request URLs                     | Secrets must never be placed in query strings                                                        | Ongoing            |

Additional notes:

- **Public certificate verification is intentionally unauthenticated.** It relies on 144-bit random identifiers and the global rate limit. If abuse appears, add an endpoint-specific limiter and a CAPTCHA at the edge.
- **Rate limiting is not a security boundary.** It reduces abuse; it does not replace authentication, authorization, or input validation.
- **Readiness discloses dependency state.** The route returns per-dependency status and latency by design. If a deployment considers that sensitive, restrict it at the edge rather than removing the probe.
- **Validation helpers do not build Mongo filters.** Repositories must still map validated input onto indexed, parameterized queries and never interpolate raw user strings.
- **Search terms must be escaped.** `shared/query` requires `escapeRegExp()` before a term reaches a regex; skipping it reintroduces regex injection.
- **Helmet defaults apply to API JSON responses.** The SPA header policy must be configured at its host or reverse proxy in Phase 14.
- **Development tooling is not hardened.** The Vite dev server and `tsx watch` are for local use only.
- **The error contract is a floor, not a guarantee.** New endpoints must still avoid leaking sensitive domain information in messages.
- **Log redaction is path-based.** New sensitive fields must be added to the redaction configuration in `backend/src/config/logger.ts`.
- **`npm audit` is point-in-time.** Re-run it on every dependency change and in CI.
- The repository is **not yet public-facing production software**. It should be treated as a development foundation.

---

## 5. Threat model summary

### Assets

- User credentials, sessions, and refresh tokens (Phase 3+).
- Personal data: names, email addresses, enrollment and grading records (Phase 3+).
- Course content and protected learning assets (Phase 6+).
- Assessment integrity: quizzes, attempts, grades (Phase 9–10).
- Certificates and their public verification status (Phase 11).
- Administrative capability: role and permission changes (Phase 3–5).

### Actors

- Anonymous internet users.
- Authenticated students.
- Instructors with scoped course permissions.
- Administrators and super administrators.
- Automated abuse: credential stuffing, scraping, enumeration, upload abuse.

### Primary threats and planned mitigations

| Threat                                   | Mitigation direction                                                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Credential stuffing / brute force        | Argon2id, strict auth rate limits, progressive lockout, generic failure messages (Phase 3)                                                  |
| Session theft                            | Access token in memory, rotating refresh token in `HttpOnly`/`Secure`/`SameSite` cookie, hashed at rest, reuse detection (Phase 3)          |
| CSRF                                     | `SameSite` plus Origin/Referer validation on cookie-authenticated mutations (Phase 3)                                                       |
| Broken object-level authorization (IDOR) | Server-side permission middleware plus ownership checks in services; 401/403/404 matrix tests (Phase 3, 13)                                 |
| Privilege escalation                     | Permission codes, super-admin-only role assignment, audit logs, no role-string checks in business code (Phase 3–5)                          |
| Injection                                | Zod validation, Mongoose parameterization, allowlisted sorts, escaped search terms, no string-built queries, sanitized rich text (Phase 2+) |
| XSS                                      | React escaping by default, no `dangerouslySetInnerHTML` without sanitization, CSP at deployment (Phase 7, 14)                               |
| Malicious uploads                        | Content-type/signature validation, size limits, generated names, private storage, authorized delivery (Phase 6+)                            |
| Enumeration                              | Non-guessable certificate IDs, minimal verification fields, global rate limit (Implemented Phase 11)                                        |
| Assessment cheating                      | Server-authoritative timers, attempt limits, idempotent submission, no pre-submit answer exposure (Phase 10)                                |
| Data exfiltration via logs               | Redaction, no payload logging, PII minimization, retention policy (Phase 13)                                                                |
| Dependency compromise                    | Exact pins, lockfile review, audit, minimal dependency surface (Ongoing)                                                                    |

Detailed architecture and trust boundaries: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## 6. Authentication and authorization design (Phase 3)

Not implemented yet. The accepted design is recorded in [`docs/adr/0002-authentication-token-strategy.md`](docs/adr/0002-authentication-token-strategy.md).

Summary:

- Short-lived access JWT kept in memory; sent in the `Authorization` header.
- Opaque refresh token in an `HttpOnly`, `Secure` (production), `SameSite=Lax` cookie limited to the refresh path.
- Refresh tokens stored as SHA-256 hashes with session metadata; rotation on every use; reuse revokes the token family and writes an audit entry.
- Passwords hashed with Argon2id and tuned parameters.
- Email verification and password reset use single-use, hashed, expiring tokens.
- Four seeded roles (Super Admin, Admin, Instructor, Student) with granular permission codes.
- `requireAuth` and `requirePermission` middleware; ownership and scope checks in services.
- Login throttling and progressive lockout; audit logs for security-relevant events.
- CSRF defense for cookie-authenticated mutations.

Until this lands, **do not describe Atrium as having accounts, roles, or access control**.

---

## 7. Secure development requirements

Contributors and AI agents must:

- Validate every request boundary and re-derive authorization on the server.
- Never trust client-supplied roles, ownership, prices, timestamps, or status.
- Never log passwords, tokens, cookies, or unredacted PII.
- Never commit `.env`, credentials, keys, dumps, or tokens.
- Keep dependencies pinned and reviewed; run `npm audit` after changes.
- Add security-relevant decisions to an ADR or this document.
- Add regression tests for every security fix.
- Treat a failing quality gate as a stop signal, not an obstacle to bypass.

Full working rules: [`AGENTS.md`](AGENTS.md).

---

## 8. Local development guidance

- Copy `.env.example` files to `.env` and keep them untracked.
- Keep the development database and cache bound to localhost. The provided Compose file does so explicitly.
- Change default local credentials if your machine is shared or the services are reachable by others. Defaults exist for reproducibility, not security.
- Do not point development tooling at production data. There is no production environment yet.
- Do not use real personal data in seeds or tests. Use synthetic records.
- Clear browser cookies and revoke sessions if a token may have been exposed.
- If a secret is committed accidentally, rotate it first, then remove it from history. Deleting the file alone is insufficient.

---

## 9. Production readiness checklist (future)

This checklist must be complete before any public deployment:

- [ ] Authentication, authorization, and audit logging implemented and tested (Phases 3, 13).
- [ ] All endpoints validate input and enforce permissions; 401/403/404 matrix tests pass.
- [ ] HTTPS/TLS with HSTS at the edge; secure cookie flags verified.
- [ ] CSP, frame protection, and security headers configured for the SPA host.
- [ ] Distributed rate limiting and auth-specific throttles enabled.
- [ ] Secrets supplied by a secret manager, never baked into images.
- [ ] MongoDB and Redis not publicly exposed; least-privilege credentials; TLS where supported.
- [ ] Backups automated and restore-tested; retention defined.
- [ ] Centralized logs with redaction verified and retention defined.
- [ ] Dependency audit, image scan, and SBOM generated.
- [ ] Error responses verified to contain no internal details.
- [ ] File upload restrictions and private delivery verified.
- [ ] Monitoring, alerting, and an on-call owner defined.
- [ ] Incident response and secret-rotation runbooks written (Phase 15).
- [ ] Security review signed off with residual risks accepted in writing.

---

## 10. Incident response outline

1. **Contain** — revoke sessions/tokens, disable affected endpoints or accounts, isolate infrastructure.
2. **Preserve** — snapshot logs and relevant data before remediation; record timestamps and request IDs.
3. **Assess** — determine scope, affected users, data classes, and whether PII was exposed.
4. **Eradicate** — patch the defect, rotate all potentially exposed secrets, add a regression test.
5. **Notify** — follow applicable legal and contractual obligations if personal data was involved.
6. **Learn** — write a blameless postmortem with contributing factors and tracked follow-ups.

No production incident process exists yet because no production deployment exists.

---

## 11. Change log

| Date       | Change                                                                                        |
| ---------- | --------------------------------------------------------------------------------------------- |
| 2026-11-25 | Phase 13 security policy: access fixes, boundary validation, endpoint limits, audit coverage. |
| 2026-11-25 | Phase 12 security policy: notifications, preferences, jobs, analytics scope, new gaps.        |
| 2026-11-25 | Phase 9/10 remediation: administrative override wired into domain controllers and tested.     |
| 2026-11-25 | Phase 11 security policy: certificate issuance, verification, downloads, revocation, gaps.    |
| 2026-11-24 | Phase 2 security policy: data-layer controls, readiness, validation, revised gaps.            |
| 2026-11-24 | Phase 1 security policy: controls, gaps, threat model, checklist.                             |
