# AGENTS.md — Working rules for Atrium LMS

This repository is built phase by phase. Read this file before changing code.

**Read order**

1. `PLAN.md` — current phase, tasks, acceptance criteria, known constraints.
2. `AGENTS.md` (this file) — rules of engagement.
3. `docs/ARCHITECTURE.md` — system design and dependency direction.
4. `SECURITY.md` — implemented controls and known gaps.
5. `docs/adr/` — decisions that must not be silently reversed.

If a request conflicts with these rules, stop and surface the conflict rather than weakening a gate.

---

## 1. Phase discipline

- Work on **one phase at a time**. Do not scaffold future-phase features "while you are there".
- A phase is complete only when its acceptance criteria in `PLAN.md` are demonstrably met and the full quality gate passes.
- Never mark a checkbox complete unless the behavior exists and is verified. No aspirational checkboxes.
- Do not install a dependency before the phase that uses it. Verify the current stable version against the registry at installation time, then pin it exactly.
- Do not create placeholder endpoints, fake data paths, or buttons that look functional but do nothing. If something is not built, say so in the UI and docs.
- Do not rewrite or delete user-authored files without understanding them. Treat unrelated local changes as user work.

---

## 2. Repository layout and boundaries

```text
frontend/   React SPA — no backend imports
backend/    Express API — no frontend imports
docs/       architecture, ADRs, source brief
```

- `frontend/` and `backend/` are independent npm workspaces. Root tooling orchestrates; it does not own application code.
- Do not create a shared package to avoid duplicating a type. Prefer explicit API contracts and small client-side view models.
- Do not move application files to the repository root.
- Keep feature code inside its feature folder, not in a growing global `utils/` directory.

---

## 3. Backend rules

### Dependency direction

```text
route → controller → service → repository → model
```

- Routes declare paths, methods, middleware, and wiring only.
- Controllers translate HTTP: read validated input, call a service, send a response. No business rules, no Mongoose queries.
- Services own business rules and authorization decisions. They accept plain typed input and return plain typed results — never `req`/`res`.
- Repositories own persistence. They return domain results and do not throw HTTP errors.
- Models define schema, indexes, and storage-level invariants.
- A module must not import another module's model or repository. Cross-module work goes through the other module's service.
- Express 5 forwards async rejections natively. Do not add an `asyncHandler` wrapper.

### Module pattern (once a module exists)

```text
modules/<feature>/
  <feature>.model.ts
  <feature>.repository.ts
  <feature>.service.ts
  <feature>.controller.ts
  <feature>.routes.ts
  <feature>.validation.ts
  <feature>.types.ts
  <feature>.test.ts
```

Create files only when the phase needs them. Do not generate empty modules in advance.

### TypeScript and ESM

- ESM only (`"type": "module"`), `module`/`moduleResolution` set to `NodeNext`.
- Relative imports use explicit `.js` specifiers, even from `.ts` files.
- Use `import type` for type-only imports (`verbatimModuleSyntax` is enabled).
- Strict mode is non-negotiable: no weakening `tsconfig`, no `@ts-ignore`, no unexplained `any`.
- Prefer `unknown` plus narrowing over `any`. If an `any` is unavoidable at a library boundary, isolate it and explain why.
- `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess` are enabled. Handle absent values explicitly.
- Every exported function has an explicit return type when inference is not obvious.

### Validation, errors, and responses

- Validate every request boundary with Zod: body, query, params, and relevant headers. Never trust client-supplied roles, IDs, prices, timestamps, or status.
- Use `sendSuccess(res, { message, data, meta? })` for success and the `AppError` family for failures.
- Error codes are stable, machine-readable, uppercase strings (`VALIDATION_ERROR`, `FORBIDDEN`, `RATE_LIMITED`).
- Never return stack traces, database errors, internal paths, or secrets to clients.
- Unknown errors become `500 INTERNAL_SERVER_ERROR`. Log the original; return a safe message.
- Validate configuration at startup. A missing or malformed variable must fail the process with field-level detail.
- Never use `process.env` directly outside `src/config/env.ts`.

### Logging

