# Release notes — v0.1.0

| Field   | Value                                                                                  |
| ------- | -------------------------------------------------------------------------------------- |
| Version | 0.1.0                                                                                  |
| Date    | 26 November 2026                                                                       |
| Phases  | 1–15 complete                                                                          |
| Status  | Development foundation with production-oriented controls; live deployment not verified |

## What shipped

- **Foundation (1–4)** — npm workspaces, strict TypeScript, Express 5, React 19 shell, MongoDB/Redis connections, readiness, validation, OpenAPI, auth and RBAC, frontend auth integration.
- **Domain backend (5–11)** — user management, categories and courses, lessons and protected assets, enrollments and progress, assignments and submissions, quizzes and exams, certificates with verification/PDF/revocation.
- **Platform (12–14)** — notifications and preferences, email delivery state, Redis-backed idempotent jobs, announcements, role-scoped analytics, Recharts dashboards, security audit and access fixes, container topology, Playwright UI journeys.
- **Documentation (15)** — README, API versioning policy and exported OpenAPI, operations, incident response, onboarding, decision index, final sign-off, deployment runbook.

## Quality evidence

- 180 unit/HTTP tests pass (168 backend, 12 frontend).
- Coverage: backend 55.75% statements, frontend 25.64%; priority services 65–83%.
- 4 Playwright tests: 2 UI journeys and 2 axe accessibility scans pass; 2 Compose-stack smoke tests skip unless `E2E_STACK=1`.
- Formatting, lint, strict typechecking, both production builds, and both Compose configuration checks pass.
- `npm audit` reports 0 vulnerabilities in all dependency classes.

## Breaking changes

None within v0.1.0. The API contract is v1 and additive only.

## Known limitations

- No live Docker image build or Compose-stack run in the development environment.
- Full-stack E2E journeys are authored but gated; several domain screens do not exist in the frontend.
- Job worker runs in the API process; rate limiting is per-process; no retry jitter.
- No audit-log read API, SBOM, automated backup schedule, or dedicated worker process.
- Certification eligibility does not enforce assessment or attendance policies.
- Dark-mode contrast and full keyboard/screen-reader walkthrough remain open.

## Upgrade notes

Re-run `npm run seed` and `npm run indexes` after deploying this release. Students gained `analytics:read` in Phase 12; the seed updates existing roles. No destructive migrations were introduced.

## Handoff checklist

- [x] All 15 phases recorded in `PLAN.md` with evidence and decisions
- [x] Architecture and ADR index reconciled
- [x] API reference exported and versioning policy written
- [x] Operations, deployment, rollback, incident, and onboarding guides written
- [x] Security audit and conditional accessibility sign-off recorded
- [ ] Live clean-machine deployment verification on a host with Docker
- [ ] Full-stack E2E run with `E2E_STACK=1`
- [ ] 360-degree review and production sign-off with stakeholders
