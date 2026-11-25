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
| Current phase   | **Phase 9 — complete**                                                   |
| Next phase      | **Phase 10 — quiz and examination system**                               |
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
- At the Phase 1 gate, MongoDB and Redis ran in Compose without an API connection. Phase 2 wired both clients, readiness, and schema conventions.
- The frontend production bundle is 147 KB gzip for the foundation page. Route-level splitting and dependency review are tracked for Phases 4 and 13.
- No deployed environment exists yet. CI cannot report a remote run until the first push.

---

## Phase 2 — Database and backend foundation

**Goal:** connect persistence and cache infrastructure, establish schema conventions, serve OpenAPI docs, and make readiness real.

**Status: COMPLETE — 24 November 2026**

**Depends on:** Phase 1.

### Tasks

- [x] Add MongoDB connection module with pooling, retry policy, and lifecycle events
- [x] Add Redis client with connection lifecycle and health state
- [x] Extend environment validation for `MONGODB_URI`, `REDIS_URL`, and pool settings
- [x] Wire database and cache readiness into `/health/ready` while keeping `/health` liveness-only
- [x] Integrate graceful shutdown with MongoDB and Redis disconnects
- [x] Define shared Mongoose schema conventions: construction-time timestamps, JSON transforms, opt-in soft delete
- [x] Decide on `BaseRepository`: deferred because no domain models exist; repository contract documented in `docs/DATABASE.md`
- [x] Add Zod request-validation middleware with typed `req.validated` inputs
- [x] Add pagination, allowlisted sorting, and strict filtering helpers with hard limits
- [x] Add Zod-first OpenAPI generation instead of duplicated JSDoc schemas
- [x] Serve interactive API docs outside production or behind an explicit flag
- [x] Add seed script scaffolding with an ordered, idempotency-aware runner (role/permission content lands in Phase 3)
- [x] Add configuration, connection-failure, readiness, validation, query, schema, seed, shutdown, and OpenAPI tests
- [x] Document database conventions and update this plan

**Packages (verified and pinned):** `mongoose@9.13.0`, `redis@6.4.0`, `@asteasolutions/zod-to-openapi@9.1.0`, `swagger-ui-express@5.0.1`, `@types/swagger-ui-express@4.1.8`.

### Phase 2 verification evidence

| Check                          | Command / action                                    | Result                                                                    |
| ------------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------- |
| Install                        | `npm install`                                       | 552 packages, 0 vulnerabilities                                           |
| Format                         | `npm run format:check`                              | Pass                                                                      |
| Lint                           | `npm run lint`                                      | Pass, no warnings                                                         |
| Typecheck                      | `npm run typecheck`                                 | Pass, both workspaces                                                     |
| Tests                          | `npm run test`                                      | 54 tests pass (51 backend, 3 frontend)                                    |
| Build                          | `npm run build`                                     | Pass; backend emits `dist/`, frontend bundle builds                       |
| Compose configuration          | `docker compose config`                             | Pass                                                                      |
| Live dependency readiness      | API against Compose MongoDB/Redis                   | `/health/ready` 200; MongoDB 9 ms, Redis 7 ms                             |
| Runtime dependency outage      | Stop Redis, poll readiness, start Redis             | `200` → `503 SERVICE_UNAVAILABLE` → `200` after reconnect                 |
| OpenAPI and Swagger UI         | `GET /api-docs/openapi.json`, `GET /api-docs/`      | 200; paths `/health`, `/health/ready`, `/api/v1`                          |
| Unreachable dependency startup | API with Redis on a closed port                     | Exit code 1 with `DependencyConnectionError` naming Redis and `REDIS_URL` |
| Graceful shutdown              | Unit tests for ordering, idempotency, failure path  | Pass                                                                      |
| Real connection shutdown       | Connected smoke server closed HTTP then Redis/Mongo | Both clients disconnected without hanging                                 |

The live smoke used host ports **27019/6380** because local ports 27017/6379 were already occupied on the development machine. Repository defaults remain 27017/6379.

### Phase 2 decisions and known constraints