- Use the shared Pino logger. Do not `console.log` in application code.
- Log identifiers and outcomes, not payloads containing credentials or PII.
- Add new sensitive fields to the redaction list in `src/config/logger.ts`.
- Include `requestId` in error logs and error responses.

### Rate limiting and security middleware

- Global limits live in `src/app.ts`. Sensitive endpoints get stricter, endpoint-specific limits.
- When adding a proxy or load balancer, update `TRUST_PROXY_HOPS` deliberately. Never blindly trust `X-Forwarded-For`.
- Keep CORS as an explicit allowlist. Wildcards with credentials are forbidden.

### MongoDB and Redis

- Design indexes from real query shapes. Every list endpoint is paginated with a hard maximum and uses `shared/query` helpers; never introduce an unbounded list query.
- Enforce uniqueness with database indexes. Do not implement check-then-insert races.
- Use transactions for multi-document invariants when the deployment supports them; otherwise redesign the write path.
- Do not store large binaries in documents.
- Build models with `createBaseSchema()`. It applies timestamps at construction and normalizes JSON to `id` without `_id` or `__v`.
- Soft delete is opt-in via `applySoftDelete()`. Active-record queries must add `NOT_DELETED_FILTER` explicitly; do not hide deleted records globally.
- Every cache must define key, TTL, invalidation, and behavior on miss/outage.
- Redis is not a second system of record.
- The API does not listen until MongoDB and Redis connect. Keep `/health` dependency-free and report dependency health through `/health/ready`.
- Close connections on shutdown and bound every startup/readiness wait.
- Seeders must be idempotent and registered in dependency order in `src/seeds/seed.registry.ts`.

---

## 4. Frontend rules

### Structure

- `src/app/` — composition only (providers, router, root component).
- `src/components/ui/` — owned design-system primitives.
- `src/components/common/` — shared product components.
- `src/components/layouts/` — page shells.
- `src/features/<feature>/` — components, hooks, API functions, schemas, tests for that feature.
- `src/routes/` — route-level pages not owned by a feature.
- `src/lib/` — environment, query client, focused utilities.

### State and data

- TanStack Query owns server state. Do not mirror query data into Zustand or local state.
- URL search params own shareable filters, pagination, and tabs.
- React Hook Form owns form state; Zod schemas own validation.
- Zustand only for genuinely client-global UI state (theme, sidebar). Never for tokens or server data.
- Never persist access or refresh tokens in `localStorage` or `sessionStorage`. See `docs/adr/0002-authentication-token-strategy.md`.
- Route guards are UX. They never replace server authorization.

### Components and styling

- Function components with named exports. No default exports except where a tool requires them.
- Keep components focused. A file that fetches, transforms, and renders an entire dashboard is a defect.
- Use semantic design tokens (`bg-background`, `text-muted-foreground`, `border-border`, `text-brand`). Do not scatter raw hex values or arbitrary colors.
- Use `cn()` for conditional classes. Follow existing Tailwind ordering and responsive conventions.
- Do not add a UI dependency when an owned primitive or Radix primitive can be composed.
- Preserve the brand: deep green/ink neutrals, warm amber accent, Instrument Sans display, Inter body.

### Accessibility

- One `h1` per page; logical heading order.
- Every interactive element is keyboard reachable with a visible focus state.
- Every input has a label; errors are announced and associated with the field.
- Images have meaningful alt text or are marked decorative.
- Do not remove focus outlines without an accessible replacement.
- Respect `prefers-reduced-motion`; animation must never be required to understand or operate the UI.
- Target WCAG 2.2 AA for contrast and interaction.

### Async UI

Every asynchronous view must define loading, empty, error, and success states. A spinner alone is not an error strategy. Surface actionable messages and a retry path.

---

## 5. Security rules

