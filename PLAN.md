# Atrium LMS — Delivery Plan

This file is the executable roadmap. The original product brief is preserved verbatim in [`docs/PROJECT-SPEC.md`](docs/PROJECT-SPEC.md). Architecture decisions live in [`docs/adr/`](docs/adr/), contributor rules in [`AGENTS.md`](AGENTS.md), and the security policy in [`SECURITY.md`](SECURITY.md).

**Rule of the road:** work on one phase at a time. A phase is complete only when its acceptance criteria pass, documentation is updated, and the full quality gate is green.

## Status legend

- `[x]` Complete and verified
- `[ ]` Not started
- `[~]` In progress (must include an owner and remaining work)
- `[!]` Blocked (must include the blocker)

## Current position

| Field           | Value                                                                    |
| --------------- | ------------------------------------------------------------------------ |
| Current phase   | **Phase 1 — complete**                                                   |
| Next phase      | **Phase 2 — database and backend foundation**                            |
| Last verified   | 24 November 2026                                                         |
| Runtime         | Node.js 24.14.1, npm 11.12.1, Docker 29.8.1                              |
| Apps            | `frontend/` (`@atrium/frontend`), `backend/` (`@atrium/backend`)         |
| Source of truth | `PLAN.md` for work sequencing, `AGENTS.md` for rules, ADRs for decisions |

---

## Phase 1 — Project setup and architecture

**Goal:** establish a real, independently deployable two-app repository with strict tooling, security defaults, documentation, and a verified baseline.

**Status: COMPLETE — 24 November 2026**

### Repository and tooling

- [x] Initialize Git repository on `main`
- [x] Configure npm workspaces for `frontend` and `backend`
- [x] Pin verified package versions and commit the root lockfile
- [x] Add `.gitignore`, `.editorconfig`, `.nvmrc`, `.prettierrc`, `.prettierignore`
- [x] Add ESLint 10 flat configs with type-aware rules in both workspaces
- [x] Add Prettier with Tailwind class sorting
- [x] Add Husky, lint-staged, and Commitlint configuration
- [x] Add root scripts for dev, build, lint, typecheck, test, coverage, and formatting
- [x] Add GitHub Actions CI: format, lint, typecheck, test, build
- [x] Add Docker Compose definitions for MongoDB 8.3 and Redis 8.12 with auth and health checks
- [x] Provide root, backend, and frontend `.env.example` files with no secrets

### Frontend foundation

- [x] Scaffold React 19 + Vite 8 + TypeScript 5.9 application
- [x] Enable strict TypeScript with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `verbatimModuleSyntax`
- [x] Configure `@/` path alias and Vite dev proxy for `/api`
- [x] Set up Tailwind CSS 4 design tokens: color, typography, radius, shadow, dark-mode variables
- [x] Configure shadcn/ui (`components.json`) and add owned Button, Badge, and Card primitives
- [x] Add TanStack Query provider and query-client defaults
- [x] Add React Router 8 with public layout, status page, and 404 route
- [x] Build a responsive, accessible Phase 1 page that reports real status
- [x] Add Vitest + Testing Library + jsdom setup
- [x] Add component and route tests

### Backend foundation

- [x] Scaffold Express 5 ESM application with strict TypeScript
- [x] Validate all environment variables with Zod at startup
- [x] Add Pino structured logging with sensitive-field redaction
- [x] Add request-ID middleware with client ID propagation and validation
- [x] Add Helmet, explicit CORS allowlist, compression, JSON body limit, and global rate limiting
- [x] Add standardized success and error response envelopes
- [x] Add centralized error handling for operational, validation, JSON, payload, and unknown errors
- [x] Add `GET /health` and `GET /api/v1`
- [x] Add graceful shutdown with a forced-exit timeout
- [x] Add Vitest + Supertest integration tests
- [x] Verify error responses never leak stack traces

### Documentation

