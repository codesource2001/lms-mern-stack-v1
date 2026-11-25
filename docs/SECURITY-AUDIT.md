# Phase 13 — Security audit and optimization

| Field      | Value                                                                                                                      |
| ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| Status     | Complete — 25 November 2026                                                                                                |
| Scope      | Backend routes and services, frontend bundle, configuration, dependencies                                                  |
| Method     | Static review, automated tests, dependency audit, bundle measurement                                                       |
| Acceptance | No high/critical findings without documented mitigation; authorization matrix is test-backed; performance budgets recorded |

This report records what was actually reviewed and changed in Phase 13. It is not a penetration test or a certification.

---

## 1. Route and middleware coverage

There are **84 route declarations** across 12 route modules. Every protected route runs `requireAuth` and `requirePermission` before its controller; public routes are explicitly listed below.

| Surface                                                                        | Authentication                | Permission                           | Validation                         | Rate limiting                                                         |
| ------------------------------------------------------------------------------ | ----------------------------- | ------------------------------------ | ---------------------------------- | --------------------------------------------------------------------- |
| Auth login, register, reset, verify, refresh, logout                           | Mixed                         | Mixed                                | Zod body schemas                   | Endpoint-specific auth limiters + trusted origin for cookie mutations |
| Users (list, detail, update, suspend, reactivate, delete, instructor approval) | Required                      | Required                             | List query, update body, id params | Global + `mutatingLimiter` on writes                                  |
| Categories and courses, including sections and thumbnail upload                | Required for writes           | Required                             | Body, list query, id params        | Global + `mutatingLimiter`; `uploadLimiter` for uploads               |
| Lessons (update, delete, complete, asset)                                      | Required                      | Write routes require `LESSONS_WRITE` | Body and id params                 | Global + `mutatingLimiter` on writes                                  |
| Enrollments and progress                                                       | Required                      | Required                             | Enroll body, id params             | Global + `mutatingLimiter` on writes                                  |
| Assignments and submissions                                                    | Required                      | Required                             | Body and id params                 | Global + `uploadLimiter` for submission uploads                       |
| Quizzes, attempts, and manual grading                                          | Required                      | Required                             | Body and id params                 | Global + `mutatingLimiter` on writes                                  |
| Certificates                                                                   | Required except public verify | Required except verify               | Body and id params                 | Global + `publicReadLimiter` for verify, `analyticsLimiter` for PDF   |
| Notifications and preferences                                                  | Required                      | `NOTIFICATIONS_READ`                 | Query, body, id params             | Global + read/write-specific limiters                                 |
| Announcements                                                                  | Required                      | `COURSES_WRITE` / `COURSES_READ`     | Body, query, id params             | Global + `mutatingLimiter` on writes                                  |
| Analytics                                                                      | Required                      | `ANALYTICS_READ`                     | No user input                      | Global + `analyticsLimiter`                                           |
| Health, API root, Swagger UI, certificate verification                         | Public by design              | —                                    | Params where present               | Global + public read limiter where applicable                         |

**Intentionally public:** liveness, readiness, API metadata, non-production Swagger UI, and certificate verification. Public verification exposes no email address or internal identifier.

**Changes made in Phase 13**

- Added `validateIdParam()` at every route boundary that previously passed `req.params.*` directly to a controller. Malformed identifiers now return `422 VALIDATION_ERROR`.
- Added `endpointRateLimit()` with four presets: `publicReadLimiter` (60 / 15 min), `analyticsLimiter` (60 / min), `mutatingLimiter` (40 / min), and `uploadLimiter` (20 / min).
- Applied the trusted-origin CSRF guard to all cookie-authenticated auth mutations that already used it; retained JSON content-type and `SameSite=Lax` as additional login-CSRF mitigations (see residual risks).

---

## 2. Authorization and BOLA review

New service-level checks close three object-level gaps:

| Resource              | Prior behavior                                                     | Current behavior                                                                     |
| --------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Lesson completion     | Any authenticated learner could mark any lesson complete           | Requires course access through `enrollmentService.hasAccess()`                       |
| Lesson assets         | Published-course assets were readable by any authenticated user    | Published course assets now require enrollment; instructors and admins remain exempt |
| Assignment submission | Published assignments accepted submissions from non-enrolled users | Requires active course access                                                        |
| Quiz attempts         | Published quizzes accepted starts from non-enrolled users          | Requires active course access                                                        |

Existing ownership controls were confirmed and covered by tests: notification reads, certificate PDFs, quiz attempt access, assignment grading, announcement listing, and course/lesson instructor checks. Administrative override is derived from server-side roles, never from client input.

`backend/tests/authorization-matrix.test.ts` exercises 18 protected routes without credentials and asserts `401 AUTH_REQUIRED`, plus `403 FORBIDDEN` for a principal without the route permission, `422` for malformed parameters, and `429 RATE_LIMITED` for public verification abuse. `lesson-service`, `quiz-service`, and `assignment-service` tests cover the new ownership denials.

---

## 3. OWASP Top 10 (2021) mapping