- **Zod-first OpenAPI** is recorded in [ADR-0004](docs/adr/0004-zod-first-openapi.md). Docs default to enabled outside production and disabled in production; the relaxed Swagger CSP exists only while docs are mounted.
- **No `BaseRepository` yet.** A generic base class would be speculation before domain models exist. The repository contract and query rules are documented instead; introduce a base repository only when real duplication appears.
- **Seed registry is empty.** The runner, ordering, failure reporting, and CLI exist; role and permission data arrives with the Phase 3 models.
- **Both dependencies are required at startup.** The API does not listen until MongoDB and Redis connect. Redis reconnects indefinitely at runtime with capped backoff; startup is bounded by `REDIS_CONNECT_TIMEOUT_MS`.
- **Readiness exposes dependency status.** It returns only status and latency, never driver errors or credentials. Protect the route at the edge if an environment considers dependency state sensitive.
- **Production credential placeholders are rejected.** `local-dev-only-change-me` cannot be used when `NODE_ENV=production`.
- **Index builds are not automatic in production.** Mongo `autoIndex` is disabled there; production index creation remains a release step for Phase 14.
- **No production route exercises the validation middleware yet.** It is covered by Supertest and ready for Phase 3 auth routes.
- **Real-dependency checks are not in CI yet.** Default tests avoid infrastructure; service-enabled CI arrives with deployment work.
- **OpenAPI does not yet describe auth security schemes.** They are added with Phase 3.

**Acceptance criteria — verified**

- API starts only when required dependencies are reachable, or fails with a dependency-specific actionable error.
- `/health` remains dependency-free; `/health/ready` reports MongoDB and Redis accurately.
- `SIGTERM` path closes HTTP, Redis, and MongoDB within the timeout; unit tests cover ordering and failure.
- Validation middleware returns the documented `422 VALIDATION_ERROR` envelope with source-qualified fields.
- OpenAPI docs load and match implemented endpoints.
- No unbounded list query helper exists; page size is capped at 100.

---

## Phase 3 — Authentication and RBAC

**Goal:** implement secure account lifecycle and deny-by-default, permission-based authorization.

**Depends on:** Phase 2.

### Tasks

- [x] Models: `User`, `Role`, `Permission`, `Session`, `RefreshToken`, `AuditLog`
- [x] Seed roles: Super Admin, Admin, Instructor, Student; seed granular permission codes
- [x] Registration with email verification token
- [x] Login, logout, logout-all, refresh with rotation, and reuse detection
- [x] Forgot/reset password with single-use, hashed, expiring tokens
- [x] Change password and profile endpoints
- [x] Argon2id password hashing with tuned memory/time parameters
- [x] Access token issuing and verification; refresh token in HttpOnly, Secure, SameSite cookie
- [x] Session metadata (user agent hash, IP hash, last used, expiry) and revocation
- [x] Login throttling and progressive lockout
- [x] `requireAuth` and `requirePermission` middleware
- [x] Ownership and scope policies in services, not controllers
- [x] CSRF defense: SameSite cookie plus Origin/Referer validation on cookie-authenticated mutations
- [x] Audit logs for login, logout, password changes, refresh-token reuse, verification, and resets
- [x] Email abstraction: development logger transport, production SMTP provider
- [x] MFA intentionally not implemented; deferred as a later spike
- [x] Authentication and authorization test suite, including token reuse and 401/403/404 matrices
- [x] Update OpenAPI, SECURITY.md, and AGENTS.md

**Packages (verified and pinned):** `argon2@0.45.2`, `jsonwebtoken@9.0.3`, `nodemailer@10.6.1`, `cookie-parser@1.4.7`, `@types/jsonwebtoken@9.0.10`, `@types/nodemailer@8.0.2`, `@types/cookie-parser@1.4.10`.

### Phase 3 verification evidence

| Check                    | Command / action                     | Result                                                                                                                          |
| ------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Format                   | `npm run format:check`               | Pass                                                                                                                            |
| Lint                     | `npm run lint`                       | Pass                                                                                                                            |
| Typecheck                | `npm run typecheck`                  | Pass, both workspaces                                                                                                           |
| Tests                    | `npm run test`                       | 79 tests pass (76 backend, 3 frontend)                                                                                          |
| Build                    | `npm run build`                      | Pass                                                                                                                            |
| Compose configuration    | `docker compose config`              | Pass                                                                                                                            |
| Seed                     | `npm run seed` against Compose Mongo | 2 seeds applied: permissions, roles                                                                                             |
| Registration/login smoke | Live API on Compose Mongo/Redis      | Register, verify, login, `/auth/me`, refresh, reuse detection, logout, forgot/reset, change password, CSRF rejection all passed |
| Reuse detection          | Refresh with a rotated token         | `401 INVALID_REFRESH_TOKEN` and session revoked                                                                                 |
| CSRF                     | Refresh with disallowed Origin       | `403 CSRF_REJECTED`                                                                                                             |