- [x] Write `README.md` with setup, commands, API contract, and status
- [x] Rewrite `PLAN.md` as an executable phase roadmap
- [x] Write `AGENTS.md` with architecture, naming, security, testing, and Git rules
- [x] Write `SECURITY.md` with reporting, controls, limitations, and deployment checklist
- [x] Write `docs/ARCHITECTURE.md` with diagrams and dependency rules
- [x] Record ADR-0001: modular monolith with layered feature modules
- [x] Record ADR-0002: authentication token and session strategy
- [x] Record ADR-0003: runtime and toolchain pinning
- [x] Preserve the original brief in `docs/PROJECT-SPEC.md`

### Phase 1 verification evidence

| Check                 | Command                    | Result                                                   |
| --------------------- | -------------------------- | -------------------------------------------------------- |
| Install               | `npm install`              | 524 packages, 0 vulnerabilities                          |
| Format                | `npm run format:check`     | Pass                                                     |
| Lint                  | `npm run lint`             | Pass, no warnings                                        |
| Typecheck             | `npm run typecheck`        | Pass, both workspaces                                    |
| Tests                 | `npm run test`             | 12 tests pass (9 backend, 3 frontend)                    |
| Build                 | `npm run build`            | Pass; frontend bundle 147 KB gzip, backend emits `dist/` |
| Compose configuration | `docker compose config`    | Pass                                                     |
| CI workflow           | `.github/workflows/ci.yml` | Defined; runs on push and pull request to `main`         |

### Phase 1 decisions and known constraints

- TypeScript is **5.9.3**, not 7.x. `typescript-eslint@8.74` supports TypeScript `<6.1`; using TS 7 would break the required lint gate. Revisit when the lint stack supports it.
- Node target is **24 LTS** for parity with the verified local toolchain. React Router 8 requires Node ≥ 22.22.
- `jsdom` is pinned to **29.1.1** because jsdom 30/31 require Node ≥ 24.15 and the current local runtime is 24.14.1. CI can move once the local baseline is upgraded.
- MongoDB and Redis run in Compose but are not connected to the API. Connection lifecycle, readiness checks, and schemas are Phase 2.
- The frontend production bundle is 147 KB gzip for the foundation page. Route-level splitting and dependency review are tracked for Phases 4 and 13.
- No deployed environment exists yet. CI cannot report a remote run until the first push.

---

## Phase 2 — Database and backend foundation

**Goal:** connect persistence and cache infrastructure, establish schema conventions, serve OpenAPI docs, and make readiness real.

**Depends on:** Phase 1.

### Tasks

- [ ] Add MongoDB connection module with pooling, retry policy, and lifecycle events
- [ ] Add Redis client with connection lifecycle and health state
- [ ] Extend environment validation for `MONGODB_URI`, `REDIS_URL`, and pool settings
- [ ] Wire database and cache readiness into `/health/ready` while keeping `/health` liveness-only
- [ ] Integrate graceful shutdown with MongoDB and Redis disconnects
- [ ] Define shared Mongoose plugin conventions: timestamps, JSON transforms, soft-delete policy
- [ ] Define `BaseRepository` only if it removes real duplication; otherwise document the repository contract
- [ ] Add Zod request-validation middleware with typed `req.validated` inputs
- [ ] Add pagination, sorting, and filtering helpers with strict limits
- [ ] Add OpenAPI generation; prefer Zod-first contracts over duplicated JSDoc schemas
- [ ] Serve interactive API docs in non-production or behind an explicit flag
- [ ] Add seed script scaffolding for roles and permissions (content lands in Phase 3)
- [ ] Add connection, middleware, and readiness tests
- [ ] Document database conventions and update this plan

**Packages (verify versions before installing):** `mongoose`, `redis`, an OpenAPI generator compatible with Zod 4, and Swagger UI middleware.

**Acceptance criteria**

- API starts only when required dependencies are reachable, or fails with a clear actionable error.
- `/health` remains dependency-free; `/health/ready` reports MongoDB and Redis accurately.
- `SIGTERM` closes HTTP, MongoDB, and Redis within the timeout.
- Validation middleware returns the documented `422 VALIDATION_ERROR` envelope.
- OpenAPI docs load and match implemented endpoints.
- No unbounded list query helper exists.

---

## Phase 3 — Authentication and RBAC

