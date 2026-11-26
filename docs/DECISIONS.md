# Decision index and reconciliation

| Field   | Value                                                                                   |
| ------- | --------------------------------------------------------------------------------------- |
| Updated | 26 November 2026                                                                        |
| Purpose | One place to see which architectural decisions are accepted and how they appear in code |

## Accepted ADRs

| ADR                                               | Decision                                                                               | Where it is enforced                                                                        |
| ------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [0001](adr/0001-modular-monolith.md)              | Layered modular monolith; `route → controller → service → repository → model`          | `backend/src/modules/*`, repository contract in [`DATABASE.md`](DATABASE.md)                |
| [0002](adr/0002-authentication-token-strategy.md) | Access JWT in memory, rotating opaque refresh cookie, hashed sessions, reuse detection | `backend/src/modules/auth/*`, `docs/ACCESSIBILITY.md` token guidance, frontend `lib/api.ts` |
| [0003](adr/0003-runtime-and-toolchain.md)         | Node 24, TypeScript 5.9.3 pinned; TypeScript 7 blocked by `typescript-eslint`          | `.nvmrc`, `engines`, exact versions in manifests                                            |
| [0004](adr/0004-zod-first-openapi.md)             | Zod-first OpenAPI 3.1 with Swagger UI outside production                               | `backend/src/docs/openapi.ts`, exported [`api/openapi.json`](api/openapi.json)              |
| [0005](adr/0005-background-jobs.md)               | Redis-backed durable job runner instead of BullMQ                                      | `backend/src/infrastructure/jobs/*`, `backend/src/jobs/job-handlers.ts`                     |

## Reconciliation with the plan

Open decisions tracked in `PLAN.md` have been resolved as follows:

| Earlier open decision         | Resolution                                                                                    |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| Email provider and local sink | Implemented with Nodemailer; SMTP in production, log transport in development                 |
| Storage provider abstraction  | Local private storage provider behind an interface; cloud providers deferred                  |
| Background job runner         | ADR-0005; tested against the in-memory store, Lua scripts not smoke-tested against live Redis |
| Payment provider              | Deferred; paid enrollments remain `pending_payment` until an admin activates them             |
| SPA CSP                       | Partially addressed by nginx headers; full CSP remains a hosting concern                      |
| TypeScript 7 / Node 26        | Revisited quarterly; still blocked / deferred per ADR-0003                                    |

## Decisions made without an ADR

These are recorded in the relevant documentation rather than a new ADR because they are implementation policies, not architecture changes:

- **Analytics read model** — the analytics module composes data through domain service methods and never imports another module's model or repository. Documented in [`ARCHITECTURE.md`](ARCHITECTURE.md) and [`DATABASE.md`](DATABASE.md).
- **Endpoint rate limits** — global limiter plus endpoint-specific presets; in-memory store accepted until a shared store is deployed. Documented in [`SECURITY-AUDIT.md`](SECURITY-AUDIT.md).
- **Student analytics permission** — students hold `analytics:read` because their overview is self-scoped; server-side role resolution prevents cross-tenant reads.
- **Container topology** — non-root multi-stage images behind a Caddy reverse proxy, documented in [`DEPLOYMENT.md`](DEPLOYMENT.md).

## Adding a decision

An ADR is required when the change affects dependency direction, persistence ownership, token/session lifecycle, dependency adoption, or deployment topology. Otherwise record the choice in the relevant runbook or security document. Every new ADR must be linked from this index and from `ARCHITECTURE.md`.