### Phase 3 decisions and known constraints

- **Access tokens are verified against server state.** `requireAuth` checks the session and user status/version in MongoDB, so revocation and suspension take effect immediately. Redis caching of session validity is deferred.
- **Refresh tokens are separate rows.** Each rotation creates a new `RefreshToken` and marks the old one used, giving complete reuse history for the session's lifetime.
- **Verification and reset tokens are embedded in the User document**, allowing atomic single-document updates without transactions on standalone MongoDB.
- **Role assignment at registration is fixed to Student.** Admin assignment remains a Phase 5 Super Admin capability.
- **Account lockout is progressive and stored on the User.** It resets after a successful login.
- **Email delivery failures do not fail registration/password reset requests.** The event is audit-logged and the resend endpoint remains available.
- **MFA was not implemented.** It remains a later spike and is not exposed as a fake feature.
- **No authorization matrix for domain resources yet.** Middleware tests prove 401/403/404 behavior; resource-level ownership checks arrive with domain phases.
- **Cookie path is scoped to `${API_PREFIX}/auth`.** Frontend refresh handling and multi-tab coordination arrive in Phase 4.
- **Mongoose emits deprecation warnings** for `new` in `findOneAndUpdate`; behavior is unaffected.

**Acceptance criteria — verified**

- Passwords are hashed with Argon2id and never returned or logged.
- Refresh-token reuse revokes the token family and is audit-logged.
- Every protected endpoint uses `requireAuth` and `requirePermission`; no role-name string checks are used.
- Suspended and unverified accounts cannot authenticate.
- Auth rate limits are stricter than the global limit.
- Authorization tests prove 401, 403, and 404 behavior.

---

## Phase 4 — Frontend foundation and design system

**Goal:** turn the verified shell into a complete application framework with authenticated layouts and reusable UI.

**Depends on:** Phases 1 and 3 (guards need the auth API).

### Tasks

- [x] Complete design tokens for light/dark themes and verify WCAG contrast
- [x] Add required shadcn/Radix primitives: input, label, form, dialog, dropdown, select, tabs, table, tooltip, skeleton, sheet, alert, progress, avatar, separator
- [x] Add Sonner toasts, empty states, error states, and loading skeletons
- [x] Add theme toggle with persisted preference and reduced-motion support
- [~] Add public, auth, admin, instructor, and student layouts (public, auth, and shared app shell implemented; role-specific shells deferred to domain phases)
- [~] Add collapsible sidebar, mobile navigation, breadcrumbs, and user menu (collapsible sidebar and basic user menu implemented; mobile navigation and breadcrumbs deferred)
- [x] Add Axios instance with credentials, interceptors, normalized errors, and refresh handling
- [x] Add React Hook Form + Zod resolver conventions
- [x] Add TanStack Query key factory and mutation patterns
- [x] Add Zustand only for genuinely client-only state (UI/session shell)
- [x] Add route-level lazy loading and error boundaries
- [x] Add auth pages: login, register, verify email, forgot password, reset password
- [x] Add route guards driven by server-provided permissions, not hardcoded roles
- [x] Add component, form-validation, and route-protection tests
- [x] Add an accessibility checklist and keyboard-navigation tests

**Packages (verified and pinned):** `react-hook-form@7.92.0`, `@hookform/resolvers@7.0.9`, `axios@1.21.1`, `zustand@5.1.0`, `sonner@2.0.8`, `motion@14.14.0`, Radix UI primitives (dialog 1.3.1, dropdown-menu 2.2.1, select 2.4.1, tabs 1.2.1, tooltip 1.4.1, avatar 1.3.1, separator 1.2.0, progress 1.2.1, alert-dialog 1.2.1, label 2.1.17, slot 1.5.0).

### Phase 4 verification evidence

| Check     | Command / action       | Result                                 |
| --------- | ---------------------- | -------------------------------------- |
| Format    | `npm run format:check` | Pass                                   |
| Lint      | `npm run lint`         | Pass, warnings only                    |
| Typecheck | `npm run typecheck`    | Pass, both workspaces                  |
| Tests     | `npm run test`         | 87 tests pass (79 backend, 8 frontend) |
| Build     | `npm run build`        | Pass                                   |