**Goal:** implement secure account lifecycle and deny-by-default, permission-based authorization.

**Depends on:** Phase 2.

### Tasks

- [ ] Models: `User`, `Role`, `Permission`, `RefreshToken` (or `Session`), `AuditLog`
- [ ] Seed roles: Super Admin, Admin, Instructor, Student; seed granular permission codes
- [ ] Registration with email verification token
- [ ] Login, logout, logout-all, refresh with rotation, and reuse detection
- [ ] Forgot/reset password with single-use, hashed, expiring tokens
- [ ] Change password and profile endpoints
- [ ] Argon2id password hashing with tuned memory/time parameters
- [ ] Access token issuing and verification; refresh token in HttpOnly, Secure, SameSite cookie
- [ ] Session metadata (user agent hash, IP hash, last used, expiry) and revocation
- [ ] Login throttling and progressive lockout
- [ ] `requireAuth` and `requirePermission` middleware
- [ ] Ownership and scope policies in services, not controllers
- [ ] CSRF defense: SameSite cookie plus Origin/Referer validation on cookie-authenticated mutations
- [ ] Audit logs for login, logout, password changes, role changes, and administrative actions
- [ ] Email abstraction: development logger transport, production SMTP provider
- [ ] Optional MFA design spike; implement only if it does not destabilize the phase
- [ ] Authentication and authorization test suite, including token reuse and 401/403 matrices
- [ ] Update OpenAPI, SECURITY.md, and AGENTS.md

**Packages (verify):** `jsonwebtoken`, `argon2`, `nodemailer`, and a TOTP library only if MFA is implemented.

**Acceptance criteria**

- Passwords are never returned, logged, or stored in plaintext.
- Refresh-token reuse revokes the token family and is audit-logged.
- Every protected endpoint uses permission middleware; no role-name string checks in business code.
- Suspended or unverified accounts cannot authenticate.
- Auth rate limits are stricter than global limits.
- Authorization tests prove 401 vs. 403 vs. 404 behavior.

---

## Phase 4 — Frontend foundation and design system

**Goal:** turn the verified shell into a complete application framework with authenticated layouts and reusable UI.

**Depends on:** Phases 1 and 3 (guards need the auth API).

### Tasks

- [ ] Complete design tokens for light/dark themes and verify WCAG contrast
- [ ] Add required shadcn/Radix primitives: input, label, form, dialog, dropdown, select, tabs, table, tooltip, skeleton, sheet, alert, progress, avatar, separator
- [ ] Add Sonner toasts, empty states, error states, and loading skeletons
- [ ] Add theme toggle with persisted preference and reduced-motion support
- [ ] Add public, auth, admin, instructor, and student layouts
- [ ] Add collapsible sidebar, mobile navigation, breadcrumbs, and user menu
- [ ] Add Axios instance with credentials, interceptors, normalized errors, and refresh handling
- [ ] Add React Hook Form + Zod resolver conventions
- [ ] Add TanStack Query key factory and mutation patterns
- [ ] Add Zustand only for genuinely client-only state (UI/session shell)
- [ ] Add route-level lazy loading and error boundaries
- [ ] Add auth pages: login, register, verify email, forgot password, reset password
- [ ] Add route guards driven by server-provided permissions, not hardcoded roles
- [ ] Add component, form-validation, and route-protection tests
- [ ] Add an accessibility checklist and keyboard-navigation tests

**Packages (verify):** React Hook Form, `@hookform/resolvers`, required Radix packages, Sonner, Motion, Axios, Zustand.

**Acceptance criteria**

- No page relies on frontend role checks for security decisions.
- All layouts are responsive and keyboard accessible.
- Forms validate on the client and surface server validation field-by-field.
- Dark mode and reduced motion work without layout or contrast regressions.
- Route guards fail closed while auth state is unresolved.
- No component file becomes a de facto page controller.

---

## Phase 5 — User management

**Depends on:** Phases 3 and 4.

