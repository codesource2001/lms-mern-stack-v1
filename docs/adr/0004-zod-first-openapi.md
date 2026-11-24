# ADR-0004 — Zod-first OpenAPI contracts

| Field      | Value                                           |
| ---------- | ----------------------------------------------- |
| Status     | Accepted                                        |
| Date       | 24 November 2026                                |
| Phase      | 2                                               |
| Supersedes | The open OpenAPI decision recorded in `PLAN.md` |

## Context

Atrium validates every request boundary with Zod. Phase 2 needs a machine-readable API contract that:

- Documents the operational and versioned endpoints.
- Does not duplicate schemas between validation code and JSDoc annotations.
- Works with Zod 4 and Express 5.
- Can be served interactively for development without becoming a production surface by accident.

The candidate packages were checked against the npm registry at implementation time. `@asteasolutions/zod-to-openapi@9.1.0` supports Zod 4. `swagger-ui-express@5.0.1` serves the UI.

## Decision

Use a **Zod-first** contract:

1. API schemas are Zod schemas in `backend/src/docs/openapi.ts`.
2. `@asteasolutions/zod-to-openapi` registers named schemas and paths and generates an OpenAPI **3.1.0** document.
3. `GET /api-docs/openapi.json` returns the generated document.
4. `GET /api-docs/` serves Swagger UI from the same process.
5. Documentation is mounted only when `ENABLE_API_DOCS` is true. It defaults to true outside production and false in production.
6. When docs are enabled, Helmet's CSP permits inline scripts and styles required by Swagger UI. When disabled, the default Helmet policy applies.
7. Health and readiness are documented as operational endpoints alongside the versioned API root.

The generated document is a contract artifact: tests assert that every implemented endpoint is present. Future phases must register their paths and schemas as part of the endpoint work, not in a separate documentation sprint.

## Alternatives considered

| Alternative                           | Why rejected                                                                                                                                             |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JSDoc/OpenAPI comments in route files | Duplicates validation schemas, drifts silently, and requires a second source of truth.                                                                   |
| Hand-written `openapi.yaml`           | Same duplication problem with more maintenance and no type linkage.                                                                                      |
| A separate documentation service      | Adds operational surface before the API has domain endpoints.                                                                                            |
| `zod-openapi` (the other candidate)   | Viable with Zod 4, but the chosen generator has a smaller, direct API and OpenAPI 3.1 generation at the pinned version. Revisit if requirements diverge. |

## Consequences

Positive:

- Validation and documentation share one schema definition.
- The contract can be generated and tested in CI without a running server.
- Swagger UI is immediately useful to frontend and backend contributors.

Negative:

- Route registration is manual; adding an endpoint without registering it is possible. The OpenAPI test is the guard, but future phases must keep it current.
- Swagger UI requires a relaxed CSP while enabled. Production defaults to disabled; a deliberate enablement must review the header policy.
- Generated schemas currently live in one module. As modules grow, each feature will register its own paths and contribute definitions to the registry, which will require a small composition convention.

## References

- `backend/src/docs/openapi.ts`
- `backend/src/docs/docs.routes.ts`
- `backend/tests/openapi.test.ts`
- `backend/src/config/env.ts`
- `PLAN.md` Phase 2
