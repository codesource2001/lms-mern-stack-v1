# Atrium LMS

A production-oriented Learning Management System built with the MERN stack. Atrium is delivered in strict phases: every phase ends with a working vertical slice, documentation, and a green quality gate before the next one starts.

> **Status: Phase 3 of 15 complete.** The repository, architecture, toolchain, frontend shell, API foundation, persistence and cache connections, readiness probes, request validation, generated OpenAPI contract, and authentication/RBAC layer are in place. Frontend auth integration and domain features begin in Phase 4.

## Why this repository exists

Most LMS projects start with screens and accumulate security and architecture debt. Atrium starts with the constraints:

- Two independently deployable applications with an explicit API contract.
- A layered backend where routes stay thin and business rules live in services.
- Permission-based authorization, never frontend-only role checks.
- Strict TypeScript, validated configuration, and fail-closed defaults.
- Tests, formatting, linting, typechecking, and production builds on every change.
- Honest phase gates instead of placeholder features.

The full product brief is preserved in [`docs/PROJECT-SPEC.md`](docs/PROJECT-SPEC.md). The executable plan is [`PLAN.md`](PLAN.md).

## What works today

- **Frontend shell** — React 19, React Router 8, TanStack Query, Tailwind CSS 4, accessible layout, responsive Phase 2 status page, 404 route.
- **Backend foundation** — Express 5, validated environment, Pino request logging with redaction, Helmet, explicit CORS allowlist, rate limiting, request IDs, 1 MB JSON limit, consistent response envelope, centralized error handling, and bounded graceful shutdown.
- **Auth foundation** — Argon2id passwords, short-lived access JWTs, rotating refresh-token cookies, email verification, password reset, progressive lockout, permission middleware, CSRF defense, and audit logging.
- **API contract** — liveness at `/health`, dependency readiness at `/health/ready`, versioned discovery at `/api/v1`, and generated OpenAPI 3.1 docs at `/api-docs` outside production. Zod validation returns `422 VALIDATION_ERROR`.
- **Local infrastructure** — MongoDB 8.3 and Redis 8.12 with authentication and health checks via Docker Compose, connected to the API with authenticated local credentials.
- **Quality gates** — ESLint 10, Prettier 3, TypeScript strict mode, Vitest 5, Supertest 7, production builds, GitHub Actions CI, Husky, lint-staged, Commitlint.
- **Documentation** — architecture, database conventions, ADRs, roadmap, agent conventions, and security policy.

### Intentionally not built yet

No authentication, authorization, domain models or collections, course features, payments, uploads, or dashboards exist. The frontend still presents a verified foundation status, not a fake product. Role and permission seed data is intentionally empty until Phase 3.

## Technology stack

Versions below were verified against the npm registry and official release channels on **24 November 2026**. The lockfile is authoritative.

| Layer    | Technology         | Version         | Notes                                                          |
| -------- | ------------------ | --------------- | -------------------------------------------------------------- |
| Runtime  | Node.js            | 24 LTS          | Local toolchain is 24.14.1; CI uses `.nvmrc`                   |
| Package  | npm workspaces     | 11.12.1         | One install, two deployable workspaces                         |
| Language | TypeScript         | 5.9.3           | Pinned; see [ADR-0003](docs/adr/0003-runtime-and-toolchain.md) |
| Frontend | React / React DOM  | 19.3.1          |                                                                |
| Frontend | React Router       | 8.5.2           | Imports from `react-router` and `react-router/dom`             |
| Frontend | Vite               | 8.3.8           |                                                                |
| Frontend | Tailwind CSS       | 4.3.5           | CSS-first configuration with design tokens                     |
| Frontend | TanStack Query     | 5.108.4         | Server-state boundary                                          |
| Frontend | Zod                | 4.6.7           | Runtime environment validation                                 |
| Frontend | Lucide React       | 1.79.0          | Icon system                                                    |
| Backend  | Express            | 5.3.0           | Native async error propagation                                 |
| Backend  | Mongoose           | 9.13.0          | Pooled MongoDB connection, schema conventions                  |
| Backend  | Redis client       | 6.4.0           | Cache/session client, bounded startup, runtime reconnect       |
| Backend  | OpenAPI generator  | 9.1.0           | Zod-first OpenAPI 3.1 document                                 |
| Backend  | Swagger UI Express | 5.0.1           | Interactive docs outside production                            |
| Backend  | Pino / pino-http   | 10.4.0 / 11.0.0 | Structured logs, redaction                                     |
| Backend  | Helmet             | 8.3.0           | Security headers                                               |
| Backend  | express-rate-limit | 8.7.5           | Global API limiter                                             |
| Testing  | Vitest             | 5.1.1           | Unit and integration tests                                     |
| Testing  | Supertest          | 7.3.2           | HTTP integration tests                                         |
| Quality  | ESLint             | 10.15.0         | Flat config, type-aware rules                                  |
| Quality  | Prettier           | 3.10.1          | Tailwind class sorting plugin                                  |
| DevOps   | Docker Compose     | 29.8.1          | MongoDB 8.3 + Redis 8.12 definitions                           |
| CI       | GitHub Actions     | —               | Lint, typecheck, test, build                                   |

