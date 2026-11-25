# Atrium LMS — production deployment runbook

| Field   | Value                                                         |
| ------- | ------------------------------------------------------------- |
| Status  | Phase 14 — deployment topology defined                        |
| Updated | 25 November 2026                                              |
| Scope   | Compose stack, application containers, verification, rollback |

This runbook assumes a clean Linux host with Docker Engine, the Compose plugin, and Git installed. It describes the production topology; the local development Compose file remains for developer use only.

---

## 1. Topology

```text
Internet ──> proxy (Caddy, :80)
              ├── /api/* and /health* ──> api (:5000) ──> mongodb (:27017)
              │                                   └──> redis (:6379)
              └── everything else ───────> web (:8080, nginx static SPA)
```

- `api` runs the built Express application as a non-root user. Workers run in-process behind `JOBS_WORKER_ENABLED`.
- `web` serves the built SPA with SPA fallback and immutable asset caching as a non-root nginx user.
- MongoDB and Redis use named volumes and credentials from the environment. Redis uses AOF persistence for operational job state.
- Caddy is the TLS termination point in a real deployment; point DNS at the host and configure HTTPS in front of or on the proxy before public traffic.

---

## 2. Clean-machine deployment

1. Clone the repository and check out the release tag.
2. Copy the example environment and fill every placeholder:

   ```bash
   cp deploy/.env.example .env
   ```

   Generate distinct secrets for `AUTH_JWT_SECRET`, `AUTH_METADATA_SECRET`, `MONGO_ROOT_PASSWORD`, and `REDIS_PASSWORD`. `APP_WEB_URL` and `CORS_ORIGINS` must be the same https origin.

3. Validate configuration before building:

   ```bash
   docker compose -f docker-compose.prod.yml config --quiet
   ```

4. Build and start the stack:

   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

5. Apply seeds and verify indexes:

   ```bash
   docker compose -f docker-compose.prod.yml exec api node dist/seeds/seed.cli.js
   docker compose -f docker-compose.prod.yml exec api node dist/seeds/indexes.cli.js
   ```

   Seeds are idempotent. The index CLI calls `createIndexes()` for every declared collection and does not drop existing indexes.

6. Verify health:

   ```bash
   curl -fsS http://localhost/health
   curl -fsS http://localhost/health/ready
   curl -fsS http://localhost/api/v1
   ```

   `/health` is liveness-only; `/health/ready` reports MongoDB and Redis state and should return `{"status":"ready"}`.

7. Confirm the SPA loads at the public origin and that Swagger UI is disabled unless `ENABLE_API_DOCS=true` was set deliberately.

---

## 3. Container checks

| Check              | Command                                        | Expected                        |
| ------------------ | ---------------------------------------------- | ------------------------------- |
| containers healthy | `docker compose -f docker-compose.prod.yml ps` | all services `Up (healthy)`     |
| non-root API       | `docker compose ... exec api id -u`            | non-zero UID (`atrium`)         |
| non-root web       | `docker compose ... exec web id -u`            | non-zero UID (`nginx`)          |
| readiness          | `curl -fsS localhost/health/ready`             | `ready`                         |
| job worker         | API logs on startup                            | `Background job worker started` |

Application logs are JSON on stdout. Use `docker compose ... logs -f api` or a host log shipper. Request IDs from the `x-request-id` response header correlate logs, errors, and client reports.

---

## 4. Verification and tests

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run build
docker compose -f docker-compose.prod.yml config --quiet
npm run test:e2e
```

`npm run test:e2e` runs the mocked UI journeys against the built frontend preview server. The Compose-stack smoke tests are skipped by default; run them against a live stack with:

```bash
E2E_STACK=1 E2E_BASE_URL=https://atrium.example.com npm run test:e2e
```

Playwright artifacts and coverage reports are uploaded by CI.

---

## 5. Backup and restore

- MongoDB: `docker compose ... exec mongodb mongodump --archive --uri "$MONGODB_URI" > backup.archive`. Store backups off-host and encrypted.
- Redis: AOF is enabled on the named volume. Back up the volume only while Redis is stopped or with a filesystem-consistent snapshot.
- Restore: stop `api`, restore MongoDB with `mongorestore --archive`, restore the Redis volume, then start the stack and verify readiness.
- Re-run seeds and index verification after a restore to an empty database.

Backups and restore drills are not automated yet; there is no production data in the repository.

---

## 6. Rollback

1. Record the current image tags and git SHA.
2. Stop accepting traffic at the proxy or scale `api` to zero if needed.
3. Check out the previous release tag and rebuild:

   ```bash
   git checkout <previous-tag>
   docker compose -f docker-compose.prod.yml up -d --build
   ```

4. Re-run seeds and index verification only if the previous release introduced new collections or permissions. Never roll back a schema by dropping collections.
5. Verify `/health/ready`, the API root, and a representative authenticated route before restoring traffic.
6. Document the cause, the rollback point, and follow-up actions.

Database migrations are additive-only in this phase. A future destructive migration requires an explicit forward/backward procedure before release.

---

## 7. Known limitations

- The production stack has not been built or started in the development environment because the Docker daemon was unavailable; the Compose configuration was validated with `docker compose config`.
- The full Compose-stack E2E journey is skipped unless `E2E_STACK=1` is set against a running stack.
- HTTPS is the responsibility of the host or proxy configuration; the bundled Caddyfile listens on plain HTTP for local verification.
- Rate limiting is per-process and the job worker runs inside `api`; horizontal scaling requires a shared rate-limit store and a dedicated worker process in a later phase.
- No automated backup, restore drill, or log shipping is configured by this repository.