- [ ] Admin user list with search, filters, sorting, and pagination
- [ ] User detail and edit flows
- [ ] Instructor application/approval workflow
- [ ] Student and instructor management views
- [ ] Suspend, reactivate, and soft-delete with audit logs
- [ ] Admin role assignment restricted to Super Admin
- [ ] Profile image upload through the storage abstraction (or defer to Phase 6 if storage lands there)
- [ ] Permission-gated UI with server enforcement
- [ ] API, service, and authorization tests
- [ ] OpenAPI and docs updates

**Acceptance:** Admins cannot escalate privileges beyond their own; destructive actions require confirmation and audit entries.

---

## Phase 6 — Course management

**Depends on:** Phases 4 and 5.

- [ ] Models: `Category`, `Course`, `Section`; indexes for catalog queries
- [ ] Category/subcategory CRUD with cycle prevention
- [ ] Course CRUD, tags, prerequisites, thumbnails, and banners
- [ ] Draft → submitted → published → archived state machine
- [ ] Approval workflow for admins
- [ ] Pricing and free-course rules
- [ ] Public catalog with search, filters, sorting, and pagination
- [ ] Course details page and instructor profile surfaces
- [ ] Instructor course dashboard
- [ ] Storage abstraction with local provider plus S3-compatible or Cloudinary provider
- [ ] File signature/MIME validation, size limits, unique names, authorization checks, and path-traversal protection
- [ ] Authorization tests for ownership and approval transitions
- [ ] Docs and OpenAPI updates

**Acceptance:** Instructors can only mutate their own courses; published courses require approval; catalog queries are indexed and paginated.

---

## Phase 7 — Lesson and video management

**Depends on:** Phase 6.

- [ ] Section and lesson ordering with transactional reorder operations
- [ ] Lesson types: video, text, PDF/resource
- [ ] Rich-text lesson editor using TipTap with sanitized output
- [ ] Upload pipeline for video and materials; no large binaries in MongoDB
- [ ] Protected asset access with short-lived signed URLs or authorized streaming
- [ ] Preview lessons and sequential unlocking rules
- [ ] Lesson completion tracking and progress recalculation
- [ ] Curriculum builder UI with validation and drag/reorder affordances
- [ ] Course player layout with responsive video, attachments, and navigation
- [ ] Authorization and file-access tests
- [ ] Docs and OpenAPI updates

**Acceptance:** Unauthorized users cannot fetch protected files even with a direct URL; lesson order is consistent under concurrent edits.

---

## Phase 8 — Enrollment and learning progress

**Depends on:** Phases 6 and 7.

- [ ] `Enrollment` model with unique compound index on user + course
- [ ] Free enrollment and paid enrollment state transitions
- [ ] Enrollment expiry and access checks in one policy service
- [ ] Duplicate-enrollment prevention under concurrency
- [ ] My Learning dashboard and progress views
- [ ] Progress aggregation with efficient indexes
- [ ] Enrollment revocation/refund administrative flow
- [ ] Transactional flows for payment-linked enrollment (payment provider selection decided here)
- [ ] Student and admin enrollment views
- [ ] Tests for duplicate races, expiry, and access control
- [ ] Docs and OpenAPI updates

**Acceptance:** One active enrollment per user/course; expired enrollments lose content access but retain history; progress survives recalculation.

---

## Phase 9 — Assignment management

**Depends on:** Phase 8 and the storage abstraction.

- [ ] `Assignment` and `Submission` models with deadline/index strategy
- [ ] Instructor assignment CRUD and publishing
- [ ] Student submission uploads with version history
- [ ] Late-submission policy and deadline enforcement
- [ ] Instructor grading, marks, feedback, and return-for-revision
- [ ] Student assignment dashboard and submission history
- [ ] Notification hooks for deadlines and grades
- [ ] File validation, quotas, and private storage
- [ ] Authorization tests across instructor, student, and admin
- [ ] Docs and OpenAPI updates

**Acceptance:** Students cannot read other students' submissions; only course instructors/admins can grade; deadlines are enforced server-side.

---

## Phase 10 — Quiz and examination system

**Depends on:** Phase 8.

