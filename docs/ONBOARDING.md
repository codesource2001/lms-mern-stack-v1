# Maintainer onboarding

This path is enough to run, change, and deploy Atrium using repository documentation only.

## 1. Read in order

1. [`../PLAN.md`](../PLAN.md) — current phase, acceptance criteria, evidence, known debt.
2. [`../AGENTS.md`](../AGENTS.md) — non-negotiable working rules.
3. [`ARCHITECTURE.md`](ARCHITECTURE.md) — system boundaries and dependency direction.
4. [`DATABASE.md`](DATABASE.md) — schema, index, and repository conventions.
5. [`../SECURITY.md`](../SECURITY.md) and [`SECURITY-AUDIT.md`](SECURITY-AUDIT.md) — controls, findings, residuals.
6. [`DECISIONS.md`](DECISIONS.md) — why the stack is shaped this way.

## 2. Set up locally

```bash
npm install
docker compose up -d
npm run seed
npm run dev
```

Open http://localhost:5173. The API is at http://localhost:5000/api/v1 and Swagger UI at http://localhost:5000/api-docs. Register a learner account; instructor/admin roles require an administrative role assignment through the user-management API.

If ports 27017 or 6379 are occupied, override them in the local Compose environment and update `MONGODB_URI`/`REDIS_URL` in `backend/.env`.

## 3. Make a change

- Keep changes inside one phase. Do not scaffold future-phase features.
- Backend dependency direction is `route → controller → service → repository → model`. A module never imports another module's model or repository.
- Validate every request boundary with Zod; add `validateIdParam()` for id routes.
- Authorization is enforced server-side by permission and ownership. Frontend checks are cosmetic.
- Every asynchronous view has loading, empty, error, and success states.
- Add tests at the right level: service for business rules, Supertest for HTTP contracts, Testing Library for UI, Playwright for journeys.
- Use exact dependency versions and verify them against the registry before installing.

Before committing:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

Commit messages follow Conventional Commits. Do not commit `.env`, secrets, build output, or coverage.

## 4. Verify the whole system

```bash
npm run test:coverage
npm run docs:api
npm run test:e2e
docker compose config --quiet
```

`npm run docs:api` regenerates [`api/openapi.json`](api/openapi.json); commit it when routes change. `npm run test:e2e` runs mocked UI journeys; stack smoke tests require a running Compose stack and `E2E_STACK=1`.

## 5. Deploy

Follow [`DEPLOYMENT.md`](DEPLOYMENT.md) for the clean-machine procedure and rollback. Follow [`OPERATIONS.md`](OPERATIONS.md) for backups, indexes, jobs, and routine checks. Follow [`INCIDENT-RESPONSE.md`](INCIDENT-RESPONSE.md) for incidents and secret rotation.

## 6. Known gaps to be aware of

- Live container builds and full-stack E2E were not executed in the development environment.
- The job worker runs in the API process; rate limiting is per-process.
- Frontend course, lesson, assignment, and quiz screens are not built; their APIs are.
- There is no audit-log read API, SBOM, or automated backup schedule.
- TypeScript 7 is blocked by `typescript-eslint` support (ADR-0003).