- Authorization is enforced on the server, by permission, on every protected endpoint. Frontend role checks are cosmetic.
- Deny by default. New routes start protected unless explicitly public and documented.
- Validate and normalize input at the boundary. Confirm resource ownership in the service layer.
- Passwords: Argon2id only, never logged, never returned, never stored in plaintext.
- Refresh tokens: opaque, rotated, hashed at rest, delivered in `HttpOnly` cookies.
- Cookie-authenticated mutations require CSRF defense (Origin/Referer validation plus `SameSite`).
- Never commit `.env`, credentials, tokens, database dumps, or private keys. Keep `.env.example` current with safe placeholders.
- Do not expose internal error details or stack traces.
- Rate-limit authentication, password reset, uploads, and expensive queries.
- Files are private by default, validated by content, size-limited, renamed, and authorization-checked before delivery.
- Sanitize rich text on the server before storage or rendering.
- Log security-relevant events (login, logout, password change, role change, destructive admin actions) with actor, action, target, and result.
- Run `npm audit` as part of dependency review. Do not add a package with a known critical advisory.

See `SECURITY.md` for current gaps. Authentication does not exist yet; do not imply otherwise.

---

## 6. Testing rules

- New behavior needs tests at the right level. Business rules: service unit tests. HTTP contract: Supertest integration tests. User-visible UI: Testing Library. Journeys: Playwright from Phase 14.
- Bug fixes require a regression test that fails before the fix.
- Authorization changes require 401/403/404 matrix tests and an ownership case.
- Concurrency-sensitive writes (enrollment, grading, certificate issuance) require race or idempotency tests.
- Do not mock the thing under test. Prefer real Mongoose against a test database for repository tests when Phase 2 lands.
- Keep tests deterministic: no real network calls, no arbitrary sleeps, no shared mutable state between tests.
- Test names state the behavior and the condition.

Commands:

```bash
npm run test --workspace @atrium/backend
npm run test --workspace @atrium/frontend
npm run test:coverage
npm run seed --workspace @atrium/backend
```

Coverage is a signal, not a target to game. Auth, authorization, enrollment, grading, and certificates are the priority surfaces.

---

## 7. Git and review workflow

- Conventional Commits, enforced by Commitlint. Scope is the feature or area.

```text
feat(auth): add refresh token rotation
fix(enrollments): reject duplicate active enrollment
docs(adr): record storage provider decision
test(quizzes): cover expired attempt submission
chore(deps): pin mongoose 9.x
```

- Keep commits feature-scoped and reviewable. Do not mix formatting churn with behavior changes.
- Never commit: `.env`, secrets, `node_modules/`, `dist/`, `coverage/`, logs, OS/editor junk, database files.
- Pre-commit runs lint-staged (ESLint fix + Prettier). Commit-msg runs Commitlint. Do not bypass hooks with `--no-verify` unless the user explicitly asks and the reason is recorded.
- Do not rewrite published history, force-push shared branches, or change the remote without explicit instruction.
- Do not commit or push unless the user asks. When asked, use the configured remote and report the exact result, including authentication failures.

---

## 8. Definition of done

Before claiming a phase or task complete:

- [ ] Behavior implemented, including error and edge paths.
- [ ] Input validated; authorization enforced server-side.
- [ ] No secrets, `any` escapes, or debug logging left behind.
- [ ] Tests added and passing.
- [ ] `npm run format:check`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `docker compose config` when infrastructure changed.
- [ ] `PLAN.md` reflects reality.
- [ ] Public contracts documented (OpenAPI/README) when changed.
- [ ] Architectural or security-relevant decisions recorded as an ADR or in `SECURITY.md`.
- [ ] Remaining work and known limitations stated explicitly.

A green build with untested authorization, fabricated data, or skipped acceptance criteria is **not** done.

---

## 9. Phase handoff format

End every phase with:

1. **Completed** — what exists and was verified, with commands and results.
2. **Evidence** — test counts, build output, notable checks.
3. **Decisions and deviations** — anything that differs from the plan, and why.
4. **Known limitations** — what is intentionally absent or deferred.
5. **Next phase** — the first concrete tasks and the packages to verify.
6. **Confirmation gate** — ask before starting the next phase unless the user has already authorized it.

Never silently continue into a new phase.

---

## 10. Current state (Phase 11 complete)

- Implemented: workspace tooling, React shell, Express foundation, Mongo/Redis connections, auth/RBAC, frontend foundation, user management, course management, lesson management, enrollment and progress, assignment management, quiz and examination backend, certificate issuance/verification/PDF/revocation, CI, docs.
- Not implemented: notifications and analytics, frontend domain pages, deployment.
- Next: Phase 12 — notifications and analytics. See `PLAN.md`.