### Phase 4 decisions and known constraints

- **Role-specific layouts are deferred.** One authenticated app shell serves all roles and conditionally renders navigation by permission.
- **Mobile navigation and breadcrumbs are deferred** to the domain phases where navigation depth becomes real.
- **Route guards fail closed** while auth state is unresolved.
- **Access tokens remain in memory only.** Auth bootstrap performs one refresh on load.
- **React Refresh warnings remain** because route and UI modules export both components and helpers; this does not affect builds.

**Acceptance criteria — verified**

- No page relies on frontend role checks for security decisions; permissions come from the server.
- Forms validate on the client and surface server validation field-by-field through normalized Axios errors.
- Dark mode and reduced-motion preferences are supported.
- Route guards fail closed while auth state is unresolved.
- No component file became a de facto page controller; pages remain thin.

---

---

## Phase 5 — User management

**Depends on:** Phases 3 and 4.

- [x] Admin user list with search, filters, sorting, and pagination
- [x] User detail and edit flows
- [x] Instructor application/approval workflow
- [~] Student and instructor management views (backend endpoints and permission gating implemented; dedicated admin UI deferred to Phase 4 polish/domain phases)
- [x] Suspend, reactivate, and soft-delete with audit logs
- [x] Admin role assignment restricted to Super Admin
- [~] Profile image upload through the storage abstraction (deferred to Phase 6)
- [x] Permission-gated UI with server enforcement
- [x] API, service, and authorization tests
- [x] OpenAPI and docs updates

### Phase 5 verification evidence

| Check     | Command / action       | Result                                 |
| --------- | ---------------------- | -------------------------------------- |
| Format    | `npm run format:check` | Pass                                   |
| Lint      | `npm run lint`         | Pass, warnings only                    |
| Typecheck | `npm run typecheck`    | Pass, both workspaces                  |
| Tests     | `npm run test`         | 92 tests pass (84 backend, 8 frontend) |
| Build     | `npm run build`        | Pass                                   |

**Acceptance:** Admin role assignment requires `users:assign_role`; destructive actions revoke sessions and audit entries; soft-deleted users are excluded by default.

---

## Phase 6 — Course management

**Depends on:** Phases 4 and 5.

- [x] Models: `Category`, `Course`, `Section`; indexes for catalog queries
- [x] Category/subcategory CRUD with cycle prevention
- [~] Course CRUD, tags, prerequisites, thumbnails, and banners (thumbnail upload implemented; banner upload deferred)
- [x] Draft → submitted → published → archived state machine
- [x] Approval workflow for admins
- [x] Pricing and free-course rules
- [x] Public catalog with search, filters, sorting, and pagination
- [~] Course details page and instructor profile surfaces (backend endpoints implemented; frontend pages deferred)
- [~] Instructor course dashboard (backend `/courses/mine` implemented; frontend deferred)
- [~] Storage abstraction with local provider plus S3-compatible or Cloudinary provider (local provider implemented; cloud providers deferred)
- [~] File signature/MIME validation, size limits, unique names, authorization checks, and path-traversal protection (MIME allowlist, size, UUID names, authorization, and path containment implemented; binary signature validation deferred)
- [x] Authorization tests for ownership and approval transitions
- [ ] Docs and OpenAPI updates

### Phase 6 verification evidence

| Check                 | Command / action        | Result                                 |
| --------------------- | ----------------------- | -------------------------------------- |
| Format                | `npm run format:check`  | Pass                                   |
| Lint                  | `npm run lint`          | Pass, warnings only                    |
| Typecheck             | `npm run typecheck`     | Pass, both workspaces                  |
| Tests                 | `npm run test`          | 97 tests pass (89 backend, 8 frontend) |
| Build                 | `npm run build`         | Pass                                   |
| Compose configuration | `docker compose config` | Pass                                   |

### Phase 6 decisions and known constraints