| Category                             | Status                | Evidence / mitigation                                                                                                                               |
| ------------------------------------ | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| A01 Broken Access Control            | **Mitigated**         | Permission middleware, service ownership checks, admin override from roles, 401/403/404 and BOLA tests                                              |
| A02 Cryptographic Failures           | **Mitigated**         | Argon2id passwords, SHA-256 token hashes, JWT in memory, opaque refresh cookies, no secrets in client                                               |
| A03 Injection                        | **Mitigated**         | Zod at the boundary, Mongoose parameterized queries, escaped regex terms, sanitized rich text                                                       |
| A04 Insecure Design                  | **Accepted residual** | Rate limiters are per-process; background worker runs in the API process until Phase 14                                                             |
| A05 Security Misconfiguration        | **Accepted residual** | SPA CSP is deployment-phase work; development defaults are documented and rejected in production                                                    |
| A06 Vulnerable Components            | **Mitigated**         | Exact pins, lockfile, `npm audit` reports 0 vulnerabilities across all dependency classes                                                           |
| A07 Identification and Auth Failures | **Mitigated**         | Lockout, rotation with reuse detection, verification, session revocation, cookies                                                                   |
| A08 Software and Data Integrity      | **Partial**           | Lockfile and signed git commits are not enforced; SBOM is Phase 14/15 work                                                                          |
| A09 Logging and Monitoring Failures  | **Partial**           | Structured logs with request IDs and redaction; audit writes for auth, grades, enrollment state, announcements, and certificates; no audit read API |
| A10 SSRF                             | **Not applicable**    | No server-side URL fetching from user input                                                                                                         |

---

## 4. Token, cookie, CSRF, and XSS review

- Access tokens are verified against MongoDB on every request and exist only in browser memory; there is no `localStorage` token path.
- Refresh cookies are `HttpOnly`, `SameSite=Lax`, `Secure` in production, scoped to refresh routes, rotated on use, and hashed at rest. Reuse revokes the family.
- `requireTrustedOrigin` rejects missing or untrusted Origin/Referer on refresh and logout; JSON-only body parsing and `SameSite=Lax` reduce login-CSRF exposure.
- Helmet protects API responses. Rich text is sanitized on the server; notification and announcement content is rendered as text in the SPA, not injected as HTML.
- Chart labels and all dynamic values are rendered as React text nodes; no `dangerouslySetInnerHTML` exists in application code.

---

## 5. Dependency, logging, and audit review

- `npm audit` (all dependencies) and `npm audit --omit=dev`: **0 vulnerabilities**.
- `npm outdated` reports only patch/minor drift (`mongoose 9.13.1`, `vitest 5.1.2`, `@types/*`) and TypeScript 7, which remains blocked by `typescript-eslint` per ADR-0003. No forced upgrades this phase.
- Pino redaction covers authorization headers, cookies, passwords, token material, and password hashes. Job logs contain identifiers and outcomes only; email recipients and message bodies are not logged outside the development preview transport.
- Audit records now cover: login/logout/password change/role changes, certificate issuance/revocation, enrollment revoke/activate, assignment grading, quiz manual grading, and announcement publish/delete. Audit writes are non-fatal and logged if persistence fails.

---

## 6. Persistence and performance review

- All notification and analytics indexes were checked against their query shapes and documented in [`DATABASE.md`](DATABASE.md).
- Aggregations have hard limits: top courses 100, enrollment trend 12 months, upcoming work 20, announcement pages 50, notification pages 100.
- Analytics reads go through domain service methods; the analytics module does not import other modules' models or repositories.
- Redis holds only operational job state. There is no application cache, so no invalidation policy is needed yet.
- The job runner has no jitter; synchronized retries after a provider outage are a documented residual risk.

**Recorded performance budgets**

| Budget                          | Limit  | Measured (Phase 13 build) |
| ------------------------------- | ------ | ------------------------- |
| Initial JS (gzip)               | 150 kB | 126.26 kB                 |
| Initial CSS (gzip)              | 15 kB  | 8.66 kB                   |
| Largest lazy route chunk (gzip) | 150 kB | 124.81 kB (dashboard)     |

The dashboard and notification center are lazy routes, so Recharts is not part of the initial bundle. Images are locally hosted variable fonts with `woff2` subsets; no raster images are used.

---

## 7. Findings and residual risks

| Severity | Finding                                                                                        | Resolution                                                                                                                                                                  |
| -------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High     | Missing course-access checks on lesson completion, lesson assets, submissions, and quiz starts | **Fixed** with service-level access checks and regression tests                                                                                                             |
| Medium   | Route parameters reached controllers without boundary validation                               | **Fixed** with `validateIdParam()` across domain routes                                                                                                                     |
| Medium   | Sensitive public and expensive endpoints relied only on the global limiter                     | **Fixed** with endpoint-specific limiters                                                                                                                                   |
| Medium   | Grading, enrollment state changes, and announcements lacked audit entries                      | **Fixed** with non-fatal audit writes                                                                                                                                       |
| Low      | Login CSRF is not guarded by Origin validation                                                 | **Accepted:** JSON content type prevents simple cross-site form posts, `SameSite=Lax` blocks cross-site cookies, and login does not authorize a cookie-authenticated action |
| Low      | Rate limiting is per-process and not distributed                                               | **Accepted** until Phase 14 adds a shared store                                                                                                                             |
| Low      | Workers run in the API process; no retry jitter                                                | **Accepted** until Phase 14/13 follow-up                                                                                                                                    |
| Low      | No SPA CSP or security headers at the static host                                              | **Accepted**; deployment-phase responsibility                                                                                                                               |
| Low      | No audit log read API or SBOM                                                                  | **Accepted**; Phase 13+ follow-up, documented in `SECURITY.md`                                                                                                              |
| Info     | Certificate PDFs are unsigned                                                                  | **Accepted**; verification relies on the random certificate ID                                                                                                              |

No high or critical finding remains without a mitigation recorded above.

---

## 8. Commands used for evidence

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
docker compose config --quiet
npm audit
npm audit --omit=dev
npm outdated --workspace @atrium/backend
```