Planned stack items are introduced only when their phase needs them: Argon2id, JWT, React Hook Form, Radix UI, Motion, Recharts, TipTap, Playwright, and additional storage providers. See the dependency schedule in [`PLAN.md`](PLAN.md).

## Repository layout

```text
.
├── frontend/                  # React SPA (Vite, Tailwind, TanStack Query)
│   ├── public/
│   ├── src/
│   │   ├── app/               # App composition, providers, router
│   │   ├── components/        # ui/, common/, layouts/
│   │   ├── features/          # Feature-based vertical slices
│   │   ├── lib/               # Env validation, query client, utilities
│   │   ├── routes/            # Route-level pages not owned by a feature
│   │   ├── styles/            # Design tokens and global CSS
│   │   └── test/              # Test setup
│   └── components.json        # shadcn/ui configuration
├── backend/                   # Express API (ESM, strict TypeScript)
│   ├── src/
│   │   ├── config/            # Validated env and logger
│   │   ├── docs/              # Zod-first OpenAPI and Swagger UI
│   │   ├── infrastructure/    # MongoDB, Redis, readiness, schema plugins
│   │   ├── middlewares/       # Request ID, logging, validation, errors
│   │   ├── modules/           # Feature modules (health now; domain later)
│   │   ├── routes/            # Versioned API router
│   │   ├── seeds/             # Seed runner, registry, and CLI
│   │   ├── shared/            # Errors, HTTP, async, query, shutdown helpers
│   │   └── types/             # Type augmentation
│   └── tests/                 # Supertest and unit tests
├── docs/
│   ├── adr/                   # Architecture decision records
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md            # Connection, schema, repository, query rules
│   └── PROJECT-SPEC.md        # Original product brief
├── .github/workflows/ci.yml
├── docker-compose.yml         # Local MongoDB + Redis
├── PLAN.md
├── AGENTS.md
└── SECURITY.md
```

## Prerequisites

- **Node.js 24** (`.nvmrc`). React Router 8 requires Node ≥ 22.22; the project standardizes on 24 LTS.
- **npm 11**.
- **Docker** with Compose (required for local MongoDB and Redis).
- Git.

## Quick start

```bash
git clone https://github.com/codesource2001/lms-mern-stack-v1.git
cd lms-mern-stack-v1
npm install
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
docker compose up -d
npm run dev
```

On Windows PowerShell, replace `cp` with `Copy-Item`:

```powershell
Copy-Item .env.example .env
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Services:

| Service   | URL                                |
| --------- | ---------------------------------- |
| Web app   | http://localhost:5173              |
| API       | http://localhost:5000              |
| API root  | http://localhost:5000/api/v1       |
| Liveness  | http://localhost:5000/health       |
| Readiness | http://localhost:5000/health/ready |
| API docs  | http://localhost:5000/api-docs     |
| MongoDB   | `localhost:27017` (Compose)        |
| Redis     | `localhost:6379` (Compose)         |

If ports `27017` or `6379` are already in use, set `MONGO_PORT`/`REDIS_PORT` in the root `.env` before `docker compose up -d`, then update `MONGODB_URI`/`REDIS_URL` in `backend/.env` to the same ports.

The API refuses to start until both MongoDB and Redis are reachable. Environment files are still reproducible defaults for local development. Never commit a real `.env` file.

## Environment variables

### Backend

| Variable                              | Default                       | Purpose                                    |
| ------------------------------------- | ----------------------------- | ------------------------------------------ |
| `NODE_ENV`                            | `development`                 | `development`, `test`, or `production`     |
| `PORT`                                | `5000`                        | HTTP port                                  |
| `API_PREFIX`                          | `/api/v1`                     | Versioned API mount path                   |
| `APP_VERSION`                         | `0.1.0`                       | Reported by health and API root            |
| `CORS_ORIGINS`                        | `http://localhost:5173`       | Comma-separated origin allowlist           |
| `LOG_LEVEL`                           | `info`                        | Pino level; use `silent` in tests          |
| `TRUST_PROXY_HOPS`                    | `0`                           | Trusted proxy hops; `0` for direct traffic |
| `RATE_LIMIT_WINDOW_MS`                | `60000`                       | Global API rate-limit window               |
| `RATE_LIMIT_MAX`                      | `120`                         | Requests per window per IP                 |
| `ENABLE_API_DOCS`                     | non-prod `true`, prod `false` | Mount `/api-docs` and the OpenAPI JSON     |
| `MONGODB_URI`                         | local Compose URI             | MongoDB connection string                  |
| `MONGODB_MAX_POOL_SIZE`               | `10`                          | Connection pool size (1–100)               |
| `MONGODB_SERVER_SELECTION_TIMEOUT_MS` | `5000`                        | Driver server-selection bound              |
| `REDIS_URL`                           | local Compose URI             | Redis connection string                    |
| `REDIS_CONNECT_TIMEOUT_MS`            | `5000`                        | Per-attempt and startup connection bound   |
| `DEPENDENCY_RETRY_ATTEMPTS`           | `3`                           | Startup connection attempts                |
| `DEPENDENCY_RETRY_DELAY_MS`           | `1000`                        | Delay between startup attempts             |
| `READINESS_TIMEOUT_MS`                | `2000`                        | Per-dependency readiness bound             |

### Frontend

| Variable            | Default                 | Purpose                               |
| ------------------- | ----------------------- | ------------------------------------- |
| `VITE_APP_NAME`     | `Atrium LMS`            | Product name shown in metadata/footer |
| `VITE_API_BASE_URL` | `/api/v1`               | API base path used by the SPA         |
| `VITE_PROXY_TARGET` | `http://localhost:5000` | Dev-only Vite proxy target for `/api` |

Secrets for authentication, email, storage, and payments are introduced with their phases and documented in `.env.example` without real values.

## Commands

Run from the repository root:

| Command                 | What it does                                        |
| ----------------------- | --------------------------------------------------- |
| `npm run dev`           | Run API and web app together                        |
| `npm run dev:backend`   | Run the API with `tsx watch`                        |
| `npm run dev:frontend`  | Run the Vite dev server                             |
| `npm run build`         | Build both workspaces for production                |
| `npm run lint`          | Run ESLint in both workspaces                       |
| `npm run typecheck`     | Strict TypeScript check in both workspaces          |
| `npm run test`          | Run Vitest suites in both workspaces                |
| `npm run test:coverage` | Generate V8 coverage reports                        |
| `npm run seed`          | Run the backend seed registry (empty until Phase 3) |
| `npm run format`        | Format the repository with Prettier                 |
| `npm run format:check`  | Verify formatting without writing                   |
| `npm run prepare`       | Install Husky Git hooks                             |

Workspace-specific commands:

```bash
npm run test --workspace @atrium/backend
npm run test --workspace @atrium/frontend
npm run dev --workspace @atrium/backend
```

## API conventions

Base path: `/api/v1`. Health is operational and intentionally unversioned at `/health`.

### Success envelope

```json
{
  "success": true,
  "message": "Service is healthy",
  "data": {
    "status": "ok",
    "service": "atrium-api",
    "version": "0.1.0",
    "environment": "development",
    "uptimeSeconds": 12.42,
    "timestamp": "2026-11-24T16:00:00.000Z"
  }
}
```

### Error envelope

```json
{
  "success": false,
  "message": "Route GET /api/v1/missing not found",
  "code": "NOT_FOUND",
  "requestId": "7c4f2a1e-9f3e-4a2b-8a5c-1d2e3f4a5b6c"
}
```

Validation failures return `422` with a `code` of `VALIDATION_ERROR` and an `errors` array of `{ field, message, code? }`. Rate-limited requests return `429` with `RATE_LIMITED`. Malformed JSON returns `400` with `INVALID_JSON`. Every response includes `x-request-id`; errors include it in the body as well.