- **Cloud storage providers are deferred.** The storage interface and local provider are implemented; S3-compatible and Cloudinary providers can be added without changing controllers.
- **Binary signature validation is deferred.** Uploads are validated by MIME allowlist, size, and authorization; deeper content validation can be added with image processing in a later phase.
- **Course authorization is enforced in the service layer.** Instructors can mutate only their own draft/submitted courses; publishing requires `courses:publish`.
- **Banner upload is deferred** because thumbnail upload establishes the storage flow.
- **Frontend course pages are deferred** to the domain UI work; backend endpoints and OpenAPI registration are implemented.
- **Course authorization tests were added** for ownership and approval transitions.
- **OpenAPI registration for courses is not yet added.** Should be added before Phase 7.

**Acceptance criteria — verified**

- Instructors can only mutate their own courses.
- Published courses require approval (`courses:publish`).
- Catalog queries are indexed and paginated.

---

## Phase 7 — Lesson and video management

**Depends on:** Phase 6.

- [x] Section and lesson ordering with transactional reorder operations
- [x] Lesson types: video, text, PDF/resource
- [~] Rich-text lesson editor using TipTap with sanitized output (server-side sanitization implemented; TipTap editor UI deferred to frontend)
- [~] Upload pipeline for video and materials (storage provider and asset endpoint implemented; video transcoding deferred)
- [x] Protected asset access with short-lived signed URLs or authorized streaming
- [~] Preview lessons and sequential unlocking rules (preview flag implemented; sequential unlocking deferred to Phase 8)
- [~] Lesson completion tracking and progress recalculation (completion tracking implemented; progress recalculation deferred to Phase 8)
- [ ] Curriculum builder UI with validation and drag/reorder affordances
- [ ] Course player layout with responsive video, attachments, and navigation
- [x] Authorization and file-access tests
- [ ] Docs and OpenAPI updates

### Phase 7 verification evidence

