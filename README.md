# Atrium LMS

A production-oriented MERN learning platform delivered in strict phases. Every phase ends with working code, tests, documentation, and a green quality gate.

> **Status: Phase 15 of 15 complete.** The backend, frontend domain foundation, security audit, container topology, and operational documentation are in place. Live container/E2E stack verification could not be run in the development environment because the Docker daemon was unavailable; see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## What exists today

- **Auth and RBAC** — Argon2id passwords, in-memory access JWTs, rotating refresh cookies with reuse detection, verification/reset flows, lockout, four seeded roles, permission-based server authorization, CSRF guard, audit log.
- **Learning domain** — categories, courses and publishing workflow, sections, lessons with sanitized rich text and protected assets, enrollments, progress, assignments and submissions, quizzes with server-authoritative timers and grading, certificates with verification/PDF/revocation.
- **Notifications and analytics** — in-app notification center with preferences, email delivery state with retries, Redis-backed idempotent jobs, course announcements, role-scoped analytics with Recharts dashboards.
- **Frontend** — React 19 + Vite, React Router 8, TanStack Query, Tailwind 4, Radix primitives, accessible layouts, auth pages, dashboard, and notification center. Course/assessment screens are intentionally deferred.
- **Operations** — multi-stage non-root Dockerfiles, production Compose with Caddy, seed and index-verification CLIs, health/readiness probes, graceful shutdown, structured logs, CI coverage and Playwright artifacts.

Not implemented: dedicated worker process, quiz scheduling, frontend course/assessment screens, audit-log read API, and live deployment verification. See [`PLAN.md`](PLAN.md) for the exact phase record.

## Documentation map

| Document                                                 | Purpose                                                     |
| -------------------------------------------------------- | ----------------------------------------------------------- |
| [`PLAN.md`](PLAN.md)                                     | Phase roadmap, acceptance criteria, evidence, and decisions |
| [`AGENTS.md`](AGENTS.md)                                 | Repository rules for humans and coding agents               |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)           | System and module architecture                              |
| [`docs/DATABASE.md`](docs/DATABASE.md)                   | Schema, index, and repository conventions                   |
| [`docs/adr/`](docs/adr/)                                 | Accepted architecture decisions                             |
| [`docs/API.md`](docs/API.md)                             | API versioning policy and generated reference               |
| [`docs/api/openapi.json`](docs/api/openapi.json)         | Exported OpenAPI 3.1 document (71 paths)                    |
| [`docs/SECURITY.md`](SECURITY.md)                        | Security controls and residual risks                        |
| [`docs/SECURITY-AUDIT.md`](docs/SECURITY-AUDIT.md)       | OWASP mapping, findings, authorization matrix, budgets      |
| [`docs/ACCESSIBILITY.md`](docs/ACCESSIBILITY.md)         | Frontend accessibility target and checklist                 |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)               | Production topology, deployment steps, rollback             |
| [`docs/OPERATIONS.md`](docs/OPERATIONS.md)               | Backups, restores, Redis, indexes, jobs, routine checks     |
| [`docs/INCIDENT-RESPONSE.md`](docs/INCIDENT-RESPONSE.md) | Incident process and secret rotation                        |
| [`docs/ONBOARDING.md`](docs/ONBOARDING.md)               | Maintainer onboarding path                                  |
| [`docs/DECISIONS.md`](docs/DECISIONS.md)                 | ADR index and decision reconciliation                       |
| [`docs/RELEASE-NOTES.md`](docs/RELEASE-NOTES.md)         | v0.1.0 release scope and limitations                        |

## Prerequisites

- Node.js 24 (`.nvmrc`) and npm 11.
- Docker Engine with the Compose plugin for local infrastructure.
- Git.

## Local quick start

```bash
npm install
docker compose up -d
npm run dev
```

Copy `backend/.env.example` to `backend/.env` if you need to change local ports or credentials. Never commit a real `.env` file.

| Service   | URL                                                  |
| --------- | ---------------------------------------------------- |
| Web app   | http://localhost:5173                                |
| API root  | http://localhost:5000/api/v1                         |
| Liveness  | http://localhost:5000/health                         |
| Readiness | http://localhost:5000/health/ready                   |
| API docs  | http://localhost:5000/api-docs (non-production only) |

The API refuses to listen until MongoDB and Redis connect. If host ports conflict, set `MONGO_PORT`/`REDIS_PORT` in the root environment and update `MONGODB_URI`/`REDIS_URL` accordingly.

## Common commands

Run from the repository root:

| Command                           | Purpose                                |
| --------------------------------- | -------------------------------------- |
| `npm run dev`                     | Run API and web app together           |
| `npm run build`                   | Build both deployable workspaces       |
| `npm run lint` / `typecheck`      | Static quality gates                   |
| `npm run test`                    | Unit and HTTP integration tests        |
| `npm run test:coverage`           | V8 coverage reports                    |
| `npm run test:e2e`                | Playwright UI journeys                 |
| `npm run seed`                    | Apply idempotent role/permission seeds |
| `npm run indexes`                 | Create declared MongoDB indexes        |
| `npm run docs:api`                | Regenerate the OpenAPI reference       |
| `npm run format` / `format:check` | Prettier write / check                 |

## API contract

Base path: `/api/v1`; health is unversioned. All JSON responses use `{ success, message, data, meta? }` on success and `{ success, message, code, errors?, requestId? }` on failure. Validation errors are `422 VALIDATION_ERROR`; rate limits are `429 RATE_LIMITED`. The generated document is committed at [`docs/api/openapi.json`](docs/api/openapi.json) and is regenerated with `npm run docs:api`.

## Repository layout

```text
frontend/   React SPA — composition, design system, features, tests
backend/    Express API — config, infrastructure, modules, seeds, docs, tests
e2e/        Playwright UI journeys and gated stack smoke tests
deploy/     Production environment example and Caddy configuration
docs/       Architecture, ADRs, API reference, operations, security, onboarding
PLAN.md     Phase roadmap and evidence
AGENTS.md   Repository working rules
```

## Quality gates

CI runs formatting, linting, strict typechecking, unit/HTTP tests with coverage, production builds, and Playwright UI journeys. Commit messages follow Conventional Commits and are checked by Commitlint; Husky and lint-staged run formatting and linting before commit.