Readiness returns `200` when MongoDB and Redis both answer a bounded ping, or `503 SERVICE_UNAVAILABLE` with per-dependency status under `context.checks`. `/health` never checks dependencies, so a liveness probe cannot restart the API during a database outage.

Current endpoints:

| Method | Path                     | Description                                           |
| ------ | ------------------------ | ----------------------------------------------------- |
| GET    | `/health`                | Liveness and service metadata                         |
| GET    | `/health/ready`          | MongoDB and Redis readiness                           |
| GET    | `/api/v1`                | Versioned API discovery                               |
| GET    | `/api-docs`              | Swagger UI (non-production unless explicitly enabled) |
| GET    | `/api-docs/openapi.json` | Generated OpenAPI 3.1 document                        |

Authentication endpoints live under `/api/v1/auth` and include registration, verification, login, refresh, logout, profile, password change/reset, and logout-all. See the OpenAPI document for request and response details.

The OpenAPI document is generated from Zod schemas with `@asteasolutions/zod-to-openapi`; see [ADR-0004](docs/adr/0004-zod-first-openapi.md). Every implemented path is asserted in the test suite.

## Quality gates

A phase is not complete until all of these pass locally:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
docker compose config
```

GitHub Actions runs the same checks (minus Compose validation) on pushes and pull requests to `main`. Husky runs lint-staged on commit and Commitlint validates commit messages.

Testing strategy:

- **Backend** — Vitest + Supertest. Coverage includes health/readiness, API root, error contract, request IDs, CORS, schema conventions, request validation, pagination/sorting/filtering, seed ordering, async bounds, graceful shutdown, environment validation, and OpenAPI paths. Default tests do not require MongoDB or Redis.
- **Frontend** — Vitest + Testing Library + jsdom. Covers the status page and 404 route.
- **Real dependencies** — start Compose, then verify `GET /health/ready` and the Swagger JSON manually or in a service-enabled CI job.
- **Later phases** — service and repository tests, authorization matrices, and Playwright end-to-end journeys.

## Git workflow

Commit messages follow Conventional Commits and are enforced by Commitlint:

```text
feat(auth): add refresh-token rotation
fix(enrollments): prevent duplicate active enrollments
security(auth): detect refresh-token reuse
docs(architecture): record storage abstraction decision
```

Keep commits small and feature-scoped. Do not commit `.env` files, secrets, database dumps, build output, or coverage reports. See [`AGENTS.md`](AGENTS.md) for the full workflow.

## Documentation

- [`PLAN.md`](PLAN.md) — phases, tasks, dependencies, acceptance criteria, progress.
- [`AGENTS.md`](AGENTS.md) — architecture rules, conventions, security and testing requirements for contributors and AI agents.
- [`SECURITY.md`](SECURITY.md) — reporting, controls, limitations, and deployment checklist.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system design and request lifecycle.
- [`docs/DATABASE.md`](docs/DATABASE.md) — connection, schema, repository, query, and seed conventions.
- [`docs/adr/`](docs/adr/) — accepted architectural decisions.
- [`docs/PROJECT-SPEC.md`](docs/PROJECT-SPEC.md) — original product brief.

## Roadmap

| Phase | Scope                                 | Status   |
| ----- | ------------------------------------- | -------- |
| 1     | Project setup and architecture        | Complete |
| 2     | Database and backend foundation       | Complete |
| 3     | Authentication and RBAC               | Complete |
| 4     | Frontend foundation and design system | Planned  |
| 5     | User management                       | Planned  |
| 6     | Course management                     | Planned  |
| 7     | Lesson and video management           | Planned  |
| 8     | Enrollment and learning progress      | Planned  |
| 9     | Assignment management                 | Planned  |
| 10    | Quiz and examination system           | Planned  |
| 11    | Certificate system                    | Planned  |
| 12    | Notifications and analytics           | Planned  |
| 13    | Security audit and optimization       | Planned  |
| 14    | Testing and Docker deployment         | Planned  |
| 15    | Production documentation              | Planned  |

## Security status

Phase 3 establishes Argon2id password hashing, short-lived access JWTs, rotating refresh-token cookies, email verification and password reset, progressive account lockout, permission-based authorization, CSRF defense, auth-specific rate limits, audit logging, and a generated OpenAPI security scheme. Domain features and production deployment are **not implemented yet**. Do not expose this build publicly as a learning platform until Phases 4 and 13 are complete. See [`SECURITY.md`](SECURITY.md).

## License

Private project. All rights reserved. No license is granted for redistribution.
