# Database and cache conventions

| Field    | Value                       |
| -------- | --------------------------- |
| Status   | Phase 2 baseline — accepted |
| Updated  | 24 November 2026            |
| Audience | Backend maintainers         |

This document records how Atrium connects to MongoDB and Redis, how models are built, and the rules repositories and list endpoints must follow. Architectural direction lives in [`ARCHITECTURE.md`](ARCHITECTURE.md); the Zod-first API decision is [ADR-0004](adr/0004-zod-first-openapi.md).

---

## 1. Connection lifecycle

### Startup

`backend/src/server.ts` calls `connectInfrastructure()` **before** the HTTP server starts listening. The API does not accept traffic until MongoDB and Redis are reachable.

1. MongoDB connects with `MONGODB_MAX_POOL_SIZE` and `MONGODB_SERVER_SELECTION_TIMEOUT_MS`. Failures are retried `DEPENDENCY_RETRY_ATTEMPTS` times.
2. Redis connects with a startup deadline of `REDIS_CONNECT_TIMEOUT_MS`.
3. If either dependency fails, startup aborts with a `DependencyConnectionError` that names the dependency and the variable to check. The process exits with code `1`.

Mongoose lifecycle events (`connected`, `disconnected`, `reconnected`, `error`) and Redis lifecycle events (`ready`, `end`, `error`) are logged with the dependency name.

### Runtime reconnects

- Mongoose manages reconnects internally using the MongoDB driver's topology monitoring.
- Redis reconnects indefinitely with capped backoff after a runtime outage. This keeps a transient cache restart from permanently closing the client.
- Startup is still bounded: `connectRedis()` uses `withTimeout`, and a startup timeout destroys the client before retrying.

### Readiness and liveness

| Endpoint            | Purpose   | Behavior                                                                                                                                                                                 |
| ------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /health`       | Liveness  | Process-only. Never calls MongoDB or Redis. A container liveness probe must not restart the API when a dependency is down.                                                               |
| `GET /health/ready` | Readiness | Pings MongoDB (`admin().ping()`) and Redis (`PING`) in parallel with `READINESS_TIMEOUT_MS`. Returns `200` ready or `503` with per-dependency status and latency under `context.checks`. |

A readiness success returns the checks under `data.checks`; a failure returns the standard error envelope with the same checks under `context.checks`. A failure exposes only `{ status, latencyMs }` per dependency. It never returns driver errors, connection strings, credentials, or stack traces.

### Shutdown

`createGracefulShutdown()` performs one ordered sequence:

1. Stop accepting HTTP connections and close idle connections.
2. Wait for in-flight requests to finish.
3. Quit Redis, then disconnect MongoDB.
4. Exit with the requested code.

A 10-second force-exit timer bounds the entire sequence. Cleanup failures are logged; the process still exits rather than hanging.

---

## 2. Configuration

| Variable                              | Default (development)                                                               | Notes                                            |
| ------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------ |
| `MONGODB_URI`                         | `mongodb://atrium:local-dev-only-change-me@localhost:27017/atrium?authSource=admin` | Must start with `mongodb://` or `mongodb+srv://` |
| `MONGODB_MAX_POOL_SIZE`               | `10`                                                                                | 1–100                                            |
| `MONGODB_SERVER_SELECTION_TIMEOUT_MS` | `5000`                                                                              | Bounds driver server selection                   |
| `REDIS_URL`                           | `redis://:local-dev-only-change-me@localhost:6379`                                  | Must start with `redis://` or `rediss://`        |
| `REDIS_CONNECT_TIMEOUT_MS`            | `5000`                                                                              | Per-attempt timeout and startup deadline         |
| `DEPENDENCY_RETRY_ATTEMPTS`           | `3`                                                                                 | Applies to MongoDB and Redis startup             |
| `DEPENDENCY_RETRY_DELAY_MS`           | `1000`                                                                              | Delay between startup attempts                   |
| `READINESS_TIMEOUT_MS`                | `2000`                                                                              | Per-readiness-probe bound                        |

In `NODE_ENV=production`, the `local-dev-only-change-me` placeholder is rejected for both connection URLs. Production deployments must supply real credentials through the environment or a secret manager.

If local Compose ports are changed with `MONGO_PORT` or `REDIS_PORT`, update `MONGODB_URI` and `REDIS_URL` in `backend/.env` to match.

---

## 3. Schema conventions

Models must be created through `createBaseSchema()` in `backend/src/infrastructure/mongo/plugins/base-schema.ts`:

```ts
import { createBaseSchema } from '../../infrastructure/mongo/plugins/base-schema.js';

const courseSchema = createBaseSchema(
  {
    title: { type: String, required: true, trim: true },
    status: { type: String, enum: ['draft', 'published'], required: true },
  },
  { collection: 'courses' },
);

courseSchema.index({ status: 1, createdAt: -1 });
```

The factory enforces:

- `timestamps: true` at schema construction time. Mongoose cannot reliably add timestamps to an already constructed schema.
- JSON/object transforms that expose `id` (the `id` virtual) and remove `_id` and `__v`.
- A single place to add future cross-cutting schema behavior.

Additional rules:

- **`__v` stays in MongoDB.** It is hidden from JSON, not removed from storage.
- **Indexes are designed from query shapes.** Add compound indexes with the query that needs them, not speculatively. List endpoints must be paginated. `autoIndex` is disabled in production, so index creation is an explicit release step before production traffic.
- **Uniqueness is a database constraint.** Use unique indexes; never implement check-then-insert races.
- **No large binaries in documents.** Files and media use the Phase 6 storage abstraction.
- **Transactions require a replica set.** When a multi-document invariant needs a transaction, verify the deployment supports it; otherwise redesign the write path.
- **UTC only.** Store `Date` values in UTC; presentation converts to the user's locale.

### Soft delete

Soft delete is opt-in per schema:

```ts
import { applySoftDelete, NOT_DELETED_FILTER } from '../../infrastructure/mongo/plugins/soft-delete.js';

const enrollmentSchema = applySoftDelete(createBaseSchema({ ... }));
```

`applySoftDelete()` adds `deletedAt` and `deletedBy`. It deliberately does **not** hide deleted records from queries. Repositories must add `NOT_DELETED_FILTER` explicitly when they mean "active records", so administrative, restore, and audit queries can still see deleted rows. This also avoids surprising filters inside joins and aggregations.

Helper functions `markDeleted()`, `restoreDeleted()`, and `isDeleted()` keep the field handling consistent.

---

## 4. Repository contract

The dependency direction is `route → controller → service → repository → model`.

| Rule                          | Detail                                                                                                                       |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| No HTTP in repositories       | Return data or a domain-specific result. Never throw `AppError` or touch `res`.                                              |
| No `req`/`res` in services    | Accept plain typed input; return plain typed results.                                                                        |
| No cross-module model imports | Use the other module's service for cross-module work.                                                                        |
| Bounded reads                 | Every list method accepts `PaginationQuery` and returns `{ items, total }` or equivalent. There is no unbounded list helper. |
| Explicit projections          | Do not return password hashes or internal tokens. Project only fields the caller needs.                                      |
| Index-backed filters          | Every repository filter must map to an existing index for production-scale collections.                                      |

### Why there is no `BaseRepository` yet

Phase 2 has no domain models, so a generic base class would be speculation. A real base repository will be introduced only when at least two repositories share identical, non-trivial query mechanics. Until then, each repository is a small explicit module, and this contract is the shared abstraction.

---

## 5. List query helpers

`backend/src/shared/query/` provides the only approved building blocks for list endpoints.

```ts
import { createListQuerySchema } from '../../shared/query/list-query.js';
import { identifierSchema, searchTermSchema } from '../../shared/query/filtering.js';
import { buildPaginationMeta, toOffset } from '../../shared/query/pagination.js';

const courseListQuery = createListQuerySchema({
  sortFields: ['createdAt', 'title'] as const,
  defaultSort: 'createdAt',
  defaultSortDirection: 'desc',
  filters: {
    category: identifierSchema.optional(),
    q: searchTermSchema.optional(),
  },
});
```

Guarantees:

- `page` defaults to `1`; `limit` defaults to `20` and is capped at **100**.
- Sort fields are allowlisted. Arbitrary field names or operator-shaped values are rejected with `422 VALIDATION_ERROR`.
- Filter schemas are strict: unknown query keys are rejected instead of silently ignored.
- Search terms are trimmed, bounded to 100 characters, and must be passed through `escapeRegExp()` before use in a MongoDB regex.
- Repositories still own the Mongo query. These helpers validate and normalize input; they do not build database filters.

Use `toOffset()` and `buildPaginationMeta()` so pagination metadata stays consistent across endpoints.

---

## 6. Seed data

The seed runner lives in `backend/src/seeds/`:

- `seed.registry.ts` lists seeders in dependency order.
- `seed.runner.ts` executes them sequentially, logs each result, and stops at the first failure with a `SeedExecutionError` naming the failed seed and the seeds already applied.
- `seed.cli.ts` connects to MongoDB, runs the registry, and disconnects.

```bash
npm run seed --workspace @atrium/backend
```

Seeders must be **idempotent**: use upserts or deterministic keys, never blind inserts that fail or duplicate on a second run.

The registry is intentionally empty in Phase 2. Role and permission seed data is introduced in Phase 3 together with the models it writes to. The CLI currently verifies MongoDB connectivity and reports that no seeders are registered; it does not pretend to seed data that does not exist.

---

## 7. Testing strategy

Default test suites do **not** require MongoDB or Redis:

- Pure query schemas, serialization transforms, soft-delete helpers, timeout/retry utilities, and the seed runner are unit-tested.
- Supertest integration tests inject a readiness function to prove the `200`/`503` contract without infrastructure.
- `checkMongo()` and `checkRedis()` are tested in the disconnected state.

Real-dependency verification is a manual or CI-with-services step:

1. Start Compose: `docker compose up -d`.
2. Copy `backend/.env.example` to `backend/.env` and align ports/credentials.
3. Start the API: `npm run dev:backend`.
4. Check `GET /health/ready` and `GET /api-docs/openapi.json`.

Do not add arbitrary sleeps or shared mutable state to tests. When a real database is required in later phases, use a dedicated test database and deterministic cleanup.

---

## 8. Operational notes and future work

- Compose binds MongoDB and Redis to `127.0.0.1` only. Never expose them publicly.
- Production requires TLS-capable MongoDB/Redis endpoints where the provider supports them, least-privilege credentials, and secret injection.
- Distributed rate limiting and Redis-backed session revocation arrive with authentication in Phase 3.
- Backup, restore, index migration, and cache-eviction procedures are documented in Phases 14–15.
- Readiness reports dependency status intentionally; protect the infrastructure route at the edge if that information is sensitive in a given deployment.
