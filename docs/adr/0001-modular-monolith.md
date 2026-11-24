# ADR-0001 — Modular monolith with layered feature modules

- **Status:** Accepted
- **Date:** 24 November 2026
- **Deciders:** Project maintainer
- **Supersedes:** None

## Context

Atrium is a multi-role LMS with courses, lessons, enrollments, assignments, quizzes, certificates, notifications, and analytics. It is built by a very small team with AI assistance, delivered in phases, and expected to be operated without a platform team.

The architecture must support:

- Strong security boundaries around authorization and learner data.
- Independent frontend and backend deployment.
- Clear ownership of code as features accumulate.
- Tests that can target business rules without standing up the whole HTTP stack.
- A realistic operational burden for a small team.

Two failure modes are common in projects like this: an unstructured Express application where routes accumulate queries and business logic, and premature microservices that multiply failure modes without adding delivery capacity.

## Decision

Build the backend as a **single deployable modular monolith**, organized by feature module and layered internally:

```text
route → controller → service → repository → model
```

Each module owns its routes, controller, service, repository, model, validation, and types. Modules do not reach into each other's models or repositories; cross-module interaction goes through the owning module's service. Shared infrastructure (errors, HTTP helpers, configuration, logging, database lifecycle) lives outside feature modules.

The frontend remains a separate deployable SPA that talks to the API over HTTP. It does not share runtime code with the backend.

## Consequences

**Positive**

- One build, one deploy, one process model, one set of logs. Operationally tractable.
- Business rules are testable in services without HTTP or database plumbing.
- Persistence can be replaced or faked at the repository boundary.
- Module boundaries make later extraction possible if a genuine scaling need appears.
- Authorization policy has a clear home in services rather than being scattered across routes.

**Negative / costs**

- Module boundaries are conventions enforced by review, not by the network. They can erode without discipline.
- A single deploy means a defect can affect all features at once.
- Cross-module transactions require explicit design rather than distributed sagas.
- Repository abstraction can become ceremony if it merely forwards Mongoose calls; it must earn its place by isolating real query complexity.

**Mitigations**

- Document and review the dependency direction (this ADR, `AGENTS.md`, `docs/ARCHITECTURE.md`).
- Reject controller-level queries and cross-module model imports in code review.
- Keep modules cohesive around a domain capability, not around a technical layer.
- Introduce a repository only where it provides a real seam or query encapsulation.

## Alternatives considered

1. **Layer-first monolith** (`controllers/`, `services/`, `models/` at the top level).
   Rejected: as features grow, every change spans distant directories, ownership blurs, and modules become entangled. Feature-first organization keeps a change local.

2. **Microservices per domain.**
   Rejected for now: distributed transactions, service discovery, network failure handling, and multi-service deployment exceed the team's operational capacity and the project's current scale. The modular boundaries preserve a future extraction path.

3. **Serverless functions per endpoint.**
   Rejected: cold starts, per-function connection management, and fragmented local development complicate a transactional LMS. Not justified by the current workload.

4. **Backend-for-frontend plus separate domain services.**
   Rejected: additional deployables with no present benefit.

## Follow-up

- Phase 2 establishes the database, repository conventions, and validation middleware.
- Phase 3 establishes permission enforcement in middleware and services.
- Revisit this ADR only if a module demonstrates an independent scaling, compliance, or release-cadence need that the monolith cannot meet.