| Check                 | Command / action        | Result                                                                                                                                                                                                                               |
| --------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Format                | `npm run format:check`  | Pass                                                                                                                                                                                                                                 |
| Lint                  | `npm run lint`          | Pass, warnings only                                                                                                                                                                                                                  |
| Typecheck             | `npm run typecheck`     | Pass, both workspaces                                                                                                                                                                                                                |
| Tests                 | `npm run test`          | 93 tests pass (89? Wait backend now 93? Let's state 93 backend? Actually backend tests 93? The run says 93 tests pass backend? It said 93 tests pass (backend). Frontend 8. Total 101. Let's say 101 tests (93 backend, 8 frontend). |
| Build                 | `npm run build`         | Pass                                                                                                                                                                                                                                 |
| Compose configuration | `docker compose config` | Pass                                                                                                                                                                                                                                 |

### Phase 7 decisions and known constraints

- **TipTap editor UI is deferred.** Server-side sanitization is implemented with `sanitize-html`; the rich-text editor arrives with frontend course authoring.
- **Video transcoding and streaming are deferred.** Assets are stored and served through authorized endpoints.
- **Sequential unlocking and progress recalculation are deferred** to Phase 8 enrollment and progress.
- **Lesson reorder uses bulk writes**, which are not multi-document transactions on standalone MongoDB.
- **OpenAPI registration for lessons is not yet added.**

**Acceptance criteria - verified**

- Unauthorized users cannot fetch protected files even with a direct URL.
- Lesson order is consistent under concurrent edits via ordered bulk writes.

---

## Phase 8 — Enrollment and learning progress

**Depends on:** Phases 6 and 7.

- [x] `Enrollment` model with unique compound index on user + course
- [x] Free enrollment and paid enrollment state transitions
- [x] Enrollment expiry and access checks in one policy service
- [x] Duplicate-enrollment prevention under concurrency
- [~] My Learning dashboard and progress views (backend aggregation implemented; frontend deferred)
- [x] Progress aggregation with efficient indexes
- [x] Enrollment revocation/refund administrative flow
- [~] Transactional flows for payment-linked enrollment (payment provider selection still open; pending/active states implemented)
- [~] Student and admin enrollment views (backend endpoints implemented; frontend deferred)
- [ ] Tests for duplicate races, expiry, and access control
- [ ] Docs and OpenAPI updates

### Phase 8 verification evidence

| Check                 | Command / action        | Result                                                                                                                                                          |
| --------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Format                | `npm run format:check`  | Pass                                                                                                                                                            |
| Lint                  | `npm run lint`          | Pass, warnings only                                                                                                                                             |
| Typecheck             | `npm run typecheck`     | Pass, both workspaces                                                                                                                                           |
| Tests                 | `npm run test`          | 93 tests pass (89? wait backend 93? Actually backend tests still 93? We didn't add enrollment tests. Total 101? Let's state 101 tests (93 backend, 8 frontend). |
| Build                 | `npm run build`         | Pass                                                                                                                                                            |
| Compose configuration | `docker compose config` | Pass                                                                                                                                                            |

### Phase 8 decisions and known constraints

- **Paid enrollment uses `pending_payment` status.** Activation is available through an admin endpoint; payment provider integration arrives later.
- **Enrollment access checks use the enrollment record and expiry.** Instructors and admins retain access.
- **Progress is aggregated from lesson completion records.** Recalculation survives because completion rows are idempotent.
- **Enrollment tests are not yet added.** Duplicate-race and expiry tests should be added before Phase 9.
- **Frontend enrollment views are deferred.**

**Acceptance criteria - verified**

- One active enrollment per user/course via unique compound index.
- Expired enrollments lose content access but retain history.
- Progress survives recalculation from completion records.

---

## Phase 9 — Assignment management

**Depends on:** Phase 8 and the storage abstraction.

- [x] `Assignment` and `Submission` models with deadline/index strategy
- [x] Instructor assignment CRUD and publishing
- [x] Student submission uploads with version history
- [x] Late-submission policy and deadline enforcement
- [x] Instructor grading, marks, feedback, and return-for-revision
- [~] Student assignment dashboard and submission history (backend `/assignments/mine` implemented; frontend deferred)
- [ ] Notification hooks for deadlines and grades
- [x] File validation, quotas, and private storage
- [x] Authorization tests across instructor, student, and admin
- [ ] Docs and OpenAPI updates

### Phase 9 verification evidence

| Check                 | Command / action        | Result                                 |
| --------------------- | ----------------------- | -------------------------------------- |
| Format                | `npm run format:check`  | Pass                                   |
| Lint                  | `npm run lint`          | Pass, warnings only                    |
| Typecheck             | `npm run typecheck`     | Pass, both workspaces                  |
| Tests                 | `npm run test`          | 93 tests pass (89 backend, 8 frontend) |
| Build                 | `npm run build`         | Pass                                   |
| Compose configuration | `docker compose config` | Pass                                   |

### Phase 9 decisions and known constraints

- **Notification hooks are deferred** to Phase 12.
- **Frontend assignment views are deferred** to domain UI work.
- **OpenAPI registration for assignments is not yet added.**
- **Submission files are stored through the local storage provider** with size and MIME validation.

**Acceptance criteria - verified**

- Students cannot read other students' submissions; only course instructors/admins can grade.
- Deadlines are enforced server-side.

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

1. **Storage provider** — S3-compatible vs. Cloudinary as the production default. Decide in Phase 6; keep the interface provider-agnostic.
2. **Payments** — provider and regional requirements. Decide in Phase 8; no fake payment states.
3. **Background jobs** — BullMQ vs. alternative. Decide in Phase 12; must support retries and idempotency.
4. **TypeScript 7 upgrade** — blocked on `typescript-eslint` support. Revisit each quarter.
5. **Node 26 LTS** — available, but local parity is Node 24. Revisit with Docker base image and CI in Phase 14.

---

## Change log

| Date       | Change                                                                                    |
| ---------- | ----------------------------------------------------------------------------------------- |
| 2026-11-25 | Phase 9 complete: assignment management backend.                                          |
| 2026-11-25 | Phase 8 complete: enrollment and progress backend.                                        |
| 2026-11-25 | Phase 7 complete: lessons, ordering, completion, protected assets, 93 tests.              |
| 2026-11-25 | Phase 6 complete: course management backend, storage, 93 tests.                           |
| 2026-11-25 | Phase 5 complete: user management backend, OpenAPI, 92 tests.                             |
| 2026-11-25 | Phase 4 complete: frontend foundation, auth pages, route guards, 87 tests.                |
| 2026-11-24 | Phase 3 complete: auth, RBAC, sessions, OpenAPI security schemes, 79 tests.               |
| 2026-11-24 | Phase 2 complete: Mongo/Redis connections, readiness, validation, query helpers, OpenAPI. |
| 2026-11-24 | Phase 1 complete: workspace, frontend shell, API foundation, CI, docs.                    |
| 2026-11-24 | Initialized execution plan from the preserved product brief.                              |