- [ ] Question bank and question models: multiple choice, true/false, short answer
- [ ] Quiz/exam models with random selection rules
- [ ] Timed attempts with server-authoritative expiry
- [ ] Answer autosave and safe resume behavior
- [ ] Automatic grading for objective questions; manual grading queue for short answers
- [ ] Attempt history and result views
- [ ] Result analytics for students and instructors
- [ ] Anti-abuse controls: attempt limits, rate limits, idempotent submission
- [ ] Grading and timer tests, including clock-skew cases
- [ ] Docs and OpenAPI updates

**Acceptance:** Clients cannot extend time or resubmit graded attempts; correct answers are never exposed before submission; grading is deterministic.

---

## Phase 11 — Certificate system

**Depends on:** Phases 8 and 10.

- [ ] `Certificate` model with unique, non-guessable certificate ID
- [ ] Eligibility rules: completion, assessments, attendance/policy as configured
- [ ] Automatic issuance with idempotency
- [ ] Public verification page with minimal PII disclosure
- [ ] PDF generation and download with authorization
- [ ] Revocation and reissue workflow with audit trail
- [ ] Certificate list in student dashboard
- [ ] Tests for duplicate issuance, verification, and revocation
- [ ] Docs and OpenAPI updates

**Acceptance:** Certificate IDs cannot be enumerated; verification reveals only necessary data; issuance is idempotent.

---

## Phase 12 — Notifications and analytics

**Depends on:** Phases 3–11.

- [ ] `Notification` model with read/unread indexes
- [ ] In-app notification center and real-time or polling strategy
- [ ] Email provider integration with retries and delivery status
- [ ] Course announcements
- [ ] Assignment deadline and exam reminders via background jobs
- [ ] Notification preferences
- [ ] Admin analytics: users, active students, instructors, courses, enrollments, revenue, completion rates
- [ ] Instructor analytics: course performance, student progress, grading load
- [ ] Student analytics: progress, grades, upcoming work
- [ ] Recharts dashboards with accessible summaries
- [ ] Aggregation pipelines with indexes and result limits
- [ ] Job and analytics tests
- [ ] Docs and OpenAPI updates

**Acceptance:** Jobs are idempotent and retryable; notifications respect preferences; analytics queries are bounded and indexed.

---

## Phase 13 — Security audit and optimization

**Depends on:** All feature phases.

- [ ] Threat-model review against OWASP ASVS/Top 10 and broken object-level authorization
- [ ] Verify every route has validation, authentication, permission, and rate-limit coverage
- [ ] Test IDOR/BOLA across courses, lessons, submissions, exams, certificates, and files
- [ ] Review token/session lifecycle, cookie flags, CSRF, and XSS surfaces
- [ ] Dependency audit and upgrade review
- [ ] Log redaction and audit-log completeness review
- [ ] MongoDB index and slow-query review
- [ ] Frontend bundle analysis, route splitting, image optimization, and caching review
- [ ] Redis cache review: only justified caches, explicit invalidation
- [ ] Security headers and CSP review for the production frontend
- [ ] Penetration-style test additions and regression tests
- [ ] Update `SECURITY.md` with final controls and residual risks

**Acceptance:** No high/critical findings without a documented, accepted mitigation; authorization matrix is test-backed; performance budgets are recorded.

---

## Phase 14 — Testing and Docker deployment

**Depends on:** Phase 13.

- [ ] Raise meaningful coverage with priorities on auth, authorization, enrollment, grading, and certificates
- [ ] Add Playwright E2E: registration, login, course creation, enrollment, lesson completion, assignment submission, exam attempt, certificate generation
- [ ] Multi-stage Dockerfiles for frontend and backend, non-root users, health checks
- [ ] Production Compose with MongoDB, Redis, API, web, and reverse proxy
- [ ] Environment-specific configuration examples with no secrets
- [ ] Migration/index verification and seed procedure for production
- [ ] Health checks, readiness, graceful shutdown, and log aggregation validation
- [ ] Deployment runbook and rollback procedure
- [ ] CI artifacts for coverage and E2E reports

**Acceptance:** Clean-machine deployment succeeds from documented steps; containers run as non-root; E2E suite passes against the Compose stack.

---

## Phase 15 — Production documentation

**Depends on:** Phase 14.

- [ ] Finalize README with deployment topology and operational commands
- [ ] API reference export and versioning policy
- [ ] Operations runbook: backups, restores, Redis eviction, MongoDB indexes, certificate jobs
- [ ] Incident response and secret rotation guides
- [ ] Onboarding guide for maintainers
- [ ] Architecture and ADR index reconciliation
- [ ] Final security and accessibility sign-off
- [ ] Release notes and handoff checklist

**Acceptance:** A new maintainer can run, deploy, and troubleshoot the system using repository documentation only.

---

## Cross-cutting gates

Every phase must satisfy these before it is marked complete:

### Security

- Deny by default; authenticate then authorize every protected endpoint.
- Validate all input at the boundary; never trust client-supplied roles, ownership, prices, or timestamps.
- No secrets in source, logs, client bundles, or error messages.
- Rate-limit sensitive endpoints; audit sensitive operations.
- Files are private by default, verified, size-limited, and authorization-checked.

### Quality

- `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` pass.
- New behavior has tests at the appropriate level.
- No `any` escapes without a written reason.
- No placeholder APIs, fake data paths, or unimplemented buttons that look functional.

### Accessibility and UX

- Keyboard navigation works for every interactive flow.
- Color contrast is WCAG AA aware.
- Reduced motion is respected.
- Loading, empty, and error states exist for asynchronous views.
- Forms expose labels, descriptions, and field-level errors.

### Documentation

- `PLAN.md` checkboxes reflect reality.
- Public contracts are in OpenAPI and README when implemented.
- Decisions that affect future work become ADRs.
- Breaking changes are called out explicitly.

---

## Dependency introduction schedule

Do not install a package before the phase that uses it. Verify the current stable version and compatibility at installation time, then pin it exactly.

| Phase | Candidate packages                                                                                                                                            |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | React, React Router, Vite, Tailwind, TanStack Query, Zod, Radix Slot, Lucide, CVA, clsx, tailwind-merge, Express, Helmet, CORS, compression, Pino, rate limit |
| 2     | Mongoose, Redis client, OpenAPI generator, Swagger UI                                                                                                         |
| 3     | jsonwebtoken, argon2, nodemailer, optional TOTP library                                                                                                       |
| 4     | React Hook Form, @hookform/resolvers, Axios, Zustand, Motion, Radix primitives, Sonner                                                                        |
| 6     | Multipart parsing, image processing, S3/Cloudinary SDK, slug utilities                                                                                        |
| 7     | TipTap packages                                                                                                                                               |
| 10    | Deterministic shuffle/ID utilities if not covered by platform APIs                                                                                            |
| 12    | Recharts, BullMQ or equivalent Redis-backed job runner                                                                                                        |
| 14    | Playwright and coverage reporters not already installed                                                                                                       |

Any addition must update this table, the lockfile, and (for architectural choices) an ADR.

---

## Open decisions

Tracked for resolution in the phase that needs them:

1. **OpenAPI generation** — Zod-first generator vs. JSDoc annotations. Decide in Phase 2; avoid duplicated schemas.
2. **Email provider** — SMTP provider for production and a local sink for development. Decide in Phase 3.
3. **Storage provider** — S3-compatible vs. Cloudinary as the production default. Decide in Phase 6; keep the interface provider-agnostic.
4. **Payments** — provider and regional requirements. Decide in Phase 8; no fake payment states.
5. **Background jobs** — BullMQ vs. alternative. Decide in Phase 12; must support retries and idempotency.
6. **TypeScript 7 upgrade** — blocked on `typescript-eslint` support. Revisit each quarter.
7. **Node 26 LTS** — available, but local parity is Node 24. Revisit with Docker base image and CI in Phase 14.

---

## Change log

| Date       | Change                                                                 |
| ---------- | ---------------------------------------------------------------------- |
| 2026-11-24 | Phase 1 complete: workspace, frontend shell, API foundation, CI, docs. |
| 2026-11-24 | Initialized execution plan from the preserved product brief.           |
